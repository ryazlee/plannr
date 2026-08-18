import type { Event, ItineraryState, LocatedEvent } from '../types'

export function createEventId(): string {
  return crypto.randomUUID()
}

export function createEmptyState(): ItineraryState {
  return {
    title: '',
    date: '',
    people: [],
    events: [],
  }
}

export function isEmptyState(state: ItineraryState): boolean {
  return !state.title.trim() && !state.date && state.people.length === 0 && state.events.length === 0
}

export function parseNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const names: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }
    const name = entry.trim()
    if (!name) {
      continue
    }
    const exists = names.some((current) => current.toLowerCase() === name.toLowerCase())
    if (!exists) {
      names.push(name)
    }
  }
  return names
}

export function roundCoord(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

export function sortEvents(events: Event[]): Event[] {
  return [...events].sort((left, right) => {
    if (!left.startTime && !right.startTime) return 0
    if (!left.startTime) return 1
    if (!right.startTime) return -1
    const startCompare = left.startTime.localeCompare(right.startTime)
    if (startCompare !== 0) return startCompare
    return (effectiveEndTime(left) || left.startTime).localeCompare(effectiveEndTime(right) || right.startTime)
  })
}

export function withSortedEvents(state: ItineraryState): ItineraryState {
  return {
    ...state,
    events: sortEvents(state.events),
  }
}

export function groupEventsByStartTime(events: Event[]): Event[][] {
  const groups: Event[][] = []

  for (const event of events) {
    const current = groups[groups.length - 1]
    const lead = current?.[0]
    if (current && lead && event.startTime && lead.startTime === event.startTime) {
      current.push(event)
      continue
    }
    groups.push([event])
  }

  return groups
}

export function latestEffectiveEnd(events: Event[]): string {
  let latest = ''
  let latestMinutes = Number.NEGATIVE_INFINITY

  for (const event of events) {
    const end = effectiveEndTime(event)
    const minutes = timeToMinutes(end)
    if (minutes == null || minutes < latestMinutes) {
      continue
    }
    latest = end
    latestMinutes = minutes
  }

  return latest
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function hasLocation(event: Pick<Event, 'lat' | 'lng'>): event is LocatedEvent {
  return event.lat != null && event.lng != null
}

const EARTH_RADIUS_M = 6_371_000
const SAME_PLACE_M = 30

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function haversineMeters(
  from: Pick<LocatedEvent, 'lat' | 'lng'>,
  to: Pick<LocatedEvent, 'lat' | 'lng'>,
): number {
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function lastLocatedEvent(events: Event[]): LocatedEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event && hasLocation(event)) {
      return event
    }
  }
  return null
}

export function firstLocatedEvent(events: Event[]): LocatedEvent | null {
  return events.find(hasLocation) ?? null
}

export function gapDistanceMeters(previousEvents: Event[], nextEvents: Event[]): number | null {
  const from = lastLocatedEvent(previousEvents)
  const to = firstLocatedEvent(nextEvents)
  if (!from || !to || from.id === to.id) {
    return null
  }

  const meters = haversineMeters(from, to)
  return meters < SAME_PLACE_M ? null : meters
}

function prefersImperialDistance(): boolean {
  if (typeof navigator === 'undefined') {
    return true
  }

  const region = navigator.language.split('-')[1]?.toUpperCase()
  return region === 'US' || region === 'GB' || region === 'MM' || region === 'LR'
}

function formatDistanceNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function formatDistance(meters: number): string {
  if (prefersImperialDistance()) {
    const miles = meters / 1609.344
    if (miles < 0.1) {
      return `${Math.max(1, Math.round(meters / 0.3048))} ft`
    }
    const rounded = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles)
    return `${formatDistanceNumber(rounded)} mi`
  }

  if (meters < 1000) {
    const rounded = meters < 100 ? Math.round(meters) : Math.round(meters / 10) * 10
    return `${rounded} m`
  }

  const km = meters / 1000
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
  return `${formatDistanceNumber(rounded)} km`
}

function parseCoord(value: unknown): number | null {
  if (isFiniteNumber(value)) {
    return roundCoord(value)
  }
  return null
}

function parseEvent(value: unknown): Event | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<Event> & { time?: string }
  if (typeof candidate.title !== 'string') {
    return null
  }

  const startTime =
    typeof candidate.startTime === 'string'
      ? candidate.startTime
      : typeof candidate.time === 'string'
        ? candidate.time
        : ''

  const lat = parseCoord(candidate.lat)
  const lng = parseCoord(candidate.lng)
  const located = lat != null && lng != null

  return {
    id: typeof candidate.id === 'string' && candidate.id ? candidate.id : createEventId(),
    startTime,
    endTime: typeof candidate.endTime === 'string' ? candidate.endTime : '',
    title: candidate.title,
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    link: typeof candidate.link === 'string' ? candidate.link.trim() : '',
    people: parseNames(candidate.people),
    place: typeof candidate.place === 'string' ? candidate.place.trim() : '',
    lat: located ? lat : null,
    lng: located ? lng : null,
  }
}

export function serializeItineraryState(state: ItineraryState): unknown {
  return {
    title: state.title,
    date: state.date,
    people: state.people,
    events: state.events.map((event) => {
      const place = event.place.trim()
      return {
        id: event.id,
        startTime: event.startTime,
        endTime: event.endTime,
        title: event.title,
        notes: event.notes,
        link: event.link,
        people: event.people,
        ...(place ? { place } : {}),
        ...(hasLocation(event) ? { lat: event.lat, lng: event.lng } : {}),
      }
    }),
  }
}

export function parseItineraryState(value: unknown): ItineraryState | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ItineraryState>
  if (typeof candidate.title !== 'string' || typeof candidate.date !== 'string') {
    return null
  }

  if (!Array.isArray(candidate.events)) {
    return null
  }

  const events: Event[] = []
  for (const entry of candidate.events) {
    const parsed = parseEvent(entry)
    if (!parsed) {
      return null
    }
    events.push(parsed)
  }

  const people = parseNames(candidate.people)

  return withSortedEvents({
    title: candidate.title,
    date: candidate.date,
    people,
    events: events.map((event) => ({
      ...event,
      people: event.people.filter((name) => people.includes(name)),
    })),
  })
}

export function formatDisplayDate(iso: string): string {
  if (!iso) {
    return ''
  }

  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10))
  if (!year || !month || !day) {
    return iso
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(value: string): string {
  if (!value) {
    return ''
  }

  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number.parseInt(hoursRaw ?? '', 10)
  const minutes = Number.parseInt(minutesRaw ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value
  }

  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function currentTimeInput(): string {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function timeToMinutes(value: string): number | null {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number.parseInt(hoursRaw ?? '', 10)
  const minutes = Number.parseInt(minutesRaw ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  return hours * 60 + minutes
}

export function minutesToTime(total: number): string {
  const day = 24 * 60
  const normalized = ((total % day) + day) % day
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function offsetTime(value: string, deltaMinutes: number): string {
  const minutes = timeToMinutes(value)
  if (minutes == null) {
    return value
  }
  return minutesToTime(minutes + deltaMinutes)
}

export function effectiveEndTime(event: Pick<Event, 'startTime' | 'endTime'>): string {
  if (event.endTime) {
    return event.endTime
  }
  if (!event.startTime) {
    return ''
  }
  return offsetTime(event.startTime, 60)
}

export function minutesBetween(start: string, end: string): number | null {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  if (startMinutes == null || endMinutes == null) {
    return null
  }

  const diff = endMinutes - startMinutes
  return diff > 0 ? diff : null
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) {
    return hours === 1 ? '1 hr' : `${hours} hr`
  }

  return `${hours}h ${rest}m`
}

export function formatGapLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  const hourLabel = hours === 1 ? '1 hr' : `${hours} hr`
  return `${hourLabel} ${rest} min`
}

export function eventDurationMinutes(event: Pick<Event, 'startTime' | 'endTime'>): number | null {
  if (!event.startTime) {
    return null
  }

  return minutesBetween(event.startTime, effectiveEndTime(event))
}

export function formatEventDuration(event: Pick<Event, 'startTime' | 'endTime'>): string {
  const minutes = eventDurationMinutes(event)
  return minutes == null ? '' : formatDuration(minutes)
}

export function formatAssignedPeople(event: Pick<Event, 'people'>, allPeople: string[] = []): string {
  if (event.people.length === 0) {
    return ''
  }

  const roster = allPeople
  const everyone =
    roster.length > 1
    && roster.every((person) => event.people.includes(person))
    && event.people.length >= roster.length

  return everyone ? 'Everyone' : event.people.join(' · ')
}

export function formatEventWindow(event: Event): string {
  if (!event.startTime) {
    return event.endTime ? formatTime(event.endTime) : ''
  }

  const end = effectiveEndTime(event)
  if (!end || end === event.startTime) {
    return formatTime(event.startTime)
  }

  return `${formatTime(event.startTime)} – ${formatTime(end)}`
}

export function formatTimeRange(events: Event[]): string {
  const timed = events.filter((event) => event.startTime || event.endTime)
  const first = timed[0]
  const last = timed[timed.length - 1]
  if (!first) {
    return ''
  }

  if (!last || first.id === last.id) {
    return formatEventWindow(first)
  }

  const rangeStart = first.startTime || first.endTime
  const rangeEnd = effectiveEndTime(last) || last.startTime
  if (!rangeEnd || rangeEnd === rangeStart) {
    return formatTime(rangeStart)
  }

  return `${formatTime(rangeStart)} – ${formatTime(rangeEnd)}`
}

export function hrefFromLink(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return ''
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function linkLabel(value: string): string {
  const href = hrefFromLink(value)
  if (!href) {
    return value.trim()
  }

  try {
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./, '')
    const path = url.pathname === '/' ? '' : url.pathname
    return `${host}${path}`
  } catch {
    return value.trim()
  }
}
