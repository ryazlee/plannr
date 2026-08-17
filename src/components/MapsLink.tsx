import type { ReactNode } from 'react'
import { mapsHref } from '../utils/maps'

type MapsLinkProps = {
  lat: number
  lng: number
  className?: string
  children: ReactNode
}

export default function MapsLink({ lat, lng, className, children }: MapsLinkProps) {
  return (
    <a
      className={className}
      href={mapsHref(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in Maps"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  )
}
