/**
 * Modèle d'une livraison fournisseur telle qu'annoncée par l'avis d'expédition.
 * La réception se fait par livraison (un camion) et non par commande :
 * une livraison peut regrouper plusieurs commandes, chaque colis appartient à l'une d'elles.
 */

/** Code article EAN-13. */
export type Ean = string
/** Code colis SSCC (18 chiffres). */
export type Sscc = string

export interface OrderLine {
  readonly ean: Ean
  readonly label: string
  readonly expectedQuantity: number
}

export interface PurchaseOrder {
  readonly number: string
  readonly supplier: string
  readonly lines: readonly OrderLine[]
}

export interface ParcelContent {
  readonly ean: Ean
  readonly quantity: number
}

export interface Parcel {
  /** Numéro d'ordre dans la livraison (1, 2, 3…), plus parlant qu'un SSCC pour l'opérateur. */
  readonly number: number
  readonly sscc: Sscc
  readonly orderNumber: string
  readonly contents: readonly ParcelContent[]
}

export interface Delivery {
  readonly id: string
  readonly deliveryNoteCode: string
  readonly carrier: string
  readonly dock: string
  readonly orders: readonly PurchaseOrder[]
  readonly parcels: readonly Parcel[]
}

/** Ligne de commande enrichie de sa commande d'origine. */
export interface ExpectedLine extends OrderLine {
  readonly orderNumber: string
  readonly supplier: string
}

/**
 * Aplatit les commandes de la livraison en lignes attendues.
 * Hypothèse du prototype : une référence n'apparaît que dans une seule commande par livraison.
 * @param delivery livraison annoncée
 * @returns les lignes attendues, dans l'ordre des commandes
 */
export function expectedLines(delivery: Delivery): ExpectedLine[] {
  return delivery.orders.flatMap(order =>
    order.lines.map(line => ({
      ...line,
      orderNumber: order.number,
      supplier: order.supplier
    }))
  )
}
