import { useEffect, useMemo, useRef } from 'react'
import EventDetails from './EventDetails'
import {
  formatGapLabel,
  formatTime,
  groupEventsByStartTime,
  latestEffectiveEnd,
  minutesBetween,
} from '../utils/itinerary'
import type { Event } from '../types'

type PreviewTimelineProps = {
  events: Event[]
  people: string[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
}

export default function PreviewTimeline({
  events,
  people,
  focusedEventId,
  onSelectEvent,
}: PreviewTimelineProps) {
  const groups = useMemo(() => {
    const clustered = groupEventsByStartTime(events)
    let nextIndex = 1
    return clustered.map((group) => {
      const startIndex = nextIndex
      nextIndex += group.length
      return { group, startIndex }
    })
  }, [events])

  if (events.length === 0) {
    return <p className="empty-hint">No events on this day yet.</p>
  }

  return (
    <ol className="preview-rail">
      {groups.map(({ group, startIndex }, groupIndex) => (
        <PreviewCluster
          key={group[0]?.id ?? groupIndex}
          group={group}
          startIndex={startIndex}
          previous={groups[groupIndex - 1]?.group}
          people={people}
          focusedEventId={focusedEventId}
          onSelectEvent={onSelectEvent}
        />
      ))}
    </ol>
  )
}

function PreviewCluster({
  group,
  startIndex,
  previous,
  people,
  focusedEventId,
  onSelectEvent,
}: {
  group: Event[]
  startIndex: number
  previous: Event[] | undefined
  people: string[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
}) {
  const lead = group[0]
  const previousEnd = previous ? latestEffectiveEnd(previous) : ''
  const gap =
    lead && previous && lead.startTime && previousEnd
      ? minutesBetween(previousEnd, lead.startTime)
      : null
  const concurrent = group.length > 1
  const startLabel = lead ? formatTime(lead.startTime) : ''

  return (
    <li className={concurrent ? 'preview-slot preview-slot--split' : 'preview-slot'}>
      {gap ? (
        <div className={['preview-gap', gap >= 60 ? 'preview-gap--hour' : null].filter(Boolean).join(' ')}>
          <p className="preview-gap__label">{formatGapLabel(gap)}</p>
        </div>
      ) : null}
      <div
        className="preview-cluster"
        role={concurrent ? 'group' : undefined}
        aria-label={
          concurrent && startLabel ? `${startLabel}, ${group.length} events at the same time` : undefined
        }
      >
        {group.map((event, offset) => (
          <PreviewEventBlock
            key={event.id}
            event={event}
            index={startIndex + offset}
            people={people}
            selected={event.id === focusedEventId}
            showTime={offset === 0}
            concurrent={concurrent}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </li>
  )
}

function PreviewEventBlock({
  event,
  index,
  people,
  selected,
  showTime,
  concurrent,
  onSelectEvent,
}: {
  event: Event
  index: number
  people: string[]
  selected: boolean
  showTime: boolean
  concurrent: boolean
  onSelectEvent: (eventId: string) => void
}) {
  const blockRef = useRef<HTMLDivElement>(null)
  const startLabel = formatTime(event.startTime)
  const title = event.title || `Event ${index}`

  useEffect(() => {
    if (!selected) {
      return
    }
    blockRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <div
      ref={blockRef}
      className={['preview-event-block', selected ? 'preview-event-block--active' : null]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className={['preview-event', selected ? 'preview-event--active' : null]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={selected}
        aria-label={
          concurrent && !showTime && startLabel ? `${title}, ${startLabel}, same time` : undefined
        }
        onClick={() => onSelectEvent(event.id)}
      >
        <span
          className={['preview-event__when', showTime ? null : 'preview-event__when--also']
            .filter(Boolean)
            .join(' ')}
        >
          {showTime ? startLabel || '—' : 'also'}
        </span>
        <span className="preview-event__title">{title}</span>
      </button>
      <div
        className="preview-event__details"
        onClick={() => {
          if (!selected) {
            onSelectEvent(event.id)
          }
        }}
      >
        <EventDetails event={event} index={index} showHeading={false} allPeople={people} />
      </div>
    </div>
  )
}
