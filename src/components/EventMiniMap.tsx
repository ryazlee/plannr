import { useState } from 'react'
import ItineraryMap from './ItineraryMap'
import MapSearch from './MapSearch'
import type { Event, LatLng } from '../types'
import { pickSearchProximity } from '../utils/geocode'

type EventMiniMapProps = {
  events: Event[]
  pendingLocation?: LatLng | null
  focusedEventId: string | null
  startIndex?: number
  onMapClick?: (lat: number, lng: number) => void
  onMoveEvent?: (eventId: string, lat: number, lng: number) => void
  onSelectEvent: (eventId: string) => void
  onSearchSelect?: (lat: number, lng: number, place?: string) => void
  readOnly?: boolean
  showSearch?: boolean
}

export default function EventMiniMap({
  events,
  pendingLocation = null,
  focusedEventId,
  startIndex = 1,
  onMapClick,
  onMoveEvent,
  onSelectEvent,
  onSearchSelect,
  readOnly = false,
  showSearch = false,
}: EventMiniMapProps) {
  const [searchTarget, setSearchTarget] = useState<LatLng | null>(null)

  return (
    <div
      className="event-card__map"
      onClick={(click) => click.stopPropagation()}
      onKeyDown={(key) => key.stopPropagation()}
    >
      {showSearch ? (
        <MapSearch
          variant="inline"
          proximity={pickSearchProximity(events, pendingLocation, focusedEventId)}
          onSelect={(place) => {
            const location = { lat: place.lat, lng: place.lng }
            setSearchTarget(location)
            onSearchSelect?.(place.lat, place.lng, place.label)
          }}
        />
      ) : null}
      <div
        className={['event-card__map-canvas', readOnly ? 'map-canvas--readonly' : null]
          .filter(Boolean)
          .join(' ')}
      >
        <ItineraryMap
          events={events}
          pendingLocation={pendingLocation}
          focusedEventId={focusedEventId}
          onMapClick={onMapClick}
          onMoveEvent={onMoveEvent}
          onSelectEvent={onSelectEvent}
          searchTarget={searchTarget}
          readOnly={readOnly}
          compact
          startIndex={startIndex}
        />
      </div>
    </div>
  )
}
