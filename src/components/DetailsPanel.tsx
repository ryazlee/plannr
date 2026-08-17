import { Eye, Link2 } from 'lucide-react'
import type { To } from 'react-router-dom'
import Button from './Button'
import SectionCard from './SectionCard'

type DetailsPanelProps = {
  title: string
  date: string
  notice: string
  eventCount: number
  viewLocation: To
  onTitleChange: (value: string) => void
  onDateChange: (value: string) => void
  onCopyShareLink: () => void
  onClearPlan: () => void
}

export default function DetailsPanel({
  title,
  date,
  notice,
  eventCount,
  viewLocation,
  onTitleChange,
  onDateChange,
  onCopyShareLink,
  onClearPlan,
}: DetailsPanelProps) {
  return (
    <div className="planner-details">
      <SectionCard title="Plan" plain>
        <div className="stack">
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

          {eventCount > 0 || title || date ? (
            <Button label="Clear plan" variant="ghost" block onClick={onClearPlan} />
          ) : null}

          {notice ? <p className="notice">{notice}</p> : null}
        </div>
      </SectionCard>
    </div>
  )
}
