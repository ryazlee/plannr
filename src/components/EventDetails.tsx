import MapsLink from './MapsLink'
import { formatEventWindow, hasLocation, hrefFromLink, linkLabel } from '../utils/itinerary'
import { formatCoords } from '../utils/maps'
import type { Event } from '../types'

type EventDetailsProps = {
  event: Event
  index: number
  showHeading?: boolean
}

export default function EventDetails({ event, index, showHeading = true }: EventDetailsProps) {
  const windowLabel = formatEventWindow(event)
  const href = hrefFromLink(event.link)
  const located = hasLocation(event)

  if (!showHeading && !event.notes.trim() && event.people.length === 0 && !href && !located) {
    return null
  }

  return (
    <div className="event-details">
      {showHeading ? (
        <>
          <p className="event-details__title">{event.title || `Event ${index}`}</p>
          {windowLabel ? <p className="event-details__time">{windowLabel}</p> : null}
        </>
      ) : null}
      {event.notes.trim() ? <p className="event-details__notes">{event.notes}</p> : null}
      {event.people.length > 0 ? (
        <span className="chip-row event-details__people">
          {event.people.map((person) => (
            <span key={person} className="chip chip--muted">
              {person}
            </span>
          ))}
        </span>
      ) : null}
      {href || located ? (
        <div className="event-details__links">
          {href ? (
            <a className="preview-event__link" href={href} target="_blank" rel="noopener noreferrer">
              {linkLabel(event.link)}
            </a>
          ) : null}
          {located ? (
            <MapsLink lat={event.lat} lng={event.lng} className="preview-event__link">
              {formatCoords(event.lat, event.lng)}
            </MapsLink>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
