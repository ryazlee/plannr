import { ExternalLink, MapPin, Users } from 'lucide-react'
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

  if (!showHeading && !notes && !peopleLabel && !href && !located) {
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
      {notes ? <p className="event-details__notes">{notes}</p> : null}
      {peopleLabel || href || located ? (
        <div className="event-details__meta">
          {peopleLabel ? (
            <p className="event-details__row">
              <Users size={14} aria-hidden="true" />
              <span>{peopleLabel}</span>
            </p>
          ) : null}
          {href ? (
            <a
              className="event-details__row event-details__row--link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(click) => click.stopPropagation()}
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>{linkLabel(event.link)}</span>
            </a>
          ) : null}
          {located ? (
            <MapsLink lat={event.lat} lng={event.lng} className="event-details__row event-details__row--link">
              <MapPin size={14} aria-hidden="true" />
              <span>Open in Maps</span>
            </MapsLink>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
