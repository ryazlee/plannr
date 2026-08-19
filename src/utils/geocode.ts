import type { Event, LatLng } from '../types'
import { hasLocation } from './itinerary'

export type PlaceResult = {
  id: string
  label: string
  detail: string
  lat: number
  lng: number
}

export type SearchProximity = {
  lat: number
  lng: number
}

type PhotonProperties = {
  name?: string
  street?: string
  housenumber?: string
  city?: string
  town?: string
  village?: string
  district?: string
  county?: string
  state?: string
  country?: string
  osm_type?: string
  osm_id?: number
}

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: PhotonProperties
}

type PhotonResponse = {
  features?: PhotonFeature[]
}

const SEARCH_URL = 'https://photon.komoot.io/api'
const REVERSE_URL = 'https://photon.komoot.io/reverse'
const reverseCache = new Map<string, string>()

function locality(properties: PhotonProperties): string {
  return [properties.city, properties.town, properties.village, properties.district].find(
    (value) => value?.trim(),
  ) ?? ''
}

function splitLabel(properties: PhotonProperties): { label: string; detail: string } {
  const street = [properties.housenumber, properties.street].filter(Boolean).join(' ').trim()
  const place = locality(properties)
  const label =
    properties.name?.trim() || street || place || properties.state?.trim() || properties.country?.trim() || 'Place'
  const detail = [
    properties.name && street ? street : null,
    place,
    properties.state,
    properties.country,
  ]
    .filter((part): part is string => Boolean(part && part !== label))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ')

  return { label, detail }
}

function featureToPlace(feature: PhotonFeature): PlaceResult | null {
  const coordinates = feature.geometry?.coordinates
  const lng = coordinates?.[0]
  const lat = coordinates?.[1]
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  const properties = feature.properties ?? {}
  const { label, detail } = splitLabel(properties)
  const id = [properties.osm_type, properties.osm_id, lat, lng].filter(Boolean).join(':')

  return {
    id: id || `${lat},${lng}`,
    label,
    detail,
    lat,
    lng,
  }
}

async function photonRequest(url: URL, signal?: AbortSignal): Promise<PhotonFeature[]> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Place search failed')
  }

  const payload = (await response.json()) as PhotonResponse
  return payload.features ?? []
}

export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
  proximity?: SearchProximity | null,
): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const url = new URL(SEARCH_URL)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('limit', '8')
  if (proximity) {
    url.searchParams.set('lat', String(proximity.lat))
    url.searchParams.set('lon', String(proximity.lng))
    url.searchParams.set('zoom', '14')
    url.searchParams.set('location_bias_scale', '0.2')
  }

  const features = await photonRequest(url, signal)
  const seen = new Set<string>()
  const places: PlaceResult[] = []

  for (const feature of features) {
    const place = featureToPlace(feature)
    if (!place || seen.has(place.id)) {
      continue
    }
    seen.add(place.id)
    places.push(place)
  }

  return places
}

export function pickSearchProximity(
  events: Event[],
  pending?: LatLng | null,
  focusedEventId?: string | null,
): SearchProximity | null {
  const focused = events.find((event) => event.id === focusedEventId)
  if (focused && hasLocation(focused)) {
    return { lat: focused.lat, lng: focused.lng }
  }

  if (pending) {
    return { lat: pending.lat, lng: pending.lng }
  }

  const located = events.find(hasLocation)
  return located ? { lat: located.lat, lng: located.lng } : null
}

function reverseCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string> {
  const key = reverseCacheKey(lat, lng)
  const cached = reverseCache.get(key)
  if (cached != null) {
    return cached
  }

  const url = new URL(REVERSE_URL)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('limit', '1')

  const features = await photonRequest(url, signal)
  const place = features[0] ? featureToPlace(features[0]) : null
  const label = place?.label ?? ''
  reverseCache.set(key, label)
  return label
}
