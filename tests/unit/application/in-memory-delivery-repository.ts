import type { DeliveryRepository, DeliverySummary, ValidatedReceipt } from '#application/ports'
import type { Delivery } from '#domain/delivery'

/**
 * Adaptateur en mémoire pour les tests : il prouve qu'un cas d'usage
 * fonctionne avec n'importe quelle implémentation du port.
 */
export class InMemoryDeliveryRepository implements DeliveryRepository {
  readonly savedReceipts: ValidatedReceipt[] = []

  constructor(private readonly deliveries: Delivery[]) {}

  async listToday(): Promise<DeliverySummary[]> {
    return this.deliveries.map(d => ({
      id: d.id,
      carrier: d.carrier,
      dock: d.dock,
      parcelCount: d.parcels.length,
      orderCount: d.orders.length,
      status: 'expected'
    }))
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.find(d => d.id === id) ?? null
  }

  async findByDeliveryNoteCode(code: string): Promise<Delivery | null> {
    return this.deliveries.find(d => d.deliveryNoteCode === code) ?? null
  }

  async findBySscc(sscc: string): Promise<Delivery | null> {
    return this.deliveries.find(d => d.parcels.some(p => p.sscc === sscc)) ?? null
  }

  async saveReceipt(receipt: ValidatedReceipt): Promise<void> {
    this.savedReceipts.push(receipt)
  }
}
