import { MapPin } from 'lucide-react'
import PeopleChips from './PeopleChips'
import Button from './Button'
import EventMiniMap from './EventMiniMap'
import SectionCard from './SectionCard'
import TimeFields from './TimeFields'
import type { LatLng } from '../types'

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
  onToggleEveryone: () => void
  onAddEvent: () => void
  onPrepareNew?: () => void
  onPlacePin: (lat: number, lng: number) => void
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
  onToggleEveryone,
  onAddEvent,
  onPrepareNew,
  onPlacePin,
}: AddEventPanelProps) {
  return (
    <div className="planner-add">
      <SectionCard title="New event" plain>
        <div className="stack">
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
            <input
              className="input"
              type="text"
              inputMode="url"
              value={link}
              onChange={(event) => onLinkChange(event.target.value)}
              onFocus={onPrepareNew}
              placeholder="opentable.com/… (optional)"
            />
          </label>

          <PeopleChips
            people={people}
            assigned={assigned}
            onTogglePerson={onTogglePerson}
            onToggleEveryone={onToggleEveryone}
          />

          {showMap ? (
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
              onSearchSelect={(lat, lng) => {
                onPrepareNew?.()
                onPlacePin(lat, lng)
              }}
            />
          ) : null}

          <Button
            label="Add event"
            icon={<MapPin size={16} />}
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
