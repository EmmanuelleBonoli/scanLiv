import { describe, expect, it } from 'vitest'
import { declareMissingParcel, startArrival } from '#domain/arrival'
import { analyzeReceipt } from '#domain/discrepancies'
import { createOuestExpressDelivery, EAN } from '../../fixtures/ouest-express-delivery'

/** Comptage du scénario des maquettes : 2 conformes, 3 écarts. */
const MOCKUP_COUNT = {
  [EAN.linenCushion]: 12,
  [EAN.sandVase]: 7,
  [EAN.wafflePlaid]: 8,
  [EAN.figCandle]: 24
}

describe('analyzeReceipt', () => {
  it('doit_classer_chaque_reference_selon_attendu_et_compte', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const report = analyzeReceipt(delivery, MOCKUP_COUNT)

    // Assert
    const statusByEan = Object.fromEntries(report.lines.map(l => [l.ean, l.status]))
    expect(statusByEan).toEqual({
      [EAN.linenCushion]: 'matching',
      [EAN.sandVase]: 'over',
      [EAN.wafflePlaid]: 'short',
      [EAN.figCandle]: 'matching',
      [EAN.stonewarePlate]: 'not_received'
    })
  })

  it('doit_calculer_l_ecart_signe_et_le_rattacher_a_sa_commande', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const report = analyzeReceipt(delivery, MOCKUP_COUNT)

    // Assert
    expect(report.lines.find(l => l.ean === EAN.wafflePlaid)).toMatchObject({
      orderNumber: 'CMD-2611-0418',
      supplier: 'Atelier Lin & Coton',
      expected: 10,
      counted: 8,
      difference: -2
    })
  })

  it('doit_resumer_le_nombre_de_conformes_et_d_ecarts', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const report = analyzeReceipt(delivery, MOCKUP_COUNT)

    // Assert
    expect(report.matchingCount).toBe(2)
    expect(report.discrepancyCount).toBe(3)
    expect(report.overallStatus).toBe('with_discrepancies')
  })

  it('doit_lister_les_ecarts_avant_les_conformes', () => {
    // Arrange — à l'écran, ce qui demande de l'attention passe en premier
    const delivery = createOuestExpressDelivery()

    // Act
    const report = analyzeReceipt(delivery, MOCKUP_COUNT)

    // Assert
    expect(report.lines.slice(0, 3).every(l => l.status !== 'matching')).toBe(true)
  })

  it('doit_signaler_un_article_inattendu_sans_commande_rattachee', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const report = analyzeReceipt(delivery, { ...MOCKUP_COUNT, [EAN.unknown]: 2 })

    // Assert
    expect(report.lines.find(l => l.ean === EAN.unknown)).toMatchObject({
      status: 'unexpected',
      label: null,
      orderNumber: null,
      expected: 0,
      counted: 2,
      difference: 2
    })
  })

  it('doit_indiquer_le_colis_manquant_qui_explique_un_non_recu', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const checks = declareMissingParcel(startArrival(delivery), 5)

    // Act
    const report = analyzeReceipt(delivery, MOCKUP_COUNT, checks)

    // Assert
    expect(report.lines.find(l => l.ean === EAN.stonewarePlate)?.missingParcels).toEqual([5])
  })

  it('doit_etre_conforme_si_tout_correspond', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const perfectCount = Object.fromEntries(
      delivery.orders.flatMap(o => o.lines.map(l => [l.ean, l.expectedQuantity]))
    )

    // Act
    const report = analyzeReceipt(delivery, perfectCount)

    // Assert
    expect(report.overallStatus).toBe('compliant')
    expect(report.discrepancyCount).toBe(0)
  })
})
