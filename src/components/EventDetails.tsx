import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import {
  formatAssignedPeople,
  formatEventDuration,
  formatEventWindow,
  hasLocation,
  hrefFromLink,
  linkLabel,
} from '../utils/itinerary'
import { reverseGeocode } from '../utils/geocode'
import { mapsHref } from '../utils/maps'
import { personCssVars } from '../utils/personColor'
import type { Event } from '../types'

type EventDetailsProps = {
  event: Event
  index: number
  showHeading?: boolean
  allPeople?: string[]
  staticMode?: boolean
}

function MetaLine({ parts }: { parts: ReactNode[] }) {
  if (parts.length === 0) {
    return null
  }

  return (
    <p className="event-details__line">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          {part}
        </span>
      ))}
    </p>
  )
}

function AssignedPeople({ names, roster }: { names: string[]; roster: string[] }) {
  const palette = roster.length > 0 ? roster : names

  return (
    <span className="event-details__people">
      {names.map((name, index) => (
        <span key={`${name}-${index}`}>
          {index > 0 ? (
            <span className="event-details__people-sep" aria-hidden="true">
              {' · '}
            </span>
          ) : null}
          <span className="person-name" style={personCssVars(name, palette) as CSSProperties}>
            {name}
          </span>
        </span>
      ))}
    </span>
  )
}

function PlaceMark({
  text,
  href,
  pin,
}: {
  text: string
  href: string | null
  pin: boolean
}) {
  const body = (
    <>
      {pin ? <MapPin size={14} aria-hidden="true" /> : null}
      <span>{text}</span>
    </>
  )

  if (href) {
    return (
      <a
        className="event-details__place"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Directions to ${text}`}
        onClick={(click) => click.stopPropagation()}
      >
        {body}
      </a>
    )
  }

  return <span className="event-details__place">{body}</span>
}

function EventLink({ value }: { value: string }) {
  const href = hrefFromLink(value)
  if (!href) {
    return null
  }

  return (
    <a
      className="event-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      onClick={(click) => click.stopPropagation()}
    >
      <span className="event-link__icon">
        <ExternalLink size={14} aria-hidden="true" />
      </span>
      <span className="event-link__label">{linkLabel(value)}</span>
    </a>
  )
}

function usePlaceLabel(event: Event): string {
  const stored = event.place.trim()
  const lat = event.lat
  const lng = event.lng
  const [resolved, setResolved] = useState(stored)

  useEffect(() => {
    setResolved(stored)
    if (stored || lat == null || lng == null) {
      return
    }

    const controller = new AbortController()
    reverseGeocode(lat, lng, controller.signal)
      .then((name) => {
        if (name) {
          setResolved(name)
        }
      })
      .catch(() => {})

    return () => controller.abort()
  }, [stored, lat, lng])

  return resolved
}

export default function EventDetails({
  event,
  index,
  showHeading = true,
  allPeople = [],
  staticMode = false,
}: EventDetailsProps) {
  const windowLabel = formatEventWindow(event)
  const durationLabel = formatEventDuration(event)
  const href = hrefFromLink(event.link)
  const located = hasLocation(event)
  const notes = event.notes.trim()
  const peopleLabel = formatAssignedPeople(event, allPeople)
  const placeLabel = usePlaceLabel(event)
  const compact = !showHeading
  const everyone = peopleLabel === 'Everyone'
  const namedPeople = !everyone && event.people.length > 0
  const eventLink = href && !staticMode ? <EventLink value={event.link} /> : null
  const placeText = placeLabel || (located && !staticMode ? 'Directions' : '')
  const placeHref = located && !staticMode ? mapsHref(event.lat, event.lng) : null
  const place = placeText ? (
    <PlaceMark text={placeText} href={placeHref} pin={Boolean(placeHref)} />
  ) : null

  if (compact && !notes && !placeText && !durationLabel && !namedPeople && !eventLink) {
    return null
  }

  if (compact) {
    const meta: ReactNode[] = []
    if (place) {
      meta.push(place)
    }
    if (durationLabel) {
      meta.push(durationLabel)
    }

    return (
      <div className="event-details event-details--rail">
        <MetaLine parts={meta} />
        {namedPeople ? (
          <p className="event-details__line">
            <AssignedPeople names={event.people} roster={allPeople} />
          </p>
        ) : null}
        {notes ? <p className="event-details__notes">{notes}</p> : null}
        {eventLink ? <div className="event-details__actions">{eventLink}</div> : null}
      </div>
    )
  }

  const summary: ReactNode[] = []
  if (everyone) {
    summary.push('Everyone')
  } else if (namedPeople) {
    summary.push(<AssignedPeople names={event.people} roster={allPeople} />)
  }

  return (
    <div className="event-details">
      <p className="event-details__title">{event.title || `Event ${index}`}</p>
      {windowLabel || durationLabel ? (
        <p className="event-details__time">
          {[windowLabel, durationLabel].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {place}
      <MetaLine parts={summary} />
      {notes ? <p className="event-details__notes">{notes}</p> : null}
      {eventLink ? <div className="event-details__actions">{eventLink}</div> : null}
    </div>
  )
}
