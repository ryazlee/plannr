import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import MapsLink from './MapsLink'
import {
  formatAssignedPeople,
  formatEventDuration,
  formatEventWindow,
  hasLocation,
  hrefFromLink,
  linkLabel,
} from '../utils/itinerary'
import type { Event } from '../types'

type EventDetailsProps = {
  event: Event
  index: number
  showHeading?: boolean
  allPeople?: string[]
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

export default function EventDetails({
  event,
  index,
  showHeading = true,
  allPeople = [],
}: EventDetailsProps) {
  const windowLabel = formatEventWindow(event)
  const durationLabel = formatEventDuration(event)
  const href = hrefFromLink(event.link)
  const located = hasLocation(event)
  const notes = event.notes.trim()
  const peopleLabel = formatAssignedPeople(event, allPeople)
  const summary: ReactNode[] = []

  if (!showHeading && durationLabel) {
    summary.push(durationLabel)
  }
  if (peopleLabel) {
    summary.push(peopleLabel)
  }

  const eventLink = href ? <EventLink value={event.link} /> : null
  const directions = located ? <MapsLink lat={event.lat} lng={event.lng} /> : null

  if (!showHeading && !notes && summary.length === 0 && !eventLink && !directions) {
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
      <MetaLine parts={summary} />
      {notes ? <p className="event-details__notes">{notes}</p> : null}
      {eventLink || directions ? (
        <div className="event-details__actions">
          {eventLink}
          {directions}
        </div>
      ) : null}
    </div>
  )
}
