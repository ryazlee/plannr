import { Trash2 } from 'lucide-react'
import Button from './Button'
import SectionCard from './SectionCard'
import type { Event } from '../types'

type TimelinePanelProps = {
  events: Event[]
  people: string[]
  focusedEventId: string | null
  onUpdateEvent: (
    eventId: string,
    field: 'startTime' | 'endTime' | 'title' | 'notes' | 'link',
    value: string,
  ) => void
  onTogglePerson: (eventId: string, name: string) => void
  onToggleEveryone: (eventId: string) => void
  onRemoveEvent: (eventId: string) => void
  onSelectEvent: (eventId: string) => void
}

export default function TimelinePanel({
  events,
  people,
  focusedEventId,
  onUpdateEvent,
  onTogglePerson,
  onToggleEveryone,
  onRemoveEvent,
  onSelectEvent,
}: TimelinePanelProps) {
  return (
    <div className="planner-timeline">
      <SectionCard
        title="Timeline"
        subtitle={
          events.length === 0
            ? 'Events show up here in chronological order.'
            : `${events.length} event${events.length === 1 ? '' : 's'}`
        }
      >
        {events.length === 0 ? (
          <p className="empty-hint">Name an event, then click the map or search to pin it.</p>
        ) : (
          <div className="stack stack--tight">
            {events.map((event, index) => {
              const selected = event.id === focusedEventId
              const allAssigned =
                people.length > 0 && people.every((person) => event.people.includes(person))

              return (
                <article
                  key={event.id}
                  className={[
                    'inset-block event-card',
                    selected ? 'event-card--selected' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <div className="event-card__top">
                    <span className="event-card__index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="event-card__fields">
                      <input
                        className="input input--on-inset input--title"
                        value={event.title}
                        onChange={(change) => onUpdateEvent(event.id, 'title', change.target.value)}
                        onFocus={() => onSelectEvent(event.id)}
                        placeholder={`Event ${index + 1}`}
                        aria-label={`Event ${index + 1} title`}
                      />
                      <div className="time-window">
                        <input
                          className="input input--on-inset input--time"
                          type="time"
                          value={event.startTime}
                          onChange={(change) =>
                            onUpdateEvent(event.id, 'startTime', change.target.value)
                          }
                          aria-label={`Event ${index + 1} start`}
                        />
                        <span className="time-window__sep" aria-hidden="true">
                          –
                        </span>
                        <input
                          className="input input--on-inset input--time"
                          type="time"
                          value={event.endTime}
                          onChange={(change) =>
                            onUpdateEvent(event.id, 'endTime', change.target.value)
                          }
                          aria-label={`Event ${index + 1} end`}
                        />
                      </div>
                      <textarea
                        className="input input--on-inset input--notes"
                        value={event.notes}
                        onChange={(change) => onUpdateEvent(event.id, 'notes', change.target.value)}
                        onFocus={() => onSelectEvent(event.id)}
                        placeholder="Notes"
                        aria-label={`Event ${index + 1} notes`}
                        rows={2}
                      />
                      <input
                        className="input input--on-inset"
                        type="text"
                        inputMode="url"
                        value={event.link}
                        onChange={(change) => onUpdateEvent(event.id, 'link', change.target.value)}
                        onFocus={() => onSelectEvent(event.id)}
                        placeholder="Link (optional)"
                        aria-label={`Event ${index + 1} link`}
                      />
                      {people.length > 0 ? (
                        <div className="chip-row" onClick={(click) => click.stopPropagation()}>
                          <button
                            type="button"
                            className={['chip', allAssigned ? 'chip--active' : null]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => onToggleEveryone(event.id)}
                          >
                            Everyone
                          </button>
                          {people.map((person) => {
                            const assigned = event.people.includes(person)
                            return (
                              <button
                                key={person}
                                type="button"
                                className={['chip', assigned ? 'chip--active' : null]
                                  .filter(Boolean)
                                  .join(' ')}
                                onClick={() => onTogglePerson(event.id, person)}
                              >
                                {person}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                      <Button
                        label="Delete"
                        icon={<Trash2 size={14} />}
                        variant="danger"
                        size="sm"
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          onRemoveEvent(event.id)
                        }}
                      />
                    </div>
                  </div>
                  <p className="coords">
                    {selected
                      ? 'Selected · drag the pin, or click / search the map to move it · '
                      : ''}
                    {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                  </p>
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
