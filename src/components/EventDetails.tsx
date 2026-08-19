import { useEffect, useState, type ReactNode } from 'react'
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
  const summary: ReactNode[] = []

  if (!showHeading && durationLabel) {
    summary.push(durationLabel)
  }
  if (peopleLabel) {
    summary.push(peopleLabel)
  }

  const eventLink = href && !staticMode ? <EventLink value={event.link} /> : null
  const placeText = placeLabel || (located && !staticMode ? 'Directions' : '')
  const placeHref = located && !staticMode ? mapsHref(event.lat, event.lng) : null

  if (!showHeading && !notes && !placeText && summary.length === 0 && !eventLink) {
    return null
  }

  return (
    <div className="event-details">
      {showHeading ? (
        <>
          <p className="event-details__title">{event.title || `Event ${index}`}</p>
          {windowLabel || durationLabel ? (
            <p className="event-details__time">
              {[windowLabel, durationLabel].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </>
      ) : null}
      {placeText ? (
        placeHref ? (
          <a
            className="event-details__place"
            href={placeHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Directions to ${placeText}`}
            onClick={(click) => click.stopPropagation()}
          >
            <MapPin size={14} aria-hidden="true" />
            <span>{placeText}</span>
          </a>
        ) : (
          <p className="event-details__place">
            {staticMode ? null : <MapPin size={14} aria-hidden="true" />}
            <span>{placeText}</span>
          </p>
        )
      ) : null}
      <MetaLine parts={summary} />
      {notes ? <p className="event-details__notes">{notes}</p> : null}
      {eventLink ? <div className="event-details__actions">{eventLink}</div> : null}
    </div>
  )
}
