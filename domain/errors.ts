/** Codes stables des règles métier violées : l'interface s'en sert pour afficher un libellé traduit. */
export type DomainErrorCode
  = | 'PARCEL_NOT_IN_DELIVERY'
    | 'PARCEL_NOT_ON_SITE'
    | 'PARCEL_ALREADY_SCANNED'
    | 'DAMAGE_REASON_REQUIRED'
    | 'ARRIVAL_INCOMPLETE'

/**
 * Violation d'une règle métier (action interdite dans l'état courant).
 * Distincte des erreurs techniques (réseau, stockage) pour que l'interface
 * puisse la présenter au magasinier plutôt que comme une panne.
 */
export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}
