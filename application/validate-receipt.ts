import { isArrivalComplete, type ParcelCheck } from '#domain/arrival'
import type { ItemCount } from '#domain/counting'
import type { Delivery } from '#domain/delivery'
import { analyzeReceipt, type ReceiptReport } from '#domain/discrepancies'
import { DomainError } from '#domain/errors'
import type { Clock, DeliveryRepository } from './ports'

export interface ReceiptInProgress {
  readonly delivery: Delivery
  readonly parcelChecks: readonly ParcelCheck[]
  readonly count: ItemCount
}

/**
 * Clôture la réception : calcule les écarts et les transmet au back-office.
 * @param repository destination de la réception validée
 * @param receipt état de la réception côté magasin
 * @param clock source de la date de validation
 * @returns le rapport d'écarts enregistré
 * @throws DomainError si des colis n'ont été ni scannés ni déclarés manquants
 */
export async function validateReceipt(
  repository: DeliveryRepository,
  receipt: ReceiptInProgress,
  clock: Clock = () => new Date()
): Promise<ReceiptReport> {
  if (!isArrivalComplete(receipt.parcelChecks)) {
    throw new DomainError('ARRIVAL_INCOMPLETE', 'Every parcel must be scanned or declared missing before validation.')
  }
  const report = analyzeReceipt(receipt.delivery, receipt.count, receipt.parcelChecks)
  await repository.saveReceipt({
    deliveryId: receipt.delivery.id,
    validatedAt: clock().toISOString(),
    parcelChecks: receipt.parcelChecks,
    count: receipt.count,
    report
  })
  return report
}
