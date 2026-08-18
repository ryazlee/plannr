import { startTransition, useEffect, useRef, useState } from 'react'
import type { Event, ItineraryState, LatLng } from '../types'
import {
  createEmptyState,
  createEventId,
  currentTimeInput,
  isEmptyState,
  roundCoord,
  withSortedEvents,
} from '../utils/itinerary'
import { createViewUrl, encodeUrlState, hydrateEditorState, writeUrlState } from '../utils/urlState'
import { removeStoredPlan, upsertStoredPlan } from '../utils/planStorage'
import { reverseGeocode } from '../utils/geocode'

export function useItinerary() {
  const boot = useRef<ReturnType<typeof hydrateEditorState> | null>(null)
  if (boot.current === null) {
    boot.current = hydrateEditorState()
  }

  const [itinerary, setItinerary] = useState<ItineraryState>(boot.current.state)
  const [draftStartTime, setDraftStartTime] = useState(currentTimeInput)
  const [draftEndTime, setDraftEndTime] = useState('')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftLink, setDraftLink] = useState('')
  const [draftPeople, setDraftPeople] = useState<string[]>([...boot.current.state.people])
  const [personDraft, setPersonDraft] = useState('')
  const [pendingLocation, setPendingLocation] = useState<LatLng | null>(null)
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const lastSerializedRef = useRef(encodeUrlState(boot.current.state))
  const planIdRef = useRef(boot.current.planId)

  useEffect(() => {
    const serialized = encodeUrlState(itinerary)
    lastSerializedRef.current = serialized
    writeUrlState(itinerary)
    if (isEmptyState(itinerary)) {
      return
    }
    planIdRef.current = upsertStoredPlan(itinerary, planIdRef.current)
  }, [itinerary])

  useEffect(() => {
    function handleHashChange() {
      const next = hydrateEditorState()
      const serialized = encodeUrlState(next.state)
      if (serialized === lastSerializedRef.current) {
        return
      }

      lastSerializedRef.current = serialized
      planIdRef.current = next.planId
      startTransition(() => {
        setItinerary(next.state)
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

    const wasEveryone =
      itinerary.people.length === 0
      || itinerary.people.every((person) => draftPeople.includes(person))

    updateState((current) => ({
      ...current,
      people: [...current.people, nextName],
    }))
    if (wasEveryone) {
      setDraftPeople((current) =>
        current.includes(nextName) ? current : [...current, nextName],
      )
    }
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
    setDraftPeople((current) => current.filter((person) => person !== name))
  }

  function moveEventPin(eventId: string, lat: number, lng: number, place?: string) {
    const location = { lat: roundCoord(lat), lng: roundCoord(lng) }
    const knownPlace = place?.trim() ?? ''
    updateState((current) => ({
      ...current,
      events: current.events.map((event) =>
        event.id === eventId
          ? { ...event, lat: location.lat, lng: location.lng, place: knownPlace }
          : event,
      ),
    }))
    setPendingLocation(null)
    setNotice('Pin moved.')
    if (!knownPlace) {
      fillPlaceName(location.lat, location.lng, (name) => {
        updateState((current) => ({
          ...current,
          events: current.events.map((event) =>
            event.id === eventId && event.lat === location.lat && event.lng === location.lng
              ? { ...event, place: name }
              : event,
          ),
        }))
      })
    }
  }

  function placeOnMap(lat: number, lng: number, place?: string) {
    const location = { lat: roundCoord(lat), lng: roundCoord(lng) }

    if (focusedEventId) {
      moveEventPin(focusedEventId, location.lat, location.lng, place)
      return
    }

    setPendingPin(location.lat, location.lng, place)
  }

  function placeNewPin(lat: number, lng: number, place?: string) {
    setFocusedEventId(null)
    setPendingPin(roundCoord(lat), roundCoord(lng), place)
  }

  function setPendingPin(lat: number, lng: number, place?: string) {
    const knownPlace = place?.trim() ?? ''
    setPendingLocation({ lat, lng, place: knownPlace })
    setNotice('Pin ready — click Add event to create it.')
    if (!knownPlace) {
      fillPlaceName(lat, lng, (name) => {
        setPendingLocation((current) =>
          current && current.lat === lat && current.lng === lng
            ? { ...current, place: name }
            : current,
        )
      })
    }
  }

  function fillPlaceName(lat: number, lng: number, apply: (name: string) => void) {
    reverseGeocode(lat, lng)
      .then((name) => {
        if (name) {
          apply(name)
        }
      })
      .catch(() => {})
  }

  function addEventAt(
    location: LatLng | null,
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
        people: [...draftPeople],
        place: location?.place?.trim() ?? '',
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      }

      return {
        ...current,
        events: [...current.events, event],
      }
    })
    setDraftTitle('')
    setDraftNotes('')
    setDraftLink('')
    setDraftPeople([...itinerary.people])
    setPendingLocation(null)
    setFocusedEventId(null)
    setNotice('')
  }

  function toggleDraftPerson(name: string) {
    setDraftPeople((current) =>
      current.includes(name)
        ? current.filter((person) => person !== name)
        : [...current, name],
    )
  }

  function addEvent() {
    const title = draftTitle.trim()
    if (!title) {
      setNotice('Give the event a title.')
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

  function removeEvent(eventId: string) {
    updateState((current) => ({
      ...current,
      events: current.events.filter((event) => event.id !== eventId),
    }))
    setFocusedEventId((current) => (current === eventId ? null : current))
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(createViewUrl(itinerary))
      setNotice('Share link copied to clipboard.')
    } catch {
      setNotice('Clipboard access failed. Copy the URL from the address bar instead.')
    }
  }

  function clearPlan() {
    const start = currentTimeInput()
    if (planIdRef.current) {
      removeStoredPlan(planIdRef.current)
      planIdRef.current = null
    }
    startTransition(() => {
      setItinerary(createEmptyState())
    })
    setDraftStartTime(start)
    setDraftEndTime('')
    setDraftTitle('')
    setDraftNotes('')
    setDraftLink('')
    setDraftPeople([])
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
    setNotice,
    updateTitle,
    updateDate,
    addPerson,
    removePerson,
    placeOnMap,
    placeNewPin,
    moveEventPin,
    addEvent,
    toggleDraftPerson,
    updateEvent,
    toggleEventPerson,
    removeEvent,
    copyShareLink,
    clearPlan,
  }
}
