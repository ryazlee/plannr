import type { Event, ItineraryState } from '../types'
import { formatDisplayDate, formatEventWindow, hasLocation, hrefFromLink } from './itinerary'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const FALLBACK_START: [number, number] = [9, 0]
const HOUR_MS = 60 * 60 * 1000

export function hasCalendarDate(date: string): boolean {
  const parts = parseDateParts(date)
  return parts !== null
}

function parseDateParts(date: string): [number, number, number] | null {
  const match = DATE_PATTERN.exec(date.trim())
  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const check = new Date(year, month - 1, day)
  if (
    check.getFullYear() !== year
    || check.getMonth() !== month - 1
    || check.getDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

function parseTimeParts(value: string): [number, number] | null {
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number.parseInt(hoursRaw ?? '', 10)
  const minutes = Number.parseInt(minutesRaw ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }
  return [hours, minutes]
}

function localDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): Date {
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

export function eventDateTimes(
  date: string,
  event: Event,
): { start: Date; end: Date } | null {
  const parts = parseDateParts(date)
  if (!parts) {
    return null
  }

  const [year, month, day] = parts
  const startHm = parseTimeParts(event.startTime) ?? FALLBACK_START
  const start = localDate(year, month, day, startHm[0], startHm[1])
  const endHm = parseTimeParts(event.endTime)

  if (!endHm) {
    return { start, end: new Date(start.getTime() + HOUR_MS) }
  }

  let end = localDate(year, month, day, endHm[0], endHm[1])
  if (end <= start) {
    end = new Date(end.getTime() + 24 * HOUR_MS)
  }

  return { start, end }
}

export function dayDateTimes(
  date: string,
  events: Event[],
): { start: Date; end: Date } | null {
  const first = events[0]
  const last = events[events.length - 1]
  if (!first || !last) {
    return null
  }

  const startWindow = eventDateTimes(date, first)
  const endWindow = eventDateTimes(date, last)
  if (!startWindow || !endWindow) {
    return null
  }

  return { start: startWindow.start, end: endWindow.end }
}

function formatLocalStamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

function formatUtcStamp(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function locationFromEvent(event: Event): string {
  if (!hasLocation(event)) {
    return ''
  }
  return `${event.lat.toFixed(5)}, ${event.lng.toFixed(5)}`
}

function eventDescription(event: Event): string {
  const lines: string[] = []
  const window = formatEventWindow(event)
  if (window) {
    lines.push(window)
  }
  if (event.notes.trim()) {
    lines.push(event.notes.trim())
  }
  const href = hrefFromLink(event.link)
  if (href) {
    lines.push(href)
  }
  if (event.people.length > 0) {
    lines.push(`With: ${event.people.join(', ')}`)
  }
  return lines.join('\n')
}

function dayDescription(itinerary: ItineraryState): string {
  const lines: string[] = []
  const title = itinerary.title.trim() || 'Untitled plan'
  lines.push(title)
  if (itinerary.date) {
    lines.push(formatDisplayDate(itinerary.date))
  }
  lines.push('')

  itinerary.events.forEach((event, index) => {
    const heading = `${index + 1}. ${formatEventWindow(event) || 'Time TBD'} — ${event.title.trim() || `Event ${index + 1}`}`
    lines.push(heading)
    if (event.notes.trim()) {
      lines.push(`   ${event.notes.trim()}`)
    }
    const href = hrefFromLink(event.link)
    if (href) {
      lines.push(`   ${href}`)
    }
    if (event.people.length > 0) {
      lines.push(`   With: ${event.people.join(', ')}`)
    }
  })

  return lines.join('\n').trim()
}

function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

export function googleTemplateUrl(options: {
  title: string
  start: Date
  end: Date
  details?: string
  location?: string
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: options.title,
    dates: `${formatLocalStamp(options.start)}/${formatLocalStamp(options.end)}`,
  })

  if (options.details?.trim()) {
    params.set('details', options.details.trim().slice(0, 7000))
  }
  if (options.location?.trim()) {
    params.set('location', options.location.trim())
  }

  const timeZone = localTimeZone()
  if (timeZone) {
    params.set('ctz', timeZone)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function dayGoogleUrl(itinerary: ItineraryState): string | null {
  const window = dayDateTimes(itinerary.date, itinerary.events)
  if (!window) {
    return null
  }

  const first = itinerary.events.find(hasLocation)

  return googleTemplateUrl({
    title: itinerary.title.trim() || 'Untitled plan',
    start: window.start,
    end: window.end,
    details: dayDescription(itinerary),
    location: first ? locationFromEvent(first) : '',
  })
}

export function eventGoogleUrl(date: string, event: Event, index: number): string | null {
  const window = eventDateTimes(date, event)
  if (!window) {
    return null
  }

  return googleTemplateUrl({
    title: event.title.trim() || `Event ${index + 1}`,
    start: window.start,
    end: window.end,
    details: eventDescription(event),
    location: locationFromEvent(event),
  })
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) {
    return line
  }

  const chunks: string[] = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }
  return chunks.join('\r\n')
}

function icsLines(lines: string[]): string {
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`
}

function vevent(options: {
  uid: string
  title: string
  start: Date
  end: Date
  description: string
  location: string
  stamp: Date
}): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${options.uid}`,
    `DTSTAMP:${formatUtcStamp(options.stamp)}`,
    `DTSTART:${formatLocalStamp(options.start)}`,
    `DTEND:${formatLocalStamp(options.end)}`,
    `SUMMARY:${escapeIcsText(options.title)}`,
  ]

  if (options.description.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(options.description.trim())}`)
  }
  if (options.location.trim()) {
    lines.push(`LOCATION:${escapeIcsText(options.location.trim())}`)
  }

  lines.push('END:VEVENT')
  return lines
}

export function buildEventsIcs(itinerary: ItineraryState): string | null {
  if (!hasCalendarDate(itinerary.date) || itinerary.events.length === 0) {
    return null
  }

  const stamp = new Date()
  const timeZone = localTimeZone()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Plannr//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  if (timeZone) {
    lines.push(`X-WR-TIMEZONE:${timeZone}`)
  }

  for (const [index, event] of itinerary.events.entries()) {
    const window = eventDateTimes(itinerary.date, event)
    if (!window) {
      return null
    }

    lines.push(
      ...vevent({
        uid: `${event.id}@plannr`,
        title: event.title.trim() || `Event ${index + 1}`,
        start: window.start,
        end: window.end,
        description: eventDescription(event),
        location: locationFromEvent(event),
        stamp,
      }),
    )
  }

  lines.push('END:VCALENDAR')
  return icsLines(lines)
}

export function downloadIcs(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function icsFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'plannr'}.ics`
}
