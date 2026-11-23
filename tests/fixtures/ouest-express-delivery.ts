import type { Delivery } from '#domain/delivery'
import { computeCheckDigit } from '#domain/gs1'

/**
 * Complète un code GS1 avec sa clé de contrôle, pour que les fixtures
 * contiennent des codes réalistes (valides) sans les calculer à la main.
 * @param digits chiffres du code sans la clé
 * @returns le code complet
 */
export function withCheckDigit(digits: string): string {
  return `${digits}${computeCheckDigit(digits)}`
}

export const EAN = {
  linenCushion: withCheckDigit('376012345001'),
  sandVase: withCheckDigit('376012345002'),
  wafflePlaid: withCheckDigit('376012345003'),
  figCandle: withCheckDigit('376012345004'),
  stonewarePlate: withCheckDigit('376012345005'),
  unknown: withCheckDigit('376099999999')
} as const

export const SSCC = {
  parcel1: withCheckDigit('03760123400000001'),
  parcel2: withCheckDigit('03760123400000002'),
  parcel3: withCheckDigit('03760123400000003'),
  parcel4: withCheckDigit('03760123400000004'),
  parcel5: withCheckDigit('03760123400000005'),
  parcel6: withCheckDigit('03760123400000006'),
  otherDelivery: withCheckDigit('03760123400000099')
} as const

/**
 * Livraison des maquettes : 6 colis, 2 commandes (Céramiques du Sud + Atelier Lin & Coton).
 * Le colis 2 contient un vase de plus que commandé → excédent attendu au récapitulatif.
 * Libellés en français : ce sont des données affichées telles quelles à l'écran.
 * @returns une nouvelle instance (évite toute fuite d'état entre tests)
 */
export function createOuestExpressDelivery(): Delivery {
  return {
    id: 'LIV-2311-0087',
    deliveryNoteCode: 'BL88412070',
    carrier: 'Transports Ouest Express',
    dock: 'B',
    orders: [
      {
        number: 'CMD-2611-0412',
        supplier: 'Céramiques du Sud',
        lines: [
          { ean: EAN.sandVase, label: 'Vase grès sable H25', expectedQuantity: 6 },
          { ean: EAN.figCandle, label: 'Bougie parfumée figue', expectedQuantity: 24 },
          { ean: EAN.stonewarePlate, label: 'Assiette plate grès Ø27', expectedQuantity: 18 }
        ]
      },
      {
        number: 'CMD-2611-0418',
        supplier: 'Atelier Lin & Coton',
        lines: [
          { ean: EAN.linenCushion, label: 'Coussin lin naturel 45×45', expectedQuantity: 12 },
          { ean: EAN.wafflePlaid, label: 'Plaid gaufré terracotta', expectedQuantity: 10 }
        ]
      }
    ],
    parcels: [
      { number: 1, sscc: SSCC.parcel1, orderNumber: 'CMD-2611-0412', contents: [{ ean: EAN.sandVase, quantity: 6 }] },
      { number: 2, sscc: SSCC.parcel2, orderNumber: 'CMD-2611-0412', contents: [{ ean: EAN.sandVase, quantity: 1 }] },
      { number: 3, sscc: SSCC.parcel3, orderNumber: 'CMD-2611-0418', contents: [{ ean: EAN.linenCushion, quantity: 12 }] },
      { number: 4, sscc: SSCC.parcel4, orderNumber: 'CMD-2611-0412', contents: [{ ean: EAN.figCandle, quantity: 24 }] },
      { number: 5, sscc: SSCC.parcel5, orderNumber: 'CMD-2611-0412', contents: [{ ean: EAN.stonewarePlate, quantity: 18 }] },
      { number: 6, sscc: SSCC.parcel6, orderNumber: 'CMD-2611-0418', contents: [{ ean: EAN.wafflePlaid, quantity: 10 }] }
    ]
  }
}
