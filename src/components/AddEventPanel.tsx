import { MapPin } from 'lucide-react'
import Button from './Button'
import SectionCard from './SectionCard'
import type { LatLng } from '../types'

type AddEventPanelProps = {
  startTime: string
  endTime: string
  title: string
  notes: string
  link: string
  pendingLocation: LatLng | null
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onTitleChange: (value: string) => void
  onNotesChange: (value: string) => void
  onLinkChange: (value: string) => void
  onAddEvent: () => void
  onPrepareNew?: () => void
}

export default function AddEventPanel({
  startTime,
  endTime,
  title,
  notes,
  link,
  pendingLocation,
  onStartTimeChange,
  onEndTimeChange,
  onTitleChange,
  onNotesChange,
  onLinkChange,
  onAddEvent,
  onPrepareNew,
}: AddEventPanelProps) {
  const coords = pendingLocation
    ? `${pendingLocation.lat.toFixed(4)}, ${pendingLocation.lng.toFixed(4)}`
    : 'Click the map or search to drop a pin'

  return (
    <div className="planner-add">
      <SectionCard title="New event" subtitle={coords}>
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

          <div className="time-window">
            <label className="field">
              <span className="field__label">Start</span>
              <input
                className="input input--time"
                type="time"
                value={startTime}
                onChange={(event) => onStartTimeChange(event.target.value)}
                onFocus={onPrepareNew}
              />
            </label>
            <span className="time-window__sep" aria-hidden="true">
              –
            </span>
            <label className="field">
              <span className="field__label">End</span>
              <input
                className="input input--time"
                type="time"
                value={endTime}
                onChange={(event) => onEndTimeChange(event.target.value)}
                onFocus={onPrepareNew}
              />
            </label>
          </div>

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

          <Button
            label={pendingLocation ? 'Add event' : 'Place on map first'}
            icon={<MapPin size={16} />}
            variant={pendingLocation ? 'primary' : 'secondary'}
            block
            onClick={onAddEvent}
            disabled={!title.trim() || !pendingLocation}
          />
        </div>
      </SectionCard>
    </div>
  )
}
