import { useEffect, useRef } from 'react'
import EventDetails from './EventDetails'
import {
  effectiveEndTime,
  formatDuration,
  formatEventWindow,
  hasLocation,
  hrefFromLink,
  minutesBetween,
} from '../utils/itinerary'
import type { Event } from '../types'

type PreviewTimelineProps = {
  events: Event[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

function hasExtraDetails(event: Event): boolean {
  return Boolean(
    event.notes.trim() || event.people.length > 0 || hrefFromLink(event.link) || hasLocation(event),
  )
}

export default function PreviewTimeline({
  events,
  focusedEventId,
  onSelectEvent,
}: PreviewTimelineProps) {
  if (events.length === 0) {
    return <p className="empty-hint">No events on this day yet.</p>
  }

  return (
    <ol className="preview-rail">
      {events.map((event, index) => (
        <PreviewEventRow
          key={event.id}
          event={event}
          index={index}
          events={events}
          selected={event.id === focusedEventId}
          onSelectEvent={onSelectEvent}
        />
      ))}
    </ol>
  )
}

function PreviewEventRow({
  event,
  index,
  events,
  selected,
  onSelectEvent,
}: {
  event: Event
  index: number
  events: Event[]
  selected: boolean
  onSelectEvent: (eventId: string) => void
}) {
  const rowRef = useRef<HTMLLIElement>(null)
  const previous = events[index - 1]
  const previousEnd = previous ? effectiveEndTime(previous) : ''
  const gap =
    previous && event.startTime && previousEnd ? minutesBetween(previousEnd, event.startTime) : null
  const windowLabel = formatEventWindow(event)

  useEffect(() => {
    if (!selected) {
      return
    }
    rowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <li ref={rowRef}>
      {gap ? <p className="preview-gap">{formatDuration(gap)}</p> : null}
      <div
        className={['preview-event-block', selected ? 'preview-event-block--active' : null]
          .filter(Boolean)
          .join(' ')}
      >
        <button
          type="button"
          className={['preview-event', selected ? 'preview-event--active' : null]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={selected}
          onClick={() => onSelectEvent(event.id)}
        >
          <span className="preview-event__time">{windowLabel || '—'}</span>
          <span className="preview-event__index" aria-hidden="true">
            {index + 1}
          </span>
          <span className="preview-event__body">
            <span className="preview-event__title">{event.title || `Event ${index + 1}`}</span>
          </span>
        </button>
        {selected && hasExtraDetails(event) ? (
          <div className="preview-event__details">
            <EventDetails event={event} index={index + 1} showHeading={false} />
          </div>
        ) : null}
      </div>
    </li>
  )
}
