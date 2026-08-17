import { formatDuration, formatEventWindow, hrefFromLink, linkLabel, minutesBetween } from '../utils/itinerary'
import type { Event } from '../types'

type PreviewTimelineProps = {
  events: Event[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
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
      {events.map((event, index) => {
        const previous = events[index - 1]
        const previousEnd = previous ? previous.endTime || previous.startTime : ''
        const gap =
          previous && event.startTime && previousEnd
            ? minutesBetween(previousEnd, event.startTime)
            : null
        const windowLabel = formatEventWindow(event)
        const href = hrefFromLink(event.link)

        return (
          <li key={event.id}>
            {gap ? <p className="preview-gap">{formatDuration(gap)}</p> : null}
            <button
              type="button"
              className={[
                'preview-event',
                event.id === focusedEventId ? 'preview-event--active' : null,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectEvent(event.id)}
            >
              <span className="preview-event__time">
                {windowLabel || '—'}
              </span>
              <span className="preview-event__index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="preview-event__body">
                <span className="preview-event__title">
                  {event.title || `Event ${index + 1}`}
                </span>
                {event.notes.trim() ? (
                  <span className="preview-event__notes">{event.notes}</span>
                ) : null}
                {event.people.length > 0 ? (
                  <span className="chip-row preview-event__people">
                    {event.people.map((person) => (
                      <span key={person} className="chip chip--muted">
                        {person}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </button>
            {href ? (
              <a
                className="preview-event__link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkLabel(event.link)}
              </a>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
