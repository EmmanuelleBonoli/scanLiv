import { describe, expect, it } from 'vitest'
import { computeCheckDigit, isValidEan, normalizeSscc } from '#domain/gs1'

describe('computeCheckDigit', () => {
  it('doit_calculer_la_cle_d_un_ean13_connu', () => {
    // Arrange — EAN réel : 4006381333931
    const digits = '400638133393'

    // Act
    const checkDigit = computeCheckDigit(digits)

    // Assert
    expect(checkDigit).toBe(1)
  })

  it('doit_calculer_la_cle_d_un_sscc_connu', () => {
    // Arrange — exemple de la spécification GS1 : 106141411234567897
    const digits = '10614141123456789'

    // Act
    const checkDigit = computeCheckDigit(digits)

    // Assert
    expect(checkDigit).toBe(7)
  })
})

describe('isValidEan', () => {
  it('doit_accepter_un_ean13_avec_une_cle_correcte', () => {
    expect(isValidEan('4006381333931')).toBe(true)
  })

  it('doit_refuser_un_ean13_avec_une_cle_incorrecte', () => {
    // Une mauvaise lecture du scanner change souvent un seul chiffre
    expect(isValidEan('4006381333932')).toBe(false)
  })

  it('doit_refuser_un_code_qui_n_a_pas_13_chiffres', () => {
    expect(isValidEan('40063813339')).toBe(false)
    expect(isValidEan('400638133393A')).toBe(false)
  })
})

describe('normalizeSscc', () => {
  const VALID_SSCC = '106141411234567897'

  it('doit_retourner_le_sscc_tel_quel_s_il_est_valide', () => {
    expect(normalizeSscc(VALID_SSCC)).toBe(VALID_SSCC)
  })

  it('doit_retirer_l_identifiant_00_ajoute_par_le_scanner', () => {
    // Arrange — un scanner GS1-128 transmet souvent « 00 » + SSCC (20 chiffres)
    const raw = `00${VALID_SSCC}`

    // Act
    const sscc = normalizeSscc(raw)

    // Assert
    expect(sscc).toBe(VALID_SSCC)
  })

  it('doit_accepter_la_forme_lisible_avec_parentheses_et_espaces', () => {
    expect(normalizeSscc(' (00) 1061 4141 1234 5678 97 ')).toBe(VALID_SSCC)
  })

  it('doit_retourner_null_si_la_cle_est_fausse', () => {
    expect(normalizeSscc('106141411234567890')).toBeNull()
  })

  it('doit_retourner_null_si_ce_n_est_pas_un_sscc', () => {
    expect(normalizeSscc('BL88412070')).toBeNull()
  })
})
