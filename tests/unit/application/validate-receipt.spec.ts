import { describe, expect, it } from 'vitest'
import { validateReceipt } from '#application/validate-receipt'
import { declareMissingParcel, type ParcelCheck, scanParcel, startArrival } from '#domain/arrival'
import type { Delivery } from '#domain/delivery'
import { createOuestExpressDelivery, EAN, SSCC } from '../../fixtures/ouest-express-delivery'
import { InMemoryDeliveryRepository } from './in-memory-delivery-repository'

const NOW = new Date('2026-11-23T10:42:00Z')

/** Arrivée du scénario des maquettes : 5 colis scannés, colis 5 déclaré manquant. */
function completedArrival(): { delivery: Delivery, parcelChecks: ParcelCheck[] } {
  const delivery = createOuestExpressDelivery()
  let checks: readonly ParcelCheck[] = startArrival(delivery)
  for (const sscc of [SSCC.parcel1, SSCC.parcel2, SSCC.parcel3, SSCC.parcel4, SSCC.parcel6]) {
    checks = scanParcel(delivery, checks, sscc).checks
  }
  return { delivery, parcelChecks: declareMissingParcel(checks, 5) }
}

describe('validateReceipt', () => {
  it('doit_enregistrer_la_reception_avec_son_rapport_d_ecarts', async () => {
    // Arrange
    const { delivery, parcelChecks } = completedArrival()
    const repository = new InMemoryDeliveryRepository([delivery])
    const count = { [EAN.linenCushion]: 12, [EAN.sandVase]: 7 }

    // Act
    const report = await validateReceipt(repository, { delivery, parcelChecks, count }, () => NOW)

    // Assert
    expect(report.overallStatus).toBe('with_discrepancies')
    expect(repository.savedReceipts).toHaveLength(1)
    expect(repository.savedReceipts[0]).toMatchObject({
      deliveryId: 'LIV-2311-0087',
      validatedAt: NOW.toISOString(),
      count,
      report
    })
  })

  it('doit_refuser_la_validation_si_des_colis_restent_a_scanner', async () => {
    // Arrange — on ne peut pas clôturer sans avoir statué sur chaque colis
    const delivery = createOuestExpressDelivery()
    const repository = new InMemoryDeliveryRepository([delivery])

    // Act
    const validation = validateReceipt(repository, { delivery, parcelChecks: startArrival(delivery), count: {} }, () => NOW)

    // Assert
    await expect(validation).rejects.toMatchObject({ code: 'ARRIVAL_INCOMPLETE' })
    expect(repository.savedReceipts).toHaveLength(0)
  })

  it('doit_utiliser_la_date_courante_si_aucune_horloge_n_est_fournie', async () => {
    // Arrange
    const { delivery, parcelChecks } = completedArrival()
    const repository = new InMemoryDeliveryRepository([delivery])
    const before = Date.now()

    // Act
    await validateReceipt(repository, { delivery, parcelChecks, count: {} })

    // Assert
    expect(Date.parse(repository.savedReceipts[0]!.validatedAt)).toBeGreaterThanOrEqual(before)
  })
})
