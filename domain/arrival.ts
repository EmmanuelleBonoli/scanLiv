/**
 * Étape « Arrivée du transporteur » : contrôle colis par colis, au scan du SSCC,
 * avant de signer le bon du transporteur. C'est le seul moment où le magasin
 * qualifie un problème (réserve sur colis abîmé ou manquant).
 */
import type { Delivery } from './delivery'
import { DomainError } from './errors'
import { normalizeSscc } from './gs1'

export type ParcelStatus = 'pending' | 'received' | 'damaged' | 'missing'

/** Réserve émise auprès du transporteur pour un colis abîmé. */
export interface DamageReport {
  readonly reason: string
  /** Référence de la photo jointe (nom de fichier, URL…). */
  readonly photo?: string
}

export interface ParcelCheck {
  readonly number: number
  readonly status: ParcelStatus
  readonly damage?: DamageReport
}

export type ParcelScanResult
  = | { readonly type: 'accepted', readonly number: number }
    | { readonly type: 'already_scanned', readonly number: number }
    | { readonly type: 'unknown' }
    | { readonly type: 'unreadable' }

export interface ArrivalSummary {
  readonly total: number
  readonly received: number
  readonly damaged: number
  readonly missing: number
  readonly pending: number
}

/**
 * @param delivery livraison annoncée
 * @returns un contrôle où chaque colis de l'avis d'expédition reste à scanner
 */
export function startArrival(delivery: Delivery): ParcelCheck[] {
  return delivery.parcels.map(parcel => ({ number: parcel.number, status: 'pending' }))
}

/**
 * Traite la lecture d'une étiquette colis. Fonction pure : le contrôle d'origine n'est jamais modifié.
 * Un colis déclaré manquant puis scanné est considéré comme arrivé en retard, donc reçu.
 * @param delivery livraison annoncée
 * @param checks état courant des colis
 * @param rawCode lecture du scanner
 * @returns le nouvel état et le résultat (qui pilote le bip côté interface)
 */
export function scanParcel(
  delivery: Delivery,
  checks: readonly ParcelCheck[],
  rawCode: string
): { checks: readonly ParcelCheck[], result: ParcelScanResult } {
  const sscc = normalizeSscc(rawCode)
  if (sscc === null) {
    return { checks, result: { type: 'unreadable' } }
  }
  const parcel = delivery.parcels.find(p => p.sscc === sscc)
  if (!parcel) {
    return { checks, result: { type: 'unknown' } }
  }
  if (isOnSite(findCheck(checks, parcel.number))) {
    return { checks, result: { type: 'already_scanned', number: parcel.number } }
  }
  return {
    checks: replaceCheck(checks, { number: parcel.number, status: 'received' }),
    result: { type: 'accepted', number: parcel.number }
  }
}

/**
 * Émet une réserve sur un colis abîmé. Seul un colis physiquement présent peut l'être.
 * @throws DomainError si le colis n'a pas été reçu ou si le motif est vide
 */
export function reportDamagedParcel(checks: readonly ParcelCheck[], number: number, damage: DamageReport): ParcelCheck[] {
  if (!isOnSite(findCheck(checks, number))) {
    throw new DomainError('PARCEL_NOT_ON_SITE', `Parcel ${number} must be scanned before reporting damage.`)
  }
  const reason = damage.reason.trim()
  if (reason === '') {
    throw new DomainError('DAMAGE_REASON_REQUIRED', 'A damage reason is required.')
  }
  return replaceCheck(checks, { number, status: 'damaged', damage: { ...damage, reason } })
}

/**
 * Déclare manquant un colis annoncé mais absent du camion.
 * @throws DomainError si le colis a déjà été scanné
 */
export function declareMissingParcel(checks: readonly ParcelCheck[], number: number): ParcelCheck[] {
  if (isOnSite(findCheck(checks, number))) {
    throw new DomainError('PARCEL_ALREADY_SCANNED', `Parcel ${number} has been scanned and cannot be declared missing.`)
  }
  return replaceCheck(checks, { number, status: 'missing' })
}

/**
 * @returns true quand chaque colis est soit scanné, soit déclaré manquant :
 * le bon du transporteur peut alors être signé.
 */
export function isArrivalComplete(checks: readonly ParcelCheck[]): boolean {
  return checks.every(c => c.status !== 'pending')
}

/**
 * @returns les compteurs affichés à l'écran (« 5 / 6 dont 1 abîmé »)
 */
export function summarizeArrival(checks: readonly ParcelCheck[]): ArrivalSummary {
  const countBy = (status: ParcelStatus): number => checks.filter(c => c.status === status).length
  const damaged = countBy('damaged')
  return {
    total: checks.length,
    received: countBy('received') + damaged,
    damaged,
    missing: countBy('missing'),
    pending: countBy('pending')
  }
}

/** Un colis abîmé est tout de même arrivé : il est physiquement sur place. */
function isOnSite(check: ParcelCheck): boolean {
  return check.status === 'received' || check.status === 'damaged'
}

function findCheck(checks: readonly ParcelCheck[], number: number): ParcelCheck {
  const check = checks.find(c => c.number === number)
  if (!check) {
    throw new DomainError('PARCEL_NOT_IN_DELIVERY', `Parcel ${number} is not part of this delivery.`)
  }
  return check
}

function replaceCheck(checks: readonly ParcelCheck[], updated: ParcelCheck): ParcelCheck[] {
  return checks.map(c => (c.number === updated.number ? updated : c))
}
