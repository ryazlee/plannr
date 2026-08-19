import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import EventDetails from './EventDetails'
import {
  formatDistance,
  formatGapLabel,
  formatTime,
  gapDistanceMeters,
  groupEventsByStartTime,
  latestEffectiveEnd,
  minutesBetween,
} from '../utils/itinerary'
import { concurrentLaneColor } from '../utils/personColor'
import type { Event } from '../types'

type PreviewTimelineProps = {
  events: Event[]
  people: string[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
  staticMode?: boolean
}

export default function PreviewTimeline({
  events,
  people,
  focusedEventId,
  onSelectEvent,
  staticMode = false,
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
          priorEvents={groups.slice(0, groupIndex).flatMap((entry) => entry.group)}
          people={people}
          focusedEventId={focusedEventId}
          onSelectEvent={onSelectEvent}
          staticMode={staticMode}
        />
      ))}
    </ol>
  )
}

function PreviewCluster({
  group,
  startIndex,
  previous,
  priorEvents,
  people,
  focusedEventId,
  onSelectEvent,
  staticMode,
}: {
  group: Event[]
  startIndex: number
  previous: Event[] | undefined
  priorEvents: Event[]
  people: string[]
  focusedEventId: string | null
  onSelectEvent: (eventId: string) => void
  staticMode: boolean
}) {
  const lead = group[0]
  const previousEnd = previous ? latestEffectiveEnd(previous) : ''
  const gap =
    lead && previous && lead.startTime && previousEnd
      ? minutesBetween(previousEnd, lead.startTime)
      : null
  const distance = priorEvents.length > 0 ? gapDistanceMeters(priorEvents, group) : null
  const transitLabel = [
    gap ? formatGapLabel(gap) : null,
    distance != null ? formatDistance(distance) : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const concurrent = group.length > 1
  const startLabel = lead ? formatTime(lead.startTime) : ''

  return (
    <li className={concurrent ? 'preview-slot preview-slot--split' : 'preview-slot'}>
      {transitLabel ? (
        <div className={['preview-gap', gap != null && gap >= 60 ? 'preview-gap--hour' : null].filter(Boolean).join(' ')}>
          <p className="preview-gap__label">{transitLabel}</p>
        </div>
      ) : null}
      <div
        className="preview-cluster"
        role={concurrent ? 'group' : undefined}
        aria-label={
          concurrent && startLabel ? `${startLabel}, ${group.length} events at the same time` : undefined
        }
      >
        {concurrent ? (
          <>
            <span className="preview-cluster__when">{startLabel || '—'}</span>
            <div className="preview-cluster__events">
              {group.map((event, offset) => (
                <PreviewEventBlock
                  key={event.id}
                  event={event}
                  index={startIndex + offset}
                  people={people}
                  selected={event.id === focusedEventId}
                  lane
                  laneColor={concurrentLaneColor(event, people, offset)}
                  onSelectEvent={onSelectEvent}
                  staticMode={staticMode}
                />
              ))}
            </div>
          </>
        ) : (
          group.map((event, offset) => (
            <PreviewEventBlock
              key={event.id}
              event={event}
              index={startIndex + offset}
              people={people}
              selected={event.id === focusedEventId}
              onSelectEvent={onSelectEvent}
              staticMode={staticMode}
            />
          ))
        )}
      </div>
    </li>
  )
}

function PreviewEventBlock({
  event,
  index,
  people,
  selected,
  lane = false,
  laneColor,
  onSelectEvent,
  staticMode = false,
}: {
  event: Event
  index: number
  people: string[]
  selected: boolean
  lane?: boolean
  laneColor?: string
  onSelectEvent: (eventId: string) => void
  staticMode?: boolean
}) {
  const blockRef = useRef<HTMLDivElement>(null)
  const startLabel = formatTime(event.startTime)
  const title = event.title || `Event ${index}`

  useEffect(() => {
    if (!selected || staticMode) {
      return
    }
    blockRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected, staticMode])

  return (
    <div
      ref={blockRef}
      className={[
        'preview-event-block',
        'preview-event',
        selected ? 'preview-event-block--active' : null,
        selected ? 'preview-event--active' : null,
        lane ? 'preview-event-block--lane' : null,
        laneColor ? 'preview-event-block--colored' : null,
      ]
        .filter(Boolean)
        .join(' ')}
      style={laneColor ? ({ '--lane-color': laneColor } as CSSProperties) : undefined}
    >
      {lane ? null : <span className="preview-event__when">{startLabel || '—'}</span>}
      <span className="preview-event__node" aria-hidden="true" />
      <div className="preview-event__main">
        {staticMode ? (
          <span className="preview-event__title">{title}</span>
        ) : (
          <button
            type="button"
            className="preview-event__title-btn"
            aria-pressed={selected}
            aria-label={lane && startLabel ? `${title}, ${startLabel}` : undefined}
            onClick={() => onSelectEvent(event.id)}
          >
            <span className="preview-event__title">{title}</span>
          </button>
        )}
        <div
          className="preview-event__details"
          onClick={() => {
            if (staticMode || selected) {
              return
            }
            onSelectEvent(event.id)
          }}
        >
          <EventDetails
            event={event}
            index={index}
            showHeading={false}
            allPeople={people}
            staticMode={staticMode}
          />
        </div>
      </div>
    </div>
  )
}
