import { describe, expect, it } from 'vitest'
import { openDelivery } from '#application/open-delivery'
import { createOuestExpressDelivery, SSCC } from '../../fixtures/ouest-express-delivery'
import { InMemoryDeliveryRepository } from './in-memory-delivery-repository'

describe('openDelivery', () => {
  it('doit_ouvrir_la_livraison_au_scan_du_bon_de_livraison', async () => {
    // Arrange
    const repository = new InMemoryDeliveryRepository([createOuestExpressDelivery()])

    // Act
    const result = await openDelivery(repository, 'BL88412070')

    // Assert
    expect(result.type === 'found' && result.delivery.id).toBe('LIV-2311-0087')
  })

  it('doit_retrouver_la_livraison_a_partir_de_n_importe_quel_colis', async () => {
    // Arrange — le scanner GS1-128 préfixe le SSCC par « 00 »
    const repository = new InMemoryDeliveryRepository([createOuestExpressDelivery()])

    // Act
    const result = await openDelivery(repository, `00${SSCC.parcel4}`)

    // Assert
    expect(result.type === 'found' && result.delivery.id).toBe('LIV-2311-0087')
  })

  it('doit_retourner_introuvable_si_le_code_est_inconnu', async () => {
    // Arrange
    const repository = new InMemoryDeliveryRepository([createOuestExpressDelivery()])

    // Act
    const result = await openDelivery(repository, SSCC.otherDelivery)

    // Assert
    expect(result).toEqual({ type: 'not_found' })
  })

  it('doit_retourner_illisible_si_la_lecture_est_vide', async () => {
    // Arrange
    const repository = new InMemoryDeliveryRepository([])

    // Act
    const result = await openDelivery(repository, '   ')

    // Assert
    expect(result).toEqual({ type: 'unreadable' })
  })
})
