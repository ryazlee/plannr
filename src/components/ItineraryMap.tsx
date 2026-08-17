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
const ROUTE_STYLE = {
  light: { line: '#111827', halo: '#ffffff' },
  dark: { line: '#f3f4f6', halo: '#111827' },
} as const

type MapPoint = [number, number]

function segmentBearing(from: MapPoint, to: MapPoint): number {
  const fromLat = (from[0] * Math.PI) / 180
  const toLat = (to[0] * Math.PI) / 180
  const deltaLng = ((to[1] - from[1]) * Math.PI) / 180
  const y = Math.sin(deltaLng) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

function interpolate(from: MapPoint, to: MapPoint, t: number): MapPoint {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
}

function isSamePoint(from: MapPoint, to: MapPoint): boolean {
  const dLat = to[0] - from[0]
  const dLng = to[1] - from[1]
  return dLat * dLat + dLng * dLng < 1e-12
}

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

function markerIcon(index: number, pending = false, focused = false) {
  if (pending) {
    return divIcon({
      className: 'event-marker-wrap',
      html: '<div class="event-marker event-marker--pending">+</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    })
  }

  const focusedClass = focused ? ' event-marker--focused' : ''
  return divIcon({
    className: 'event-marker-wrap',
    html: `<div class="event-marker${focusedClass}"><span class="event-marker__badge">${index}</span></div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  })
}

function arrowIcon(bearing: number) {
  return divIcon({
    className: 'route-arrow-wrap',
    html: `<div class="route-arrow" style="transform:rotate(${bearing}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2 21.2 20.8 12 16.2 2.8 20.8Z"/></svg></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function RoutePath({ positions, theme }: { positions: MapPoint[]; theme: 'light' | 'dark' }) {
  const colors = ROUTE_STYLE[theme]
  const arrows = useMemo(() => {
    const next: { position: MapPoint; bearing: number }[] = []
    for (let i = 0; i < positions.length - 1; i += 1) {
      const from = positions[i]
      const to = positions[i + 1]
      if (isSamePoint(from, to)) {
        continue
      }
      const bearing = segmentBearing(from, to)
      const dLat = to[0] - from[0]
      const dLng = to[1] - from[1]
      const longHop = dLat * dLat + dLng * dLng > 0.0002
      if (longHop) {
        next.push({
          position: interpolate(from, to, 0.34),
          bearing,
        })
      }
      next.push({
        position: interpolate(from, to, longHop ? 0.72 : 0.62),
        bearing,
      })
    }
    return next
  }, [positions])

  const lineOptions = {
    lineCap: 'round' as const,
    lineJoin: 'round' as const,
  }

  return (
    <>
      <Polyline
        positions={positions}
        interactive={false}
        pathOptions={{
          ...lineOptions,
          color: colors.halo,
          weight: 10,
          opacity: 0.9,
        }}
      />
      <Polyline
        positions={positions}
        interactive={false}
        pathOptions={{
          ...lineOptions,
          color: colors.line,
          weight: 4,
          opacity: 0.95,
        }}
      />
      {arrows.map((arrow) => (
        <Marker
          key={`${arrow.position[0]},${arrow.position[1]},${arrow.bearing}`}
          position={arrow.position}
          icon={arrowIcon(arrow.bearing)}
          interactive={false}
          keyboard={false}
          zIndexOffset={-600}
        />
      ))}
    </>
  )
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
    const later = window.setTimeout(() => {
      map.invalidateSize()
    }, 180)

    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
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
        <RoutePath positions={linePositions} theme={theme} />
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
          icon={markerIcon(startIndex + index, false, event.id === focusedEventId)}
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
