import { useState } from 'react'
import AppHeader from '../AppHeader'
import AddEventPanel from '../AddEventPanel'
import DetailsPanel from '../DetailsPanel'
import ItineraryMap from '../ItineraryMap'
import MapSearch from '../MapSearch'
import PeoplePanel from '../PeoplePanel'
import SectionCard from '../SectionCard'
import SplitLayout from '../SplitLayout'
import TimelinePanel from '../TimelinePanel'
import { useDesktopLayout } from '../../hooks/useMediaQuery'
import { useItinerary } from '../../hooks/useItinerary'
import { hasLocation } from '../../utils/itinerary'
import { createPreviewLocation } from '../../utils/urlState'
import type { LatLng } from '../../types'

export default function PlannerScreen() {
  const {
    itinerary,
    draftStartTime,
    draftEndTime,
    draftTitle,
    draftNotes,
    draftLink,
    draftPeople,
    personDraft,
    pendingLocation,
    focusedEventId,
    notice,
    setDraftStartTime,
    setDraftEndTime,
    setDraftTitle,
    setDraftNotes,
    setDraftLink,
    setPersonDraft,
    setFocusedEventId,
    updateTitle,
    updateDate,
    addPerson,
    removePerson,
    placeOnMap,
    placeNewPin,
    moveEventPin,
    addEvent,
    toggleDraftPerson,
    toggleDraftEveryone,
    updateEvent,
    toggleEventPerson,
    toggleEventEveryone,
    removeEvent,
    copyShareLink,
    clearPlan,
  } = useItinerary()
  const isDesktop = useDesktopLayout()
  const [searchTarget, setSearchTarget] = useState<LatLng | null>(null)
  const focusedEvent = itinerary.events.find((event) => event.id === focusedEventId)
  const mapSubtitle = focusedEvent
    ? hasLocation(focusedEvent)
      ? `Selected: ${focusedEvent.title.trim() || 'event'} — drag the pin, or click / search to move it.`
      : `Selected: ${focusedEvent.title.trim() || 'event'} — click or search the map to add a pin.`
    : 'Search or click to place a pin — optional. Select an event to move its pin.'

  return (
    <div className="app-shell">
      <AppHeader title="Plannr" mode="editing" />
      <main className="app-main">
        <div className="shell-inner">
          <SplitLayout
            className="planner-layout"
            mapClassName="planner-map"
            sidebarClassName="planner-sidebar"
            isDesktop={isDesktop}
            map={
              <SectionCard className="map-card" title="Map" subtitle={mapSubtitle} noPadding>
                <div className="map-canvas">
                  <MapSearch
                    onSelect={(place) => {
                      const location = { lat: place.lat, lng: place.lng }
                      setSearchTarget(location)
                      placeOnMap(place.lat, place.lng)
                    }}
                  />
                  <ItineraryMap
                    events={itinerary.events}
                    pendingLocation={pendingLocation}
                    focusedEventId={focusedEventId}
                    onMapClick={placeOnMap}
                    onMoveEvent={moveEventPin}
                    onSelectEvent={setFocusedEventId}
                    searchTarget={searchTarget}
                  />
                </div>
              </SectionCard>
            }
            sidebar={
              <>
                <DetailsPanel
                  title={itinerary.title}
                  date={itinerary.date}
                  notice={notice}
                  eventCount={itinerary.events.length}
                  previewLocation={createPreviewLocation(itinerary)}
                  onTitleChange={updateTitle}
                  onDateChange={updateDate}
                  onCopyShareLink={copyShareLink}
                  onClearPlan={clearPlan}
                />

                <PeoplePanel
                  personDraft={personDraft}
                  people={itinerary.people}
                  onPersonDraftChange={setPersonDraft}
                  onAddPerson={addPerson}
                  onRemovePerson={removePerson}
                />

                <AddEventPanel
                  startTime={draftStartTime}
                  endTime={draftEndTime}
                  title={draftTitle}
                  notes={draftNotes}
                  link={draftLink}
                  people={itinerary.people}
                  assigned={draftPeople}
                  pendingLocation={pendingLocation}
                  showMap={!isDesktop}
                  nextIndex={itinerary.events.length + 1}
                  onStartTimeChange={setDraftStartTime}
                  onEndTimeChange={setDraftEndTime}
                  onTitleChange={setDraftTitle}
                  onNotesChange={setDraftNotes}
                  onLinkChange={setDraftLink}
                  onTogglePerson={toggleDraftPerson}
                  onToggleEveryone={toggleDraftEveryone}
                  onAddEvent={addEvent}
                  onPrepareNew={() => setFocusedEventId(null)}
                  onPlacePin={placeNewPin}
                />

                <TimelinePanel
                  events={itinerary.events}
                  people={itinerary.people}
                  focusedEventId={focusedEventId}
                  showMaps={!isDesktop}
                  onUpdateEvent={updateEvent}
                  onTogglePerson={toggleEventPerson}
                  onToggleEveryone={toggleEventEveryone}
                  onRemoveEvent={removeEvent}
                  onSelectEvent={setFocusedEventId}
                  onMoveEvent={moveEventPin}
                />
              </>
            }
          />
        </div>
      </main>
    </div>
  )
}
