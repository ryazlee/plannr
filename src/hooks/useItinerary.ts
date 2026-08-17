import { startTransition, useEffect, useRef, useState } from 'react'
import type { Event, ItineraryState, LatLng } from '../types'
import {
  createEmptyState,
  createEventId,
  currentTimeInput,
  offsetTime,
  roundCoord,
  withSortedEvents,
} from '../utils/itinerary'
import { createPreviewUrl, encodeUrlState, hydrateState, writeUrlState } from '../utils/urlState'

export function useItinerary() {
  const [itinerary, setItinerary] = useState<ItineraryState>(() => hydrateState())
  const [draftStartTime, setDraftStartTime] = useState(currentTimeInput)
  const [draftEndTime, setDraftEndTime] = useState(() => offsetTime(currentTimeInput(), 60))
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftLink, setDraftLink] = useState('')
  const [personDraft, setPersonDraft] = useState('')
  const [pendingLocation, setPendingLocation] = useState<LatLng | null>(null)
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const lastSerializedRef = useRef(encodeUrlState(itinerary))

  useEffect(() => {
    const serialized = encodeUrlState(itinerary)
    lastSerializedRef.current = serialized
    writeUrlState(itinerary)
  }, [itinerary])

  useEffect(() => {
    function handleHashChange() {
      const nextState = hydrateState()
      const serialized = encodeUrlState(nextState)
      if (serialized === lastSerializedRef.current) {
        return
      }

      lastSerializedRef.current = serialized
      startTransition(() => {
        setItinerary(nextState)
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  function updateState(updater: (current: ItineraryState) => ItineraryState) {
    setItinerary((current) => withSortedEvents(updater(current)))
  }

  function updateTitle(value: string) {
    updateState((current) => ({ ...current, title: value }))
  }

  function updateDate(value: string) {
    updateState((current) => ({ ...current, date: value }))
  }

  function addPerson() {
    const nextName = personDraft.trim()
    if (!nextName) {
      return
    }

    const exists = itinerary.people.some(
      (name) => name.toLowerCase() === nextName.toLowerCase(),
    )
    if (exists) {
      setNotice(`"${nextName}" is already on the plan.`)
      return
    }

    updateState((current) => ({
      ...current,
      people: [...current.people, nextName],
    }))
    setPersonDraft('')
    setNotice('')
  }

  function removePerson(name: string) {
    updateState((current) => ({
      ...current,
      people: current.people.filter((person) => person !== name),
      events: current.events.map((event) => ({
        ...event,
        people: event.people.filter((person) => person !== name),
      })),
    }))
  }

  function moveEventPin(eventId: string, lat: number, lng: number) {
    const location = { lat: roundCoord(lat), lng: roundCoord(lng) }
    updateState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId ? { ...event, lat: location.lat, lng: location.lng } : event,
      ),
    }))
    setPendingLocation(null)
    setNotice('Pin moved.')
  }

  function placeOnMap(lat: number, lng: number) {
    const location = { lat: roundCoord(lat), lng: roundCoord(lng) }

    if (focusedEventId) {
      moveEventPin(focusedEventId, location.lat, location.lng)
      return
    }

    const title = draftTitle.trim()

    if (!title) {
      setPendingLocation(location)
      setNotice('Add a title, then click Add event — or type a title and click the map again.')
      return
    }

    addEventAt(location, title, draftStartTime, draftEndTime, draftNotes, draftLink)
  }

  function addEventAt(
    location: LatLng,
    title: string,
    startTime: string,
    endTime: string,
    notes: string,
    link: string,
  ) {
    updateState((current) => {
      const event: Event = {
        id: createEventId(),
        startTime,
        endTime,
        title,
        notes: notes.trim(),
        link: link.trim(),
        people: [...current.people],
        lat: location.lat,
        lng: location.lng,
      }

      return {
        ...current,
        events: [...current.events, event],
      }
    })
    setDraftTitle('')
    setDraftNotes('')
    setDraftLink('')
    setPendingLocation(null)
    setFocusedEventId(null)
    setNotice('')
  }

  function addEvent() {
    const title = draftTitle.trim()
    if (!title) {
      setNotice('Give the event a title.')
      return
    }

    if (!pendingLocation) {
      setNotice('Click the map to place this event.')
      return
    }

    addEventAt(pendingLocation, title, draftStartTime, draftEndTime, draftNotes, draftLink)
  }

  function updateEvent(
    eventId: string,
    field: 'startTime' | 'endTime' | 'title' | 'notes' | 'link',
    value: string,
  ) {
    updateState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId ? { ...event, [field]: value } : event,
      ),
    }))
  }

  function toggleEventPerson(eventId: string, name: string) {
    updateState((current) => ({
      ...current,
      events: current.events.map((event) => {
        if (event.id !== eventId) {
          return event
        }

        const assigned = event.people.includes(name)
        return {
          ...event,
          people: assigned
            ? event.people.filter((person) => person !== name)
            : [...event.people, name],
        }
      }),
    }))
  }

  function toggleEventEveryone(eventId: string) {
    updateState((current) => ({
      ...current,
      events: current.events.map((event) => {
        if (event.id !== eventId) {
          return event
        }

        const allAssigned =
          current.people.length > 0
          && current.people.every((person) => event.people.includes(person))

        return {
          ...event,
          people: allAssigned ? [] : [...current.people],
        }
      }),
    }))
  }

  function removeEvent(eventId: string) {
    updateState((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
    }))
    setFocusedEventId((current) => (current === eventId ? null : current))
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(createPreviewUrl(itinerary))
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  function clearPlan() {
    const start = currentTimeInput()
    startTransition(() => {
      setItinerary(createEmptyState())
    })
    setDraftStartTime(start)
    setDraftEndTime(offsetTime(start, 60))
    setDraftTitle('')
    setDraftNotes('')
    setDraftLink('')
    setPersonDraft('')
    setPendingLocation(null)
    setFocusedEventId(null)
    setNotice('')
  }

  return {
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
  }
}
