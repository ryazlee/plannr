export type PlaceResult = {
  id: string
  label: string
  detail: string
  lat: number
  lng: number
}

type NominatimHit = {
  place_id: number
  display_name: string
  name?: string
  lat: string
  lon: string
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function splitLabel(hit: NominatimHit): { label: string; detail: string } {
  const display = hit.display_name.trim()
  const name = hit.name?.trim()

  if (name) {
    const remainder = display.startsWith(name)
      ? display.slice(name.length).replace(/^,\s*/, '')
      : display === name
        ? ''
        : display
    return { label: name, detail: remainder }
  }

  const comma = display.indexOf(',')
  if (comma === -1) {
    return { label: display, detail: '' }
  }

  return {
    label: display.slice(0, comma).trim(),
    detail: display.slice(comma + 1).trim(),
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return []
  }

  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '0')

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Place search failed')
  }

  const hits = (await response.json()) as NominatimHit[]
  return hits
    .map((hit) => {
      const lat = Number.parseFloat(hit.lat)
      const lng = Number.parseFloat(hit.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null
      }
      const { label, detail } = splitLabel(hit)
      return {
        id: String(hit.place_id),
        label,
        detail,
        lat,
        lng,
      } satisfies PlaceResult
    })
    .filter((place): place is PlaceResult => place !== null)
}
