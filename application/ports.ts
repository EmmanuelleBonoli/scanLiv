/**
 * Ports (interfaces) dont l'application a besoin pour accéder aux données.
 * Les implémentations vivent dans infrastructure/ (API REST, IndexedDB…) :
 * les cas d'usage ne savent pas d'où viennent les livraisons.
 */
import type { ParcelCheck } from '#domain/arrival'
import type { ItemCount } from '#domain/counting'
import type { Delivery } from '#domain/delivery'
import type { ReceiptReport } from '#domain/discrepancies'

export type DeliveryStatus = 'expected' | 'in_progress' | 'completed'

/** Vue résumée d'une livraison pour la liste du jour (modèle de lecture). */
export interface DeliverySummary {
  readonly id: string
  readonly carrier: string
  readonly dock: string
  readonly parcelCount: number
  readonly orderCount: number
  readonly status: DeliveryStatus
  /** Heure d'arrivée prévue, format HH:mm. */
  readonly expectedAt?: string
}

/** Ce qui est transmis au back-office à la validation. */
export interface ValidatedReceipt {
  readonly deliveryId: string
  /** Date ISO 8601. */
  readonly validatedAt: string
  readonly parcelChecks: readonly ParcelCheck[]
  readonly count: ItemCount
  readonly report: ReceiptReport
}

export interface DeliveryRepository {
  listToday(): Promise<DeliverySummary[]>
  findById(id: string): Promise<Delivery | null>
  findByDeliveryNoteCode(code: string): Promise<Delivery | null>
  findBySscc(sscc: string): Promise<Delivery | null>
  saveReceipt(receipt: ValidatedReceipt): Promise<void>
}

/** Horloge injectable : rend les dates déterministes dans les tests. */
export type Clock = () => Date
