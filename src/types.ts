export interface Event {
  id: string
  startTime: string
  endTime: string
  title: string
  notes: string
  link: string
  people: string[]
  lat: number
  lng: number
}

export interface ItineraryState {
  title: string
  date: string
  people: string[]
  events: Event[]
}

export type LatLng = {
  lat: number
  lng: number
}
