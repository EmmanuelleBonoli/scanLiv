import { describe, expect, it } from 'vitest'
import { adjustQuantity, countingProgress, EMPTY_COUNT, scanItem } from '#domain/counting'
import { createOuestExpressDelivery, EAN } from '../../fixtures/ouest-express-delivery'

describe('scanItem', () => {
  it('doit_ajouter_une_unite_a_chaque_scan_d_un_article_attendu', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()
    const { count } = scanItem(delivery, EMPTY_COUNT, EAN.sandVase)

    // Act
    const { count: after, result } = scanItem(delivery, count, EAN.sandVase)

    // Assert
    expect(result).toEqual({ type: 'accepted', ean: EAN.sandVase, quantity: 2 })
    expect(after[EAN.sandVase]).toBe(2)
  })

  it('doit_compter_un_article_inattendu_au_lieu_de_le_refuser', () => {
    // Arrange — le magasin constate ce qu'il reçoit ; le back-office tranchera
    const delivery = createOuestExpressDelivery()

    // Act
    const { count, result } = scanItem(delivery, EMPTY_COUNT, EAN.unknown)

    // Assert
    expect(result).toEqual({ type: 'unexpected', ean: EAN.unknown, quantity: 1 })
    expect(count[EAN.unknown]).toBe(1)
  })

  it('doit_ignorer_un_code_illisible_sans_modifier_le_comptage', () => {
    // Arrange — on fausse la clé de contrôle, comme lors d'une mauvaise lecture
    const delivery = createOuestExpressDelivery()
    const wrongCheckDigit = (Number(EAN.linenCushion.at(-1)) + 1) % 10
    const misreadCode = `${EAN.linenCushion.slice(0, -1)}${wrongCheckDigit}`

    // Act
    const { count, result } = scanItem(delivery, EMPTY_COUNT, misreadCode)

    // Assert
    expect(result).toEqual({ type: 'unreadable' })
    expect(count).toBe(EMPTY_COUNT)
  })

  it('doit_tolerer_les_espaces_autour_du_code_scanne', () => {
    // Arrange
    const delivery = createOuestExpressDelivery()

    // Act
    const { result } = scanItem(delivery, EMPTY_COUNT, ` ${EAN.linenCushion}\n`)

    // Assert
    expect(result.type).toBe('accepted')
  })
})

describe('adjustQuantity', () => {
  it('doit_corriger_la_quantite_avec_les_boutons_plus_et_moins', () => {
    // Arrange
    const count = { [EAN.wafflePlaid]: 8 }

    // Act
    const after = adjustQuantity(adjustQuantity(count, EAN.wafflePlaid, -1), EAN.wafflePlaid, +3)

    // Assert
    expect(after[EAN.wafflePlaid]).toBe(10)
  })

  it('ne_doit_jamais_descendre_sous_zero', () => {
    // Arrange
    const count = { [EAN.wafflePlaid]: 1 }

    // Act
    const after = adjustQuantity(count, EAN.wafflePlaid, -5)

    // Assert
    expect(after[EAN.wafflePlaid]).toBe(0)
  })

  it('doit_permettre_de_saisir_une_quantite_sans_scan_prealable', () => {
    // Arrange — étiquette arrachée : le magasinier saisit à la main
    // Act
    const after = adjustQuantity(EMPTY_COUNT, EAN.figCandle, 24)

    // Assert
    expect(after[EAN.figCandle]).toBe(24)
  })
})

describe('countingProgress', () => {
  it('doit_compter_les_references_attendues_ayant_au_moins_une_unite', () => {
    // Arrange — maquette : 4 références sur 5, l'assiette n'est pas comptée
    const delivery = createOuestExpressDelivery()
    const count = {
      [EAN.linenCushion]: 12,
      [EAN.sandVase]: 7,
      [EAN.wafflePlaid]: 8,
      [EAN.figCandle]: 24,
      [EAN.stonewarePlate]: 0,
      [EAN.unknown]: 1
    }

    // Act
    const progress = countingProgress(delivery, count)

    // Assert — l'article inattendu ne compte pas dans l'avancement
    expect(progress).toEqual({ counted: 4, total: 5 })
  })
})
