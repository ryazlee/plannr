import { useEffect, useRef } from 'react'
import EventDetails from './EventDetails'
import {
  effectiveEndTime,
  formatDuration,
  formatEventDuration,
  formatTime,
  minutesBetween,
} from '../utils/itinerary'
import type { Event } from '../types'

type PreviewTimelineProps = {
  events: Event[]
  people: string[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

export default function PreviewTimeline({
  events,
  people,
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
          people={people}
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
  people,
  selected,
  onSelectEvent,
}: {
  event: Event
  index: number
  events: Event[]
  people: string[]
  selected: boolean
  onSelectEvent: (eventId: string) => void
}) {
  const rowRef = useRef<HTMLLIElement>(null)
  const previous = events[index - 1]
  const previousEnd = previous ? effectiveEndTime(previous) : ''
  const gap =
    previous && event.startTime && previousEnd ? minutesBetween(previousEnd, event.startTime) : null
  const startLabel = formatTime(event.startTime)
  const endLabel = event.startTime ? formatTime(effectiveEndTime(event)) : formatTime(event.endTime)
  const durationLabel = formatEventDuration(event)
  const showEnd = Boolean(endLabel && endLabel !== startLabel)

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
          aria-pressed={selected}
          onClick={() => onSelectEvent(event.id)}
        >
          <span className="preview-event__when">
            <span className="preview-event__start">{startLabel || '—'}</span>
            {showEnd ? <span className="preview-event__end">{endLabel}</span> : null}
            {durationLabel ? <span className="preview-event__duration">{durationLabel}</span> : null}
          </span>
          <span className="preview-event__index" aria-hidden="true">
            {index + 1}
          </span>
          <span className="preview-event__body">
            <span className="preview-event__title">{event.title || `Event ${index + 1}`}</span>
          </span>
        </button>
        <div
          className="preview-event__details"
          onClick={() => {
            if (!selected) {
              onSelectEvent(event.id)
            }
          }}
        >
          <EventDetails event={event} index={index + 1} showHeading={false} allPeople={people} />
        </div>
      </div>
    </li>
  )
}
