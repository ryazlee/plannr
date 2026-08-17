import { Navigation } from 'lucide-react'
import { mapsHref } from '../utils/maps'

type MapsLinkProps = {
  lat: number
  lng: number
  className?: string
}

export default function MapsLink({ lat, lng, className }: MapsLinkProps) {
  return (
    <a
      className={['btn', 'btn--secondary', 'btn--sm', 'directions-btn', className]
        .filter(Boolean)
        .join(' ')}
      href={mapsHref(lat, lng)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get directions"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="btn__icon">
        <Navigation size={16} aria-hidden="true" />
      </span>
      Directions
    </a>
  )
}
