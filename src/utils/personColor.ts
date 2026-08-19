import type { Theme } from '../theme'
import type { Event, LocatedEvent } from '../types'
import { groupEventsByStartTime, hasLocation } from './itinerary'

export type RouteSwatch = {
  line: string
  halo: string
  on: string
}

export const PERSON_LINES = [
  '#c4541c',
  '#dc3440',
  '#1c8828',
  '#db2777',
  '#8c5cd4',
  '#108662',
  '#e11d48',
  '#947028',
  '#c026d3',
  '#6b7c1c',
  '#d03494',
  '#b45309',
] as const

const ROUTE_HALO: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#0b1220',
}

function personTone(index: number, theme: Theme): RouteSwatch {
  const line = PERSON_LINES[index % PERSON_LINES.length]
  return {
    line,
    halo: ROUTE_HALO[theme],
    on: '#ffffff',
  }
}

export const SHARED_ROUTE: Record<Theme, RouteSwatch> = {
  light: { line: '#3c6fe0', halo: '#ffffff', on: '#ffffff' },
  dark: { line: '#8cb4ff', halo: '#0b1220', on: '#09090b' },
}

const PALETTE_SIZE = PERSON_LINES.length
const PROBE_STEPS = [1, 5, 7, 11] as const

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

function nameHash(name: string): number {
  const key = nameKey(name)
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function preferredIndex(name: string): number {
  return nameHash(name) % PALETTE_SIZE
}

function probeStep(name: string): number {
  return PROBE_STEPS[(nameHash(name) >>> 8) % PROBE_STEPS.length]
}

function assignRosterColors(roster: string[]): Map<string, number> {
  const seen = new Set<string>()
  const people: { key: string; preferred: number; step: number }[] = []
  for (const person of roster) {
    const key = nameKey(person)
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    people.push({ key, preferred: preferredIndex(person), step: probeStep(person) })
  }

  people.sort((left, right) => left.key.localeCompare(right.key))

  const taken = new Set<number>()
  const assigned = new Map<string, number>()

  for (const person of people) {
    if (taken.has(person.preferred)) {
      continue
    }
    taken.add(person.preferred)
    assigned.set(person.key, person.preferred)
  }

  for (const person of people) {
    if (assigned.has(person.key)) {
      continue
    }

    let slot = person.preferred
    for (let offset = 1; offset <= PALETTE_SIZE; offset += 1) {
      slot = (person.preferred + person.step * offset) % PALETTE_SIZE
      if (!taken.has(slot)) {
        break
      }
    }

    taken.add(slot)
    assigned.set(person.key, slot)
  }

  return assigned
}

export function personIndex(name: string, roster: string[] = []): number {
  const preferred = preferredIndex(name)
  if (roster.length === 0) {
    return preferred
  }

  return assignRosterColors(roster).get(nameKey(name)) ?? preferred
}

export function personCssVars(
  name: string,
  roster: string[] = [],
): {
  ['--person-color']: string
  ['--person-on']: string
} {
  const index = personIndex(name, roster)
  return {
    '--person-color': `var(--person-${index})`,
    '--person-on': `var(--person-${index}-on)`,
  }
}

export function personSwatch(name: string, theme: Theme, roster: string[] = []): RouteSwatch {
  return personTone(personIndex(name, roster), theme)
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
    return personSwatch(assigned[0], theme, roster).line
  }

  return personTone(fallbackIndex, theme).line
}

export type MapTrace = {
  key: string
  positions: [number, number][]
  swatch: RouteSwatch
  spread: number
}

type RouteHop = {
  from: LocatedEvent
  to: LocatedEvent
  people: string[]
}

function hopKey(from: LocatedEvent, to: LocatedEvent): string {
  return `${from.id}>${to.id}`
}

function collectPersonHops(events: Event[], roster: string[]): RouteHop[] {
  const located = events.filter(hasLocation)
  const hops = new Map<string, RouteHop>()

  for (const person of roster) {
    const path = located.filter((event) => eventIncludesPerson(event, person, roster))
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index]
      const to = path[index + 1]
      const key = hopKey(from, to)
      const existing = hops.get(key)
      if (existing) {
        if (!existing.people.includes(person)) {
          existing.people.push(person)
        }
        continue
      }
      hops.set(key, { from, to, people: [person] })
    }
  }

  return [...hops.values()]
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
    const hops = collectPersonHops(events, roster)
    const personalByOrigin = new Map<string, RouteHop[]>()
    for (const hop of hops) {
      if (hop.people.length !== 1) {
        continue
      }
      const siblings = personalByOrigin.get(hop.from.id) ?? []
      siblings.push(hop)
      personalByOrigin.set(hop.from.id, siblings)
    }

    return hops.map((hop) => {
      const together = hop.people.length > 1
      const siblings = personalByOrigin.get(hop.from.id) ?? [hop]
      const siblingIndex = Math.max(0, siblings.findIndex((entry) => entry.to.id === hop.to.id))
      const mid = (siblings.length - 1) / 2
      const person = hop.people[0]

      return {
        key: hopKey(hop.from, hop.to),
        positions: [
          [hop.from.lat, hop.from.lng],
          [hop.to.lat, hop.to.lng],
        ] as [number, number][],
        swatch: together || !person ? SHARED_ROUTE[theme] : personSwatch(person, theme, roster),
        spread: together ? 0 : siblingIndex - mid,
      }
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
        swatch: personTone(index, theme),
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
