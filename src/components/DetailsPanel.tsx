import { Eye, Link2 } from 'lucide-react'
import type { To } from 'react-router-dom'
import Button from './Button'
import SaveMemoryButton from './SaveMemoryButton'
import SectionCard from './SectionCard'
import type { ItineraryState } from '../types'

type DetailsPanelProps = {
  title: string
  date: string
  notice: string
  eventCount: number
  itinerary: ItineraryState
  viewLocation: To
  onTitleChange: (value: string) => void
  onDateChange: (value: string) => void
  onCopyShareLink: () => void
  onClearPlan: () => void
  onNotice: (message: string) => void
}

export default function DetailsPanel({
  title,
  date,
  notice,
  eventCount,
  itinerary,
  viewLocation,
  onTitleChange,
  onDateChange,
  onCopyShareLink,
  onClearPlan,
  onNotice,
}: DetailsPanelProps) {
  return (
    <div className="planner-details">
      <SectionCard title="Plan" plain>
        <div className="stack">
          <div className="form-cluster">
            <label className="field">
              <span className="field__label">Title</span>
              <input
                className="input input--title"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Saturday in the city"
              />
            </label>

            <label className="field">
              <span className="field__label">Date</span>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>
          </div>

          <div className="form-cluster">
            <div className="btn-grid">
              <Button
                label="Copy link"
                icon={<Link2 size={16} />}
                variant="secondary"
                onClick={onCopyShareLink}
              />
              <Button
                label="View"
                icon={<Eye size={16} />}
                variant="ghost"
                to={viewLocation}
              />
            </div>

            <SaveMemoryButton
              itinerary={itinerary}
              onNotice={onNotice}
              variant="ghost"
              label="Download"
              block
            />

            {eventCount > 0 || title || date ? (
              <Button label="Clear plan" variant="ghost" block onClick={onClearPlan} />
            ) : null}
          </div>

          {notice ? <p className="notice">{notice}</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
