import { forwardRef } from 'react'
import ItineraryMap from './ItineraryMap'
import MakerCredit from './MakerCredit'
import PreviewTimeline from './PreviewTimeline'
import type { ItineraryState } from '../types'
import { formatDisplayDate, formatTimeRange, hasLocation } from '../utils/itinerary'
import {
  MEMORY_MAP_CREDIT,
  MEMORY_SITE_LABEL,
} from '../utils/memoryImage'

type MemoryCardProps = {
  itinerary: ItineraryState
  includeMap: boolean
}

const MemoryCard = forwardRef<HTMLDivElement, MemoryCardProps>(function MemoryCard(
  { itinerary, includeMap },
  ref,
) {
  const located = itinerary.events.some(hasLocation)
  const showMap = includeMap && located
  const timeRange = formatTimeRange(itinerary.events)
  const eventLabel =
    itinerary.events.length === 0
      ? null
      : `${itinerary.events.length} event${itinerary.events.length === 1 ? '' : 's'}`
  const peopleLabel =
    itinerary.people.length === 0
      ? null
      : `${itinerary.people.length} ${itinerary.people.length === 1 ? 'person' : 'people'}`
  const subtitle = [formatDisplayDate(itinerary.date), timeRange, eventLabel, peopleLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={ref} className="memory-card">
      <header className="memory-card__hero">
        <h2 className="preview-title">{itinerary.title.trim() || 'Untitled plan'}</h2>
        {subtitle ? <p className="preview-meta">{subtitle}</p> : null}
      </header>

      {showMap ? (
        <div className="memory-card__map">
          <ItineraryMap
            events={itinerary.events}
            people={itinerary.people}
            focusedEventId={null}
            onSelectEvent={() => {}}
            readOnly
            staticMap
          />
        </div>
      ) : null}

      <div className="preview-timeline memory-card__timeline">
        <PreviewTimeline
          events={itinerary.events}
          people={itinerary.people}
          focusedEventId={null}
          onSelectEvent={() => {}}
          staticMode
        />
      </div>

      <footer className="memory-card__credit">
        <MakerCredit />
        <p className="memory-card__credit-url">{MEMORY_SITE_LABEL}</p>
        {showMap ? <p className="memory-card__credit-map">{MEMORY_MAP_CREDIT}</p> : null}
      </footer>
    </div>
  )
})

export default MemoryCard
