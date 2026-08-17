import { Trash2 } from 'lucide-react'
import EventMiniMap from './EventMiniMap'
import MapSearch from './MapSearch'
import MapsLink from './MapsLink'
import PeopleChips from './PeopleChips'
import SectionCard from './SectionCard'
import TimeFields from './TimeFields'
import type { Event } from '../types'
import { hasLocation } from '../utils/itinerary'

type TimelinePanelProps = {
  events: Event[]
  people: string[]
  focusedEventId: string | null
  showMaps: boolean
  onUpdateEvent: (
    eventId: string,
    field: 'startTime' | 'endTime' | 'title' | 'notes' | 'link',
    value: string,
  ) => void
  onTogglePerson: (eventId: string, name: string) => void
  onToggleEveryone: (eventId: string) => void
  onRemoveEvent: (eventId: string) => void
  onSelectEvent: (eventId: string) => void
  onMoveEvent: (eventId: string, lat: number, lng: number) => void
}

export default function TimelinePanel({
  events,
  people,
  focusedEventId,
  showMaps,
  onUpdateEvent,
  onTogglePerson,
  onToggleEveryone,
  onRemoveEvent,
  onSelectEvent,
  onMoveEvent,
}: TimelinePanelProps) {
  return (
    <div className="planner-timeline">
      <SectionCard title="Timeline" plain>
        {events.length === 0 ? (
          <p className="empty-hint">Add a title to create an event. A map pin is optional.</p>
        ) : (
          <div className="stack stack--tight">
            {events.map((event, index) => {
              const selected = event.id === focusedEventId
              const located = hasLocation(event)
              const showMiniMap = showMaps && located

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
                      <div className="event-card__title-row">
                        <input
                          className="input input--on-inset input--title"
                          value={event.title}
                          onChange={(change) => onUpdateEvent(event.id, 'title', change.target.value)}
                          onFocus={() => onSelectEvent(event.id)}
                          placeholder={`Event ${index + 1}`}
                          aria-label={`Event ${index + 1} title`}
                        />
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          aria-label={`Delete event ${index + 1}`}
                          title="Delete"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            onRemoveEvent(event.id)
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <TimeFields
                        startTime={event.startTime}
                        endTime={event.endTime}
                        onStartChange={(value) => onUpdateEvent(event.id, 'startTime', value)}
                        onEndChange={(value) => onUpdateEvent(event.id, 'endTime', value)}
                        onFocus={() => onSelectEvent(event.id)}
                        inset
                      />
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
                      <PeopleChips
                        people={people}
                        assigned={event.people}
                        onTogglePerson={(name) => onTogglePerson(event.id, name)}
                        onToggleEveryone={() => onToggleEveryone(event.id)}
                      />
                      {showMiniMap ? (
                        <EventMiniMap
                          events={[event]}
                          focusedEventId={event.id}
                          startIndex={index + 1}
                          showSearch={selected}
                          onSelectEvent={onSelectEvent}
                          onMoveEvent={onMoveEvent}
                          onMapClick={(lat, lng) => {
                            onSelectEvent(event.id)
                            onMoveEvent(event.id, lat, lng)
                          }}
                          onSearchSelect={(lat, lng) => {
                            onSelectEvent(event.id)
                            onMoveEvent(event.id, lat, lng)
                          }}
                        />
                      ) : showMaps && selected && !located ? (
                        <div
                          className="event-card__pin-search"
                          onClick={(click) => click.stopPropagation()}
                        >
                          <MapSearch
                            variant="inline"
                            placeholder="Search to add a pin"
                            onSelect={(place) => {
                              onSelectEvent(event.id)
                              onMoveEvent(event.id, place.lat, place.lng)
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {located ? (
                    <p className="coords">
                      <MapsLink lat={event.lat} lng={event.lng} className="coords__link">
                        Maps
                      </MapsLink>
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
