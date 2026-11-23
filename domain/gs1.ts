/**
 * Règles des codes GS1 utilisés en logistique :
 * - EAN-13 sur les articles ;
 * - SSCC (18 chiffres) sur les étiquettes colis / palettes GS1-128.
 * Les deux se terminent par une clé de contrôle modulo 10 qui permet
 * de détecter une mauvaise lecture du scanner.
 */

const EAN_LENGTH = 13
const SSCC_LENGTH = 18
/** Identifiant d'application GS1 qui précède un SSCC dans un code GS1-128. */
const SSCC_APPLICATION_IDENTIFIER = '00'

/**
 * Calcule la clé de contrôle GS1 d'une suite de chiffres.
 * En partant de la droite, les chiffres sont pondérés alternativement par 3 et 1.
 * @param digits chiffres du code, sans la clé
 * @returns la clé (0 à 9)
 */
export function computeCheckDigit(digits: string): number {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    const digit = Number(digits[digits.length - 1 - i])
    sum += i % 2 === 0 ? digit * 3 : digit
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Vérifie la longueur, le format numérique et la clé de contrôle d'un code GS1.
 * @param code code complet, clé incluse
 * @param length longueur attendue
 * @returns true si le code est bien formé
 */
function isValidGs1Code(code: string, length: number): boolean {
  if (code.length !== length || !/^\d+$/.test(code)) {
    return false
  }
  return computeCheckDigit(code.slice(0, -1)) === Number(code.at(-1))
}

/**
 * @param code code lu par le scanner
 * @returns true si c'est un EAN-13 valide
 */
export function isValidEan(code: string): boolean {
  return isValidGs1Code(code, EAN_LENGTH)
}

/**
 * Ramène une lecture brute d'étiquette colis à un SSCC de 18 chiffres.
 * Selon le paramétrage, le scanner transmet le SSCC seul, préfixé de l'IA « 00 »,
 * ou sous sa forme lisible « (00) 1234 … » s'il est saisi à la main.
 * @param raw texte reçu du scanner ou du clavier
 * @returns le SSCC normalisé, ou null si la lecture n'est pas un SSCC valide
 */
export function normalizeSscc(raw: string): string | null {
  let code = raw.replace(/[\s()]/g, '')
  if (code.length === SSCC_LENGTH + SSCC_APPLICATION_IDENTIFIER.length && code.startsWith(SSCC_APPLICATION_IDENTIFIER)) {
    code = code.slice(SSCC_APPLICATION_IDENTIFIER.length)
  }
  return isValidGs1Code(code, SSCC_LENGTH) ? code : null
}
