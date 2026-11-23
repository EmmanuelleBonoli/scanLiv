/**
 * Étape « Comptage à l'aveugle » : l'opérateur scanne les articles sans voir
 * les quantités attendues, pour compter réellement au lieu de confirmer un chiffre.
 * Les écarts ne sont calculés qu'au récapitulatif (voir discrepancies.ts).
 */
import { type Delivery, type Ean, expectedLines } from './delivery'
import { isValidEan } from './gs1'

/** Quantité comptée par EAN. */
export type ItemCount = Readonly<Record<Ean, number>>

export const EMPTY_COUNT: ItemCount = Object.freeze({})

export type ItemScanResult
  = | { readonly type: 'accepted', readonly ean: Ean, readonly quantity: number }
    | { readonly type: 'unexpected', readonly ean: Ean, readonly quantity: number }
    | { readonly type: 'unreadable' }

/**
 * Ajoute une unité de l'article scanné.
 * Un article absent des commandes est compté quand même (« inattendu ») :
 * le magasin constate ce qu'il reçoit, c'est le back-office qui tranche.
 * @param delivery livraison en cours
 * @param count comptage courant (non modifié)
 * @param rawCode lecture du scanner
 * @returns le nouveau comptage et le résultat (qui pilote le bip côté interface)
 */
export function scanItem(
  delivery: Delivery,
  count: ItemCount,
  rawCode: string
): { count: ItemCount, result: ItemScanResult } {
  const ean = rawCode.trim()
  if (!isValidEan(ean)) {
    return { count, result: { type: 'unreadable' } }
  }
  const quantity = (count[ean] ?? 0) + 1
  const isExpected = expectedLines(delivery).some(l => l.ean === ean)
  return {
    count: { ...count, [ean]: quantity },
    result: { type: isExpected ? 'accepted' : 'unexpected', ean, quantity }
  }
}

/**
 * Correction manuelle (boutons + / −, ou saisie quand l'étiquette est illisible).
 * La quantité ne descend jamais sous zéro.
 * @param delta variation à appliquer (positive ou négative)
 * @returns le nouveau comptage
 */
export function adjustQuantity(count: ItemCount, ean: Ean, delta: number): ItemCount {
  const quantity = Math.max(0, (count[ean] ?? 0) + delta)
  return { ...count, [ean]: quantity }
}

/**
 * @returns le nombre de références attendues déjà comptées (au moins une unité) sur le total
 */
export function countingProgress(delivery: Delivery, count: ItemCount): { counted: number, total: number } {
  const lines = expectedLines(delivery)
  return {
    counted: lines.filter(l => (count[l.ean] ?? 0) > 0).length,
    total: lines.length
  }
}
