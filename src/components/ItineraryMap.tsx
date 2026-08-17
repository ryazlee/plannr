import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import type { Event, LatLng } from '../types'
import { formatEventWindow, hrefFromLink, linkLabel } from '../utils/itinerary'
import { useTheme } from '../theme'

const FALLBACK_CENTER: [number, number] = [37.7749, -122.4194]
const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_ATTR = '&copy; OpenStreetMap'
const DARK_ATTR = '&copy; OpenStreetMap &copy; CARTO'

type ItineraryMapProps = {
  events: Event[]
  pendingLocation?: LatLng | null
  focusedEventId: string | null
  onMapClick?: (lat: number, lng: number) => void
  onMoveEvent?: (eventId: string, lat: number, lng: number) => void
  onSelectEvent: (eventId: string) => void
  readOnly?: boolean
  searchTarget?: LatLng | null
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
}: {
  events: Event[]
  pendingLocation: LatLng | null
}) {
  const map = useMap()
  const pendingKey = pendingLocation ? `${pendingLocation.lat},${pendingLocation.lng}` : ''

  useEffect(() => {
    if (events.length > 1) {
      const bounds = latLngBounds(events.map((event) => [event.lat, event.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 })
      return
    }

    const only = events[0]
    if (only) {
      map.setView([only.lat, only.lng], 14)
    }
  }, [map, events.length])

  useEffect(() => {
    if (events.length > 0 || !pendingLocation) {
      return
    }
    map.setView([pendingLocation.lat, pendingLocation.lng], 14)
  }, [map, pendingKey, pendingLocation, events.length])

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
  pendingLocation = null,
  focusedEventId,
  onMapClick,
  onMoveEvent,
  onSelectEvent,
  readOnly = false,
  searchTarget = null,
}: ItineraryMapProps) {
  const { theme } = useTheme()
  const focusedEvent = events.find((event) => event.id === focusedEventId)
  const linePositions = useMemo(
    () => events.map((event) => [event.lat, event.lng] as [number, number]),
    [events],
  )
  const startCenter: [number, number] = events[0]
    ? [events[0].lat, events[0].lng]
    : pendingLocation
      ? [pendingLocation.lat, pendingLocation.lng]
      : FALLBACK_CENTER

  return (
    <MapContainer
      center={startCenter}
      zoom={events.length > 0 ? 13 : 12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url={theme === 'dark' ? DARK_TILES : LIGHT_TILES}
        attribution={theme === 'dark' ? DARK_ATTR : LIGHT_ATTR}
      />
      {readOnly || !onMapClick ? null : <MapClickHandler onMapClick={onMapClick} />}
      <FitToEvents events={events} pendingLocation={pendingLocation} />
      <FlyToFocused event={focusedEvent} />
      <FlyToSearch target={searchTarget} />
      <InvalidateOnResize />
      {readOnly ? null : <UserLocation enabled={events.length === 0 && !pendingLocation} />}

      {linePositions.length > 1 ? (
        <Polyline
          positions={linePositions}
          pathOptions={{
            color: theme === 'dark' ? '#f3f4f6' : '#111827',
            weight: 3,
            opacity: 0.7,
          }}
        />
      ) : null}

      {events.map((event, index) => (
        <Marker
          key={event.id}
          position={[event.lat, event.lng]}
          icon={markerIcon(index + 1)}
          draggable={!readOnly}
          eventHandlers={{
            click: () => onSelectEvent(event.id),
            dragend: (markerEvent) => {
              const next = markerEvent.target.getLatLng()
              onMoveEvent?.(event.id, next.lat, next.lng)
            },
          }}
        >
          <Popup>
            <strong>{event.title || `Event ${index + 1}`}</strong>
            {formatEventWindow(event) ? <div>{formatEventWindow(event)}</div> : null}
            {event.notes.trim() ? <div>{event.notes}</div> : null}
            {hrefFromLink(event.link) ? (
              <div>
                <a
                  href={hrefFromLink(event.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkLabel(event.link)}
                </a>
              </div>
            ) : null}
          </Popup>
        </Marker>
      ))}

      {pendingLocation ? (
        <Marker
          position={[pendingLocation.lat, pendingLocation.lng]}
          icon={markerIcon(events.length + 1, true)}
        />
      ) : null}
    </MapContainer>
  )
}
