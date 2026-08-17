import { useState } from 'react'
import AppHeader from '../AppHeader'
import AddEventPanel from '../AddEventPanel'
import DetailsPanel from '../DetailsPanel'
import ItineraryMap from '../ItineraryMap'
import MapSearch from '../MapSearch'
import PeoplePanel from '../PeoplePanel'
import SectionCard from '../SectionCard'
import TimelinePanel from '../TimelinePanel'
import { createPreviewLocation } from '../../utils/urlState'
import { useItinerary } from '../../hooks/useItinerary'
import type { LatLng } from '../../types'

export default function PlannerScreen() {
  const {
    itinerary,
    draftStartTime,
    draftEndTime,
    draftTitle,
    draftNotes,
    draftLink,
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
    moveEventPin,
    addEvent,
    updateEvent,
    toggleEventPerson,
    toggleEventEveryone,
    removeEvent,
    copyShareLink,
    clearPlan,
  } = useItinerary()
  const [searchTarget, setSearchTarget] = useState<LatLng | null>(null)
  const focusedEvent = itinerary.events.find((event) => event.id === focusedEventId)
  const mapSubtitle = focusedEvent
    ? `Selected: ${focusedEvent.title.trim() || 'event'} — drag the pin, or click / search to move it.`
    : 'Search or click to place the next event.'

  return (
    <div className="app-shell">
      <AppHeader title="Plannr" mode="editing" />
      <main className="app-main">
        <div className="shell-inner">
          <div className="planner-layout">
            <div className="planner-sidebar">
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
                pendingLocation={pendingLocation}
                onStartTimeChange={setDraftStartTime}
                onEndTimeChange={setDraftEndTime}
                onTitleChange={setDraftTitle}
                onNotesChange={setDraftNotes}
                onLinkChange={setDraftLink}
                onAddEvent={addEvent}
                onPrepareNew={() => setFocusedEventId(null)}
              />

              <TimelinePanel
                events={itinerary.events}
                people={itinerary.people}
                focusedEventId={focusedEventId}
                onUpdateEvent={updateEvent}
                onTogglePerson={toggleEventPerson}
                onToggleEveryone={toggleEventEveryone}
                onRemoveEvent={removeEvent}
                onSelectEvent={setFocusedEventId}
              />
            </div>

            <div className="planner-map">
              <SectionCard
                className="map-card"
                title="Map"
                subtitle={mapSubtitle}
                noPadding
              >
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
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
