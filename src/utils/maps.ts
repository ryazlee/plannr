export function prefersAppleMaps(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
}

export function mapsHref(lat: number, lng: number): string {
  if (prefersAppleMaps()) {
    return `https://maps.apple.com/?daddr=${lat},${lng}`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
}
