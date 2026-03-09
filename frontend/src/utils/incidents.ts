import type { IncidentWarning } from './ai'

interface SeedIncident extends IncidentWarning {
  zips: string[]
}

const SEED_INCIDENTS: SeedIncident[] = [
  {
    title: 'Sanitation Delay Alert',
    area: 'West Montgomery',
    summary: 'Collections may run behind schedule today due to route disruptions.',
    zips: ['36104', '36105', '36108'],
  },
  {
    title: 'Road Closure Advisory',
    area: 'Downtown Corridor',
    summary: 'Traffic pattern changes are active near city maintenance zones.',
    zips: ['36106', '36107'],
  },
]

export function getIncidentForZip(zip: string): IncidentWarning | undefined {
  if (!zip) return undefined
  const normalized = zip.trim()
  const match = SEED_INCIDENTS.find((incident) => incident.zips.includes(normalized))
  if (!match) return undefined
  return {
    title: match.title,
    area: match.area,
    summary: match.summary,
  }
}
