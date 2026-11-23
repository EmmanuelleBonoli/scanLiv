import { describe, expect, it } from 'vitest'
import {
  declareMissingParcel,
  isArrivalComplete,
  reportDamagedParcel,
  scanParcel,
  startArrival,
  summarizeArrival
} from '#domain/arrival'
import { DomainError } from '#domain/errors'
import { createOuestExpressDelivery, SSCC } from '../../fixtures/ouest-express-delivery'

describe('startArrival', () => {
  it('doit_mettre_tous_les_colis_annonces_a_scanner', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const checks = startArrival(delivery)

    // Assert
    expect(checks).toHaveLength(6)
    expect(checks.every(c => c.status === 'pending')).toBe(true)
  })
})

describe('scanParcel', () => {
  it('doit_marquer_le_colis_recu_quand_son_sscc_est_scanne', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const checks = startArrival(delivery)

    // Act
    const { checks: after, result } = scanParcel(delivery, checks, SSCC.parcel3)

    // Assert
    expect(result).toEqual({ type: 'accepted', number: 3 })
    expect(after.find(c => c.number === 3)?.status).toBe('received')
  })

  it('doit_accepter_le_sscc_prefixe_par_l_identifiant_00', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const { result } = scanParcel(delivery, startArrival(delivery), `00${SSCC.parcel1}`)

    // Assert
    expect(result).toEqual({ type: 'accepted', number: 1 })
  })

  it('doit_signaler_un_doublon_sans_modifier_le_controle', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const { checks } = scanParcel(delivery, startArrival(delivery), SSCC.parcel1)

    // Act
    const { checks: after, result } = scanParcel(delivery, checks, SSCC.parcel1)

    // Assert
    expect(result).toEqual({ type: 'already_scanned', number: 1 })
    expect(after).toBe(checks)
  })

  it('doit_signaler_un_colis_inconnu_absent_de_l_avis_d_expedition', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const { result } = scanParcel(delivery, startArrival(delivery), SSCC.otherDelivery)

    // Assert
    expect(result).toEqual({ type: 'unknown' })
  })

  it('doit_signaler_un_code_illisible_si_ce_n_est_pas_un_sscc_valide', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const { result } = scanParcel(delivery, startArrival(delivery), '123')

    // Assert
    expect(result).toEqual({ type: 'unreadable' })
  })

  it('doit_recevoir_un_colis_declare_manquant_qui_arrive_finalement', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const checks = declareMissingParcel(startArrival(delivery), 5)

    // Act
    const { checks: after, result } = scanParcel(delivery, checks, SSCC.parcel5)

    // Assert
    expect(result).toEqual({ type: 'accepted', number: 5 })
    expect(after.find(c => c.number === 5)?.status).toBe('received')
  })

  it('ne_doit_pas_muter_le_controle_d_origine', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const checks = startArrival(delivery)

    // Act
    scanParcel(delivery, checks, SSCC.parcel1)

    // Assert
    expect(checks[0]?.status).toBe('pending')
  })
})

describe('reportDamagedParcel', () => {
  it('doit_rattacher_la_reserve_au_colis_recu', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const { checks } = scanParcel(delivery, startArrival(delivery), SSCC.parcel4)

    // Act
    const after = reportDamagedParcel(checks, 4, { reason: 'Carton écrasé sur un angle', photo: 'parcel-4.jpg' })

    // Assert
    expect(after.find(c => c.number === 4)).toEqual({
      number: 4,
      status: 'damaged',
      damage: { reason: 'Carton écrasé sur un angle', photo: 'parcel-4.jpg' }
    })
  })

  it('doit_refuser_une_reserve_si_le_colis_n_est_pas_scanne', () => {
    // Arrange — on ne peut constater l'état que d'un colis physiquement présent
    const checks = startArrival(createOuestExpressDelivery())

    // Act + Assert
    expect(() => reportDamagedParcel(checks, 4, { reason: 'Carton écrasé' }))
      .toThrow(expect.objectContaining({ code: 'PARCEL_NOT_ON_SITE' }))
  })

  it('doit_refuser_une_reserve_sans_motif', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const { checks } = scanParcel(delivery, startArrival(delivery), SSCC.parcel4)

    // Act + Assert
    expect(() => reportDamagedParcel(checks, 4, { reason: '   ' }))
      .toThrow(expect.objectContaining({ code: 'DAMAGE_REASON_REQUIRED' }))
  })
})

describe('declareMissingParcel', () => {
  it('doit_marquer_manquant_un_colis_non_scanne', () => {
    // Arrange
    const checks = startArrival(createOuestExpressDelivery())

    // Act
    const after = declareMissingParcel(checks, 5)

    // Assert
    expect(after.find(c => c.number === 5)?.status).toBe('missing')
  })

  it('doit_refuser_de_declarer_manquant_un_colis_deja_recu', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const { checks } = scanParcel(delivery, startArrival(delivery), SSCC.parcel5)

    // Act + Assert
    expect(() => declareMissingParcel(checks, 5))
      .toThrow(expect.objectContaining({ code: 'PARCEL_ALREADY_SCANNED' }))
  })

  it('doit_refuser_un_numero_de_colis_inexistant', () => {
    // Arrange
    const checks = startArrival(createOuestExpressDelivery())

    // Act + Assert
    expect(() => declareMissingParcel(checks, 42)).toThrow(DomainError)
  })
})

describe('isArrivalComplete et summarizeArrival', () => {
  it('doit_etre_terminee_quand_plus_aucun_colis_n_est_a_scanner', () => {
    // Arrange — scénario des maquettes : 5 reçus dont 1 abîmé, colis 5 manquant
    const delivery = createOuestExpressDelivery()
    let checks = startArrival(delivery)
    for (const sscc of [SSCC.parcel1, SSCC.parcel2, SSCC.parcel3, SSCC.parcel4, SSCC.parcel6]) {
      checks = [...scanParcel(delivery, checks, sscc).checks]
    }
    checks = reportDamagedParcel(checks, 4, { reason: 'Carton écrasé' })
    const completeBeforeDeclaration = isArrivalComplete(checks)

    // Act
    checks = declareMissingParcel(checks, 5)

    // Assert
    expect(completeBeforeDeclaration).toBe(false)
    expect(isArrivalComplete(checks)).toBe(true)
    expect(summarizeArrival(checks)).toEqual({ total: 6, received: 5, damaged: 1, missing: 1, pending: 0 })
  })
})
