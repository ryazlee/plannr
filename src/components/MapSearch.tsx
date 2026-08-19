import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { searchPlaces, type PlaceResult, type SearchProximity } from '../utils/geocode'

type MapSearchProps = {
  onSelect: (place: PlaceResult) => void
  variant?: 'overlay' | 'inline'
  placeholder?: string
  proximity?: SearchProximity | null
}

export default function MapSearch({
  onSelect,
  variant = 'overlay',
  placeholder = 'Search a place',
  proximity = null,
}: MapSearchProps) {
  const listId = useId()
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      abortRef.current?.abort()
      setResults([])
      setLoading(false)
      setStatus(trimmed.length === 0 ? '' : 'Type at least 2 characters')
      setActiveIndex(0)
      return
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setStatus('Searching…')

      try {
        const places = await searchPlaces(trimmed, controller.signal, proximity)
        setResults(places)
        setOpen(true)
        setActiveIndex(0)
        setStatus(places.length === 0 ? 'No places found. Try a name or address.' : '')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        setResults([])
        setStatus('Search failed. Try again.')
      } finally {
        setLoading(false)
      }
    }, 280)

    return () => {
      window.clearTimeout(timer)
    }
  }, [query, proximity?.lat, proximity?.lng])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  function choose(place: PlaceResult) {
    onSelect(place)
    setQuery(place.label)
    setResults([])
    setOpen(false)
    setStatus('')
    setLoading(false)
  }

  function clearQuery() {
    abortRef.current?.abort()
    setQuery('')
    setResults([])
    setStatus('')
    setLoading(false)
    setOpen(false)
    setActiveIndex(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }

    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter') && (results.length > 0 || status)) {
      setOpen(true)
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (results.length === 0) {
        return
      }
      setOpen(true)
      setActiveIndex((current) => (current + 1) % results.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (results.length === 0) {
        return
      }
      setOpen(true)
      setActiveIndex((current) => (current - 1 + results.length) % results.length)
      return
    }

    if (event.key === 'Enter') {
      const pick = results[activeIndex] ?? results[0]
      if (!pick) {
        return
      }
      event.preventDefault()
      choose(pick)
    }
  }

  const showMenu = Boolean(open && (results.length > 0 || status || loading))
  const activeId = results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined

  return (
    <div
      ref={rootRef}
      className={['map-search', variant === 'inline' ? 'map-search--inline' : null]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="map-search__field" htmlFor={inputId}>
        <Search size={16} aria-hidden="true" />
        <input
          id={inputId}
          className="map-search__input"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showMenu}
          aria-activedescendant={activeId}
          role="combobox"
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            className="map-search__clear"
            aria-label="Clear search"
            onClick={clearQuery}
          >
            <X size={14} />
          </button>
        ) : null}
      </label>

      {showMenu ? (
        <div className="map-search__menu" id={listId} role="listbox">
          {results.map((place, index) => (
            <button
              key={place.id}
              id={`${listId}-${place.id}`}
              type="button"
              className={[
                'map-search__option',
                index === activeIndex ? 'map-search__option--active' : null,
              ]
                .filter(Boolean)
                .join(' ')}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(place)}
            >
              <span className="map-search__option-label">{place.label}</span>
              {place.detail ? (
                <span className="map-search__option-detail">{place.detail}</span>
              ) : null}
            </button>
          ))}
          {status ? (
            <p className="map-search__status" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
