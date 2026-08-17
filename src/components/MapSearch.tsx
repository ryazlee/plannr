import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { searchPlaces, type PlaceResult } from '../utils/geocode'

type MapSearchProps = {
  onSelect: (place: PlaceResult) => void
}

export default function MapSearch({ onSelect }: MapSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      abortRef.current?.abort()
      setResults([])
      setStatus('')
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus('Searching…')

      try {
        const places = await searchPlaces(trimmed, controller.signal)
        setResults(places)
        setOpen(true)
        setStatus(places.length === 0 ? 'No places found' : '')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setResults([])
        setStatus('Search failed')
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function choose(place: PlaceResult) {
    onSelect(place)
    setQuery(place.label)
    setResults([])
    setOpen(false)
    setStatus('')
  }

  return (
    <div className="map-search">
      <label className="map-search__field">
        <Search size={16} aria-hidden="true" />
        <input
          className="map-search__input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) {
              setOpen(true)
            }
          }}
          placeholder="Search a place"
          aria-label="Search a place"
          aria-controls={listId}
          autoComplete="off"
        />
      </label>

      {open && (results.length > 0 || status) ? (
        <div className="map-search__menu" id={listId} role="listbox">
          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              className="map-search__option"
              role="option"
              onClick={() => choose(place)}
            >
              {place.label}
            </button>
          ))}
          {status ? <p className="map-search__status">{status}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
