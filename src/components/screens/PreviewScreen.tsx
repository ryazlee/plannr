import { useEffect, useMemo, useRef, useState } from 'react'
import { BookmarkPlus, Check, Link2, Pencil } from 'lucide-react'
import AppHeader from '../AppHeader'
import Button from '../Button'
import { useCalendarExport } from '../CalendarExport'
import ItineraryMap from '../ItineraryMap'
import PreviewModeControl from '../PreviewModeControl'
import PreviewTimeline from '../PreviewTimeline'
import SaveMemoryButton, { type SaveMemoryHandle } from '../SaveMemoryButton'
import SplitLayout from '../SplitLayout'
import { useDesktopLayout } from '../../hooks/useMediaQuery'
import { effectivePreviewMode, usePreviewMode } from '../../hooks/usePreviewMode'
import { formatDisplayDate, formatTimeRange, isEmptyState } from '../../utils/itinerary'
import { applyShareMeta } from '../../utils/shareMeta'
import { createEditorLocation, createViewUrl, hydrateViewState } from '../../utils/urlState'
import { hasCalendarDate } from '../../utils/calendar'
import {
  findStoredPlanByState,
  MAX_STORED_PLANS,
  readStoredPlans,
  upsertStoredPlan,
} from '../../utils/planStorage'

export default function PreviewScreen() {
  const itinerary = useMemo(() => hydrateViewState(), [])
  const isDesktop = useDesktopLayout()
  const [previewMode, setPreviewMode] = usePreviewMode()
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const saveMemoryRef = useRef<SaveMemoryHandle>(null)
  const [notice, setNotice] = useState(
    hasCalendarDate(itinerary.date) || isEmptyState(itinerary)
      ? ''
      : 'Set a date in the editor before adding this plan to Google Calendar.',
  )

  const editorLocation = createEditorLocation(itinerary)
  const [savedOnDevice, setSavedOnDevice] = useState(() => Boolean(findStoredPlanByState(itinerary)))
  const empty = isEmptyState(itinerary)

  useEffect(() => {
    applyShareMeta(itinerary.title, formatDisplayDate(itinerary.date) || undefined)
  }, [itinerary.title, itinerary.date])
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
  const mode = effectivePreviewMode(previewMode, isDesktop)
  const { addDay, addEachEvent } = useCalendarExport(itinerary, setNotice)

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(createViewUrl(itinerary))
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  function saveToDevice() {
    if (savedOnDevice || findStoredPlanByState(itinerary)) {
      setSavedOnDevice(true)
      setNotice('This plan is already saved on this device.')
      return
    }

    const atCap = readStoredPlans().length >= MAX_STORED_PLANS
    const id = upsertStoredPlan(itinerary)
    if (!id) {
      setNotice('Could not save this plan on this device.')
      return
    }

    setSavedOnDevice(true)
    setNotice(
      atCap
        ? 'Saved on this device. The oldest plan was removed to stay at 5.'
        : 'Saved on this device. You’ll see it on the home screen.',
    )
  }

  function selectEvent(eventId: string) {
    setFocusedEventId(eventId)
  }

  function toggleEvent(eventId: string) {
    setFocusedEventId((current) => (current === eventId ? null : eventId))
  }

  if (empty) {
    return (
      <div className="app-shell">
        <AppHeader title="Plannr" quiet />
        <main className="app-main">
          <div className="shell-inner">
            <div className="stack">
              <p className="empty-hint">No plan in this link yet.</p>
              <Button label="Home" to="/" variant="secondary" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  const hero = (
    <div className="preview-hero">
      <div className="preview-hero__top">
        <div className="preview-hero__copy">
          <h2 className="preview-title">{itinerary.title.trim() || 'Untitled plan'}</h2>
          {subtitle ? <p className="preview-meta">{subtitle}</p> : null}
        </div>
        <div className="preview-toolbar">
          <PreviewModeControl
            mode={mode}
            isDesktop={isDesktop}
            onChange={setPreviewMode}
            onAddDay={addDay}
            onAddEachEvent={addEachEvent}
            onSaveImage={() => saveMemoryRef.current?.open()}
            savedOnDevice={savedOnDevice}
            onSaveToDevice={saveToDevice}
          />
          <SaveMemoryButton
            ref={saveMemoryRef}
            itinerary={itinerary}
            onNotice={setNotice}
            size="sm"
          />
          <Button
            label={savedOnDevice ? 'Saved' : 'Save'}
            icon={savedOnDevice ? <Check size={16} /> : <BookmarkPlus size={16} />}
            size="sm"
            variant="ghost"
            disabled={savedOnDevice}
            title={savedOnDevice ? 'Saved on this device' : 'Save to this device'}
            onClick={saveToDevice}
          />
          <Button
            label="Copy"
            icon={<Link2 size={16} />}
            size="sm"
            variant="ghost"
            onClick={copyShareLink}
          />
          <Button
            label="Edit"
            icon={<Pencil size={16} />}
            size="sm"
            variant="ghost"
            to={editorLocation}
          />
        </div>
      </div>

      {notice ? <p className="notice">{notice}</p> : null}
    </div>
  )

  const map = (
    <div className="surface-card map-card">
      <div className="map-canvas map-canvas--readonly">
        <ItineraryMap
          events={itinerary.events}
          people={itinerary.people}
          focusedEventId={focusedEventId}
          onSelectEvent={selectEvent}
          readOnly
        />
      </div>
    </div>
  )

  const timeline = (
    <div className="preview-timeline">
      <PreviewTimeline
        events={itinerary.events}
        people={itinerary.people}
        focusedEventId={focusedEventId}
        onSelectEvent={toggleEvent}
      />
    </div>
  )

  return (
    <div className={['app-shell', mode === 'map' ? 'app-shell--preview-map' : null].filter(Boolean).join(' ')}>
      <AppHeader title="Plannr" mode="viewing" quiet />
      <main className="app-main">
        <div className="shell-inner">
          {mode === 'split' ? (
            <SplitLayout
              className="preview-layout"
              mapClassName="preview-map"
              sidebarClassName="preview-sidebar"
              isDesktop={isDesktop}
              map={map}
              sidebar={
                <>
                  {hero}
                  {timeline}
                </>
              }
            />
          ) : (
            <div className={`preview-layout preview-layout--${mode}`}>
              {hero}
              {mode === 'map' ? <div className="preview-map preview-map--solo">{map}</div> : timeline}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
