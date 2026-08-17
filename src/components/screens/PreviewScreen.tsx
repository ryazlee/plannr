import { useMemo, useState } from 'react'
import { Link2, Pencil } from 'lucide-react'
import AppHeader from '../AppHeader'
import Button from '../Button'
import ItineraryMap from '../ItineraryMap'
import MapSearch from '../MapSearch'
import PreviewTimeline from '../PreviewTimeline'
import { formatDisplayDate, formatTimeRange, isEmptyState } from '../../utils/itinerary'
import { createEditorLocation, createPreviewUrl, hydrateState } from '../../utils/urlState'
import type { LatLng } from '../../types'

export default function PreviewScreen() {
  const itinerary = useMemo(() => hydrateState(), [])
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [searchTarget, setSearchTarget] = useState<LatLng | null>(null)
  const [notice, setNotice] = useState('')

  const editorLocation = createEditorLocation(itinerary)
  const empty = isEmptyState(itinerary)
  const timeRange = formatTimeRange(itinerary.events)
  const eventLabel =
    itinerary.events.length === 0
      ? null
      : `${itinerary.events.length} event${itinerary.events.length === 1 ? '' : 's'}`
  const peopleLabel =
    itinerary.people.length === 0
      ? null
      : `${itinerary.people.length} ${itinerary.people.length === 1 ? 'person' : 'people'}`
  const subtitle = [formatDisplayDate(itinerary.date), timeRange, eventLabel, peopleLabel]
    .filter(Boolean)
    .join(' · ')

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(createPreviewUrl(itinerary))
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  if (empty) {
    return (
      <div className="app-shell">
        <AppHeader title="Plannr" subtitle="Shared itinerary" mode="viewing" />
        <main className="app-main">
          <div className="shell-inner">
            <div className="stack">
              <p className="empty-hint">No plan in this link yet.</p>
              <Button label="Create a plan" to="/" variant="secondary" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppHeader title="Plannr" subtitle="Shared itinerary" mode="viewing" />
      <main className="app-main">
        <div className="shell-inner">
          <div className="preview-layout">
            <div className="preview-sidebar">
              <div className="preview-hero">
                <h2 className="preview-title">{itinerary.title.trim() || 'Untitled plan'}</h2>
                {subtitle ? <p className="preview-meta">{subtitle}</p> : null}

                <div className="btn-grid">
                  <Button
                    label="Copy link to share"
                    icon={<Link2 size={16} />}
                    onClick={copyShareLink}
                  />
                  <Button
                    label="Edit plan"
                    icon={<Pencil size={16} />}
                    variant="secondary"
                    to={editorLocation}
                  />
                </div>
                {notice ? <p className="notice">{notice}</p> : null}
              </div>

              <div className="preview-timeline">
                <div className="surface-card">
                  <div className="surface-card__header">
                    <p className="section-label">Day</p>
                  </div>
                  <div className="surface-card__body">
                    <PreviewTimeline
                      events={itinerary.events}
                      focusedEventId={focusedEventId}
                      onSelectEvent={setFocusedEventId}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-map">
              <div className="surface-card map-card">
                <div className="map-canvas map-canvas--readonly">
                  <MapSearch
                    onSelect={(place) => {
                      setSearchTarget({ lat: place.lat, lng: place.lng })
                    }}
                  />
                  <ItineraryMap
                    events={itinerary.events}
                    focusedEventId={focusedEventId}
                    onSelectEvent={setFocusedEventId}
                    searchTarget={searchTarget}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
