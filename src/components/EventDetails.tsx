import type { ReactNode } from 'react'
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
  const links: ReactNode[] = []

  if (!showHeading && durationLabel) {
    summary.push(durationLabel)
  }
  if (peopleLabel) {
    summary.push(peopleLabel)
  }
  if (href) {
    links.push(
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(click) => click.stopPropagation()}
      >
        {linkLabel(event.link)}
      </a>,
    )
  }
  if (located) {
    links.push(
      <MapsLink lat={event.lat} lng={event.lng}>
        Maps
      </MapsLink>,
    )
  }

  if (!showHeading && !notes && summary.length === 0 && links.length === 0) {
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
      <MetaLine parts={links} />
    </div>
  )
}
