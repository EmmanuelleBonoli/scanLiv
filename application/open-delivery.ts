import type { Delivery } from '#domain/delivery'
import { normalizeSscc } from '#domain/gs1'
import type { DeliveryRepository } from './ports'

export type OpenDeliveryResult
  = | { readonly type: 'found', readonly delivery: Delivery }
    | { readonly type: 'not_found' }
    | { readonly type: 'unreadable' }

/**
 * Ouvre une livraison depuis l'accueil, au scan du bon de livraison
 * ou de n'importe quel colis : le SSCC permet de retrouver la livraison
 * via l'avis d'expédition, sans chercher dans la liste.
 * @param repository source des livraisons
 * @param rawCode lecture du scanner
 * @returns la livraison trouvée, ou la raison de l'échec
 */
export async function openDelivery(repository: DeliveryRepository, rawCode: string): Promise<OpenDeliveryResult> {
  const code = rawCode.trim()
  if (code === '') {
    return { type: 'unreadable' }
  }
  const sscc = normalizeSscc(code)
  const delivery = sscc
    ? await repository.findBySscc(sscc)
    : await repository.findByDeliveryNoteCode(code)
  return delivery ? { type: 'found', delivery } : { type: 'not_found' }
}
