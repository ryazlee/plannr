import type { ItineraryState } from '../types'
import {
  buildEventsIcs,
  dayGoogleUrl,
  downloadIcs,
  hasCalendarDate,
  icsFilename,
} from '../utils/calendar'

export function useCalendarExport(
  itinerary: ItineraryState,
  onNotice: (message: string) => void,
) {
  function requireReady(): boolean {
    if (!hasCalendarDate(itinerary.date)) {
      onNotice('Set a date before adding this plan to Google Calendar.')
      return false
    }
    if (itinerary.events.length === 0) {
      onNotice('Add an event first.')
      return false
    }
    return true
  }

  function addDay() {
    if (!requireReady()) {
      return
    }

    const url = dayGoogleUrl(itinerary)
    if (!url) {
      onNotice('Set a date before adding this plan to Google Calendar.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    onNotice('Opened Google Calendar with the full day as one event.')
  }

  function addEachEvent() {
    if (!requireReady()) {
      return
    }

    const ics = buildEventsIcs(itinerary)
    if (!ics) {
      onNotice('Set a date before adding this plan to Google Calendar.')
      return
    }

    downloadIcs(icsFilename(itinerary.title), ics)
    onNotice('Downloaded an .ics file — import it in Google Calendar to add each event.')
  }

  return { addDay, addEachEvent }
}
