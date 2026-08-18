import { ExternalLink, Plus } from 'lucide-react'
import PeopleChips from './PeopleChips'
import Button from './Button'
import EventMiniMap from './EventMiniMap'
import SectionCard from './SectionCard'
import TimeFields from './TimeFields'
import type { LatLng } from '../types'
import { hrefFromLink } from '../utils/itinerary'

type AddEventPanelProps = {
  startTime: string
  endTime: string
  title: string
  notes: string
  link: string
  people: string[]
  assigned: string[]
  pendingLocation: LatLng | null
  showMap: boolean
  nextIndex: number
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onTitleChange: (value: string) => void
  onNotesChange: (value: string) => void
  onLinkChange: (value: string) => void
  onTogglePerson: (name: string) => void
  onAddEvent: () => void
  onPrepareNew?: () => void
  onPlacePin: (lat: number, lng: number, place?: string) => void
}

export default function AddEventPanel({
  startTime,
  endTime,
  title,
  notes,
  link,
  people,
  assigned,
  pendingLocation,
  showMap,
  nextIndex,
  onStartTimeChange,
  onEndTimeChange,
  onTitleChange,
  onNotesChange,
  onLinkChange,
  onTogglePerson,
  onAddEvent,
  onPrepareNew,
  onPlacePin,
}: AddEventPanelProps) {
  const linkHref = hrefFromLink(link)

  return (
    <div className="planner-add">
      <SectionCard title="New event" plain>
        <div className="stack">
          <div className="form-cluster">
            <label className="field">
              <span className="field__label">Title</span>
              <input
                className="input"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                onFocus={onPrepareNew}
                placeholder="Coffee, walk, dinner…"
              />
            </label>

            <TimeFields
              startTime={startTime}
              endTime={endTime}
              onStartChange={onStartTimeChange}
              onEndChange={onEndTimeChange}
              onFocus={onPrepareNew}
            />
          </div>

          <div className="form-cluster">
            <label className="field">
              <span className="field__label">Notes</span>
              <textarea
                className="input input--notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                onFocus={onPrepareNew}
                placeholder="Reservation, dress code, what to order…"
                rows={2}
              />
            </label>

            <label className="field">
              <span className="field__label">Link</span>
              <div className="input-with-action">
                <input
                  className="input"
                  type="text"
                  inputMode="url"
                  value={link}
                  onChange={(event) => onLinkChange(event.target.value)}
                  onFocus={onPrepareNew}
                  placeholder="opentable.com/…"
                />
                {linkHref ? (
                  <a
                    className="icon-btn icon-btn--link"
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open link"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </label>
          </div>

          {people.length > 0 ? (
            <div className="form-cluster">
              <PeopleChips
                people={people}
                assigned={assigned}
                onTogglePerson={onTogglePerson}
              />
            </div>
          ) : null}

          {showMap ? (
            <div className="form-cluster">
              <EventMiniMap
                events={[]}
                pendingLocation={pendingLocation}
                focusedEventId={null}
                startIndex={nextIndex}
                showSearch
                onSelectEvent={() => onPrepareNew?.()}
                onMapClick={(lat, lng) => {
                  onPrepareNew?.()
                  onPlacePin(lat, lng)
                }}
                onSearchSelect={(lat, lng, place) => {
                  onPrepareNew?.()
                  onPlacePin(lat, lng, place)
                }}
              />
            </div>
          ) : null}

          <Button
            label="Add event"
            icon={<Plus size={16} />}
            variant={title.trim() ? 'primary' : 'secondary'}
            block
            onClick={onAddEvent}
            disabled={!title.trim()}
          />
        </div>
      </SectionCard>
    </div>
  )
}
