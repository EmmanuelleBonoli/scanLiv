/**
 * Calcul des écarts de réception : la règle métier centrale du prototype.
 * Le système compare attendu (commandes) et compté (magasin) ; le magasinier
 * n'a rien à justifier, chaque écart est rattaché à sa commande et transmis
 * au service approvisionnement.
 */
import type { ParcelCheck } from './arrival'
import type { ItemCount } from './counting'
import { type Delivery, type Ean, type ExpectedLine, expectedLines } from './delivery'

export type LineStatus = 'matching' | 'short' | 'over' | 'not_received' | 'unexpected'

export interface ReportLine {
  readonly ean: Ean
  /** null pour un article inattendu, dont seul l'EAN est connu. */
  readonly label: string | null
  /** null pour un article inattendu, qui n'appartient à aucune commande. */
  readonly orderNumber: string | null
  readonly supplier: string | null
  readonly expected: number
  readonly counted: number
  /** compté − attendu : négatif = manque, positif = excédent. */
  readonly difference: number
  readonly status: LineStatus
  /** Colis déclarés manquants à l'arrivée contenant cette référence (explique un non-reçu). */
  readonly missingParcels: readonly number[]
}

export interface ReceiptReport {
  readonly lines: readonly ReportLine[]
  readonly matchingCount: number
  readonly discrepancyCount: number
  readonly overallStatus: 'compliant' | 'with_discrepancies'
}

/**
 * Compare les quantités comptées aux quantités commandées.
 * Fonction pure, sans dépendance à Vue ni à l'API : testable en isolation.
 * @param delivery livraison annoncée (commandes + colis)
 * @param count quantités comptées par EAN
 * @param parcelChecks état des colis à l'arrivée, pour expliquer les non-reçus
 * @returns le rapport, écarts en tête
 */
export function analyzeReceipt(
  delivery: Delivery,
  count: ItemCount,
  parcelChecks: readonly ParcelCheck[] = []
): ReceiptReport {
  const expected = expectedLines(delivery)
  const missing = new Set(parcelChecks.filter(c => c.status === 'missing').map(c => c.number))

  const lines = [
    ...expected.map(line => lineFromOrder(line, count[line.ean] ?? 0, missingParcelsContaining(delivery, line.ean, missing))),
    ...unexpectedLines(expected, count)
  ].sort((a, b) => Number(a.status === 'matching') - Number(b.status === 'matching'))

  const matchingCount = lines.filter(l => l.status === 'matching').length
  const discrepancyCount = lines.length - matchingCount
  return {
    lines,
    matchingCount,
    discrepancyCount,
    overallStatus: discrepancyCount === 0 ? 'compliant' : 'with_discrepancies'
  }
}

/**
 * Qualifie l'écart d'une ligne attendue.
 * @returns le statut correspondant à la différence compté / attendu
 */
export function qualifyDiscrepancy(expected: number, counted: number): LineStatus {
  if (counted === expected) return 'matching'
  if (counted === 0) return 'not_received'
  return counted < expected ? 'short' : 'over'
}

function lineFromOrder(line: ExpectedLine, counted: number, missingParcels: number[]): ReportLine {
  return {
    ean: line.ean,
    label: line.label,
    orderNumber: line.orderNumber,
    supplier: line.supplier,
    expected: line.expectedQuantity,
    counted,
    difference: counted - line.expectedQuantity,
    status: qualifyDiscrepancy(line.expectedQuantity, counted),
    missingParcels
  }
}

function unexpectedLines(expected: readonly ExpectedLine[], count: ItemCount): ReportLine[] {
  const expectedEans = new Set(expected.map(l => l.ean))
  return Object.entries(count)
    .filter(([ean, counted]) => !expectedEans.has(ean) && counted > 0)
    .map(([ean, counted]) => ({
      ean,
      // Article hors commande : seul l'EAN est connu, le back-office l'identifiera
      label: null,
      orderNumber: null,
      supplier: null,
      expected: 0,
      counted,
      difference: counted,
      status: 'unexpected' as const,
      missingParcels: []
    }))
}

function missingParcelsContaining(delivery: Delivery, ean: Ean, missing: ReadonlySet<number>): number[] {
  return delivery.parcels
    .filter(p => missing.has(p.number) && p.contents.some(content => content.ean === ean))
    .map(p => p.number)
}
