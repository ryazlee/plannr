import type { Theme } from '../theme'
import type { Event, LocatedEvent } from '../types'
import { groupEventsByStartTime, hasLocation } from './itinerary'

export type RouteSwatch = {
  line: string
  halo: string
  on: string
}

export const PERSON_PALETTE: Record<Theme, RouteSwatch[]> = {
  light: [
    { line: '#2563eb', halo: '#ffffff', on: '#ffffff' },
    { line: '#c2410c', halo: '#ffffff', on: '#ffffff' },
    { line: '#047857', halo: '#ffffff', on: '#ffffff' },
    { line: '#be185d', halo: '#ffffff', on: '#ffffff' },
    { line: '#6d28d9', halo: '#ffffff', on: '#ffffff' },
    { line: '#0f766e', halo: '#ffffff', on: '#ffffff' },
  ],
  dark: [
    { line: '#8cb4ff', halo: '#0b1220', on: '#09090b' },
    { line: '#fbbf24', halo: '#0b1220', on: '#09090b' },
    { line: '#4ade80', halo: '#0b1220', on: '#09090b' },
    { line: '#fb7185', halo: '#0b1220', on: '#09090b' },
    { line: '#c4b5fd', halo: '#0b1220', on: '#09090b' },
    { line: '#2dd4bf', halo: '#0b1220', on: '#09090b' },
  ],
}

export const SHARED_ROUTE: Record<Theme, RouteSwatch> = {
  light: { line: '#3c6fe0', halo: '#ffffff', on: '#ffffff' },
  dark: { line: '#8cb4ff', halo: '#0b1220', on: '#09090b' },
}

const PALETTE_SIZE = PERSON_PALETTE.light.length

export function personIndex(name: string, roster: string[]): number {
  const index = roster.findIndex((person) => person === name)
  return (index < 0 ? 0 : index) % PALETTE_SIZE
}

export function personCssVars(name: string, roster: string[]): {
  ['--person-color']: string
  ['--person-on']: string
} {
  const index = personIndex(name, roster)
  return {
    '--person-color': `var(--person-${index})`,
    '--person-on': `var(--person-${index}-on)`,
  }
}

export function personSwatch(name: string, roster: string[], theme: Theme): RouteSwatch {
  return PERSON_PALETTE[theme][personIndex(name, roster)]
}

export function eventIncludesPerson(event: Event, person: string, roster: string[]): boolean {
  if (event.people.length === 0) {
    return true
  }

  const everyone = roster.length > 0 && roster.every((name) => event.people.includes(name))
  if (everyone) {
    return true
  }

  return event.people.includes(person)
}

export function concurrentLaneColor(event: Event, roster: string[], fallbackIndex: number): string {
  const assigned = event.people.filter((name) => roster.includes(name))
  const everyone =
    roster.length > 1 &&
    assigned.length >= roster.length &&
    roster.every((name) => assigned.includes(name))

  if (assigned.length >= 1 && !everyone) {
    return `var(--person-${personIndex(assigned[0], roster)})`
  }

  return `var(--person-${fallbackIndex % PALETTE_SIZE})`
}

export function concurrentMarkerColor(
  event: Event,
  roster: string[],
  theme: Theme,
  fallbackIndex: number,
): string {
  const assigned = event.people.filter((name) => roster.includes(name))
  const everyone =
    roster.length > 1 &&
    assigned.length >= roster.length &&
    roster.every((name) => assigned.includes(name))

  if (assigned.length >= 1 && !everyone) {
    return personSwatch(assigned[0], roster, theme).line
  }

  return PERSON_PALETTE[theme][fallbackIndex % PALETTE_SIZE].line
}

export type MapTrace = {
  key: string
  positions: [number, number][]
  swatch: RouteSwatch
  spread: number
}

function lastLocated(groups: Event[][], before: number): LocatedEvent | null {
  for (let index = before - 1; index >= 0; index -= 1) {
    const found = [...groups[index]].reverse().find(hasLocation)
    if (found) {
      return found
    }
  }
  return null
}

function firstLocated(groups: Event[][], after: number): LocatedEvent | null {
  for (let index = after + 1; index < groups.length; index += 1) {
    const found = groups[index].find(hasLocation)
    if (found) {
      return found
    }
  }
  return null
}

export function mapRouteTraces(events: Event[], roster: string[], theme: Theme): MapTrace[] {
  const located = events.filter(hasLocation)
  if (located.length < 2) {
    return []
  }

  const groups = groupEventsByStartTime(events)
  const hasSplit = groups.some((group) => group.filter(hasLocation).length > 1)

  if (!hasSplit) {
    return [
      {
        key: 'shared',
        positions: located.map((event) => [event.lat, event.lng]),
        swatch: SHARED_ROUTE[theme],
        spread: 0,
      },
    ]
  }

  if (roster.length >= 2) {
    const mid = (roster.length - 1) / 2
    return roster.flatMap((person, index) => {
      const path = located.filter((event) => eventIncludesPerson(event, person, roster))
      if (path.length < 2) {
        return []
      }

      return [
        {
          key: person,
          positions: path.map((event) => [event.lat, event.lng] as [number, number]),
          swatch: personSwatch(person, roster, theme),
          spread: index - mid,
        },
      ]
    })
  }

  const traces: MapTrace[] = []
  groups.forEach((group, groupIndex) => {
    const here = group.filter(hasLocation)
    if (here.length < 2) {
      const prevSolo = groups[groupIndex - 1]?.filter(hasLocation) ?? []
      if (here.length === 1 && prevSolo.length === 1) {
        traces.push({
          key: `${prevSolo[0].id}->${here[0].id}`,
          positions: [
            [prevSolo[0].lat, prevSolo[0].lng],
            [here[0].lat, here[0].lng],
          ],
          swatch: SHARED_ROUTE[theme],
          spread: 0,
        })
      }
      return
    }

    const prev = lastLocated(groups, groupIndex)
    const next = firstLocated(groups, groupIndex)
    const mid = (here.length - 1) / 2
    here.forEach((event, index) => {
      const positions: [number, number][] = []
      if (prev) {
        positions.push([prev.lat, prev.lng])
      }
      positions.push([event.lat, event.lng])
      if (next) {
        positions.push([next.lat, next.lng])
      }
      if (positions.length < 2) {
        return
      }

      traces.push({
        key: event.id,
        positions,
        swatch: PERSON_PALETTE[theme][index % PALETTE_SIZE],
        spread: index - mid,
      })
    })
  })

  return traces
}

export function concurrentFallbackIndex(event: Event, events: Event[]): number {
  if (!event.startTime) {
    return 0
  }

  return Math.max(
    0,
    events
      .filter((other) => other.startTime === event.startTime)
      .findIndex((other) => other.id === event.id),
  )
}

export function isConcurrentEvent(event: Event, events: Event[]): boolean {
  if (!event.startTime) {
    return false
  }

  return events.filter((other) => other.startTime === event.startTime).length > 1
}
