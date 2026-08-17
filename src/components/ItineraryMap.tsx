import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, latLngBounds, type Marker as LeafletMarker } from 'leaflet'
import type { Event, LatLng } from '../types'
import { hasLocation } from '../utils/itinerary'
import { useTheme } from '../theme'
import EventDetails from './EventDetails'

const FALLBACK_CENTER: [number, number] = [37.7749, -122.4194]
const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_ATTR = '&copy; OpenStreetMap'
const DARK_ATTR = '&copy; OpenStreetMap &copy; CARTO'

type ItineraryMapProps = {
  events: Event[]
  people?: string[]
  pendingLocation?: LatLng | null
  focusedEventId: string | null
  onMapClick?: (lat: number, lng: number) => void
  onMoveEvent?: (eventId: string, lat: number, lng: number) => void
  onSelectEvent: (eventId: string) => void
  readOnly?: boolean
  searchTarget?: LatLng | null
  compact?: boolean
  startIndex?: number
}

function markerIcon(index: number, pending = false) {
  return divIcon({
    className: 'event-marker-wrap',
    html: `<div class="event-marker${pending ? ' event-marker--pending' : ''}">${pending ? '+' : index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function FitToEvents({
  events,
  pendingLocation,
  compact,
}: {
  events: Event[]
  pendingLocation: LatLng | null
  compact: boolean
}) {
  const map = useMap()
  const located = events.filter(hasLocation)
  const pendingKey = pendingLocation ? `${pendingLocation.lat},${pendingLocation.lng}` : ''
  const singleZoom = compact ? 15 : 14

  useEffect(() => {
    if (located.length > 1) {
      const bounds = latLngBounds(located.map((event) => [event.lat, event.lng] as [number, number]))
      map.fitBounds(bounds, { padding: compact ? [20, 20] : [36, 36], maxZoom: 15 })
      return
    }

    const only = located[0]
    if (only) {
      map.setView([only.lat, only.lng], singleZoom)
    }
  }, [map, located.length, compact, singleZoom])

  useEffect(() => {
    if (located.length > 0 || !pendingLocation) {
      return
    }
    map.setView([pendingLocation.lat, pendingLocation.lng], 14)
  }, [map, pendingKey, pendingLocation, located.length])

  return null
}

function FlyToSearch({ target }: { target: LatLng | null }) {
  const map = useMap()
  const lat = target?.lat
  const lng = target?.lng

  useEffect(() => {
    if (lat == null || lng == null) {
      return
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.45 })
  }, [lat, lng, map])

  return null
}

function FlyToFocused({ event }: { event: Event | undefined }) {
  const map = useMap()
  const eventId = event?.id
  const lat = event?.lat
  const lng = event?.lng

  useEffect(() => {
    if (eventId == null || lat == null || lng == null) {
      return
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.35 })
  }, [eventId, lat, lng, map])

  return null
}

function InvalidateOnResize() {
  const map = useMap()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      map.invalidateSize()
    })

    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [map])

  return null
}

function UserLocation({ enabled }: { enabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 13)
      },
      () => {},
      { maximumAge: 60_000, timeout: 4000 },
    )
  }, [enabled, map])

  return null
}

export default function ItineraryMap({
  events,
  people = [],
  pendingLocation = null,
  focusedEventId,
  onMapClick,
  onMoveEvent,
  onSelectEvent,
  readOnly = false,
  searchTarget = null,
  compact = false,
  startIndex = 1,
}: ItineraryMapProps) {
  const { theme } = useTheme()
  const markerRefs = useRef<Map<string, LeafletMarker>>(new Map())
  const focusedEvent = events.find((event) => event.id === focusedEventId)
  const locatedEvents = useMemo(() => events.filter(hasLocation), [events])
  const linePositions = useMemo(
    () => locatedEvents.map((event) => [event.lat, event.lng] as [number, number]),
    [locatedEvents],
  )
  const startCenter: [number, number] = locatedEvents[0]
    ? [locatedEvents[0].lat, locatedEvents[0].lng]
    : pendingLocation
      ? [pendingLocation.lat, pendingLocation.lng]
      : FALLBACK_CENTER

  useEffect(() => {
    if (!readOnly || compact || !focusedEventId) {
      return
    }
    markerRefs.current.get(focusedEventId)?.openPopup()
  }, [readOnly, compact, focusedEventId])

  return (
    <MapContainer
      center={startCenter}
      zoom={locatedEvents.length > 0 ? (compact ? 15 : 13) : 12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={theme === 'dark' ? DARK_TILES : LIGHT_TILES}
        attribution={theme === 'dark' ? DARK_ATTR : LIGHT_ATTR}
      />
      {readOnly || !onMapClick ? null : <MapClickHandler onMapClick={onMapClick} />}
      <FitToEvents events={events} pendingLocation={pendingLocation} compact={compact} />
      {compact ? null : <FlyToFocused event={focusedEvent} />}
      <FlyToSearch target={searchTarget} />
      <InvalidateOnResize />
      {readOnly ? null : <UserLocation enabled={locatedEvents.length === 0 && !pendingLocation} />}

      {compact || linePositions.length < 2 ? null : (
        <Polyline
          positions={linePositions}
          pathOptions={{
            color: theme === 'dark' ? '#f3f4f6' : '#111827',
            weight: 3,
            opacity: 0.7,
          }}
        />
      )}

      {events.map((event, index) => {
        if (!hasLocation(event)) {
          return null
        }

        return (
        <Marker
          key={event.id}
          ref={(marker) => {
            if (marker) {
              markerRefs.current.set(event.id, marker)
            } else {
              markerRefs.current.delete(event.id)
            }
          }}
          position={[event.lat, event.lng]}
          icon={markerIcon(startIndex + index)}
          draggable={!readOnly}
          eventHandlers={{
            click: () => onSelectEvent(event.id),
            dragend: (markerEvent) => {
              const next = markerEvent.target.getLatLng()
              onMoveEvent?.(event.id, next.lat, next.lng)
            },
          }}
        >
          {compact ? null : (
            <Popup>
              <EventDetails event={event} index={startIndex + index} allPeople={people} />
            </Popup>
          )}
        </Marker>
        )
      })}

      {pendingLocation ? (
        <Marker
          position={[pendingLocation.lat, pendingLocation.lng]}
          icon={markerIcon(startIndex + events.length, true)}
          draggable={!readOnly && Boolean(onMapClick)}
          eventHandlers={
            readOnly || !onMapClick
              ? undefined
              : {
                  dragend: (markerEvent) => {
                    const next = markerEvent.target.getLatLng()
                    onMapClick(next.lat, next.lng)
                  },
                }
          }
        />
      ) : null}
    </MapContainer>
  )
}
