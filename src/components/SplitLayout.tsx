import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

const STORAGE_KEY = 'plannr-split'
const MIN_MAP_REM = 18
const MIN_SIDEBAR_REM = 20
const SPLITTER_PX = 11
const KEY_STEP = 24
const KEY_JUMP = 96

type SplitLayoutProps = {
  className: string
  mapClassName: string
  sidebarClassName: string
  map: ReactNode
  sidebar: ReactNode
  isDesktop: boolean
}

function remToPx(rem: number): number {
  const root = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return rem * (Number.isFinite(root) && root > 0 ? root : 16)
}

function loadStoredWidth(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const value = Number.parseFloat(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function saveStoredWidth(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(width)))
  } catch {
    // ignore quota / private mode
  }
}

export default function SplitLayout({
  className,
  mapClassName,
  sidebarClassName,
  map,
  sidebar,
  isDesktop,
}: SplitLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(0)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const [mapWidth, setMapWidth] = useState(0)

  const clampWidth = useCallback((width: number, total: number) => {
    const minMap = remToPx(MIN_MAP_REM)
    const minSidebar = remToPx(MIN_SIDEBAR_REM)
    const maxMap = Math.max(minMap, total - minSidebar - SPLITTER_PX)
    return Math.round(Math.min(maxMap, Math.max(minMap, width)))
  }, [])

  const applyPreferred = useCallback(
    (preferred: number | null) => {
      const total = containerRef.current?.getBoundingClientRect().width ?? 0
      if (total <= 0) {
        return
      }
      const next = clampWidth(preferred ?? total * 0.55, total)
      widthRef.current = next
      setMapWidth(next)
    },
    [clampWidth],
  )

  useEffect(() => {
    if (!isDesktop) {
      return
    }

    applyPreferred(loadStoredWidth())

    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      applyPreferred(widthRef.current || loadStoredWidth())
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [applyPreferred, isDesktop])

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      startX: event.clientX,
      startWidth: widthRef.current,
    }
    document.body.classList.add('is-resizing')
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    const total = containerRef.current?.getBoundingClientRect().width ?? 0
    if (!drag || total <= 0) {
      return
    }

    const next = clampWidth(drag.startWidth - (event.clientX - drag.startX), total)
    widthRef.current = next
    setMapWidth(next)
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) {
      return
    }

    dragRef.current = null
    document.body.classList.remove('is-resizing')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    saveStoredWidth(widthRef.current)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const total = containerRef.current?.getBoundingClientRect().width ?? 0
    if (total <= 0) {
      return
    }

    const minMap = remToPx(MIN_MAP_REM)
    const maxMap = clampWidth(total, total)
    let next = widthRef.current

    if (event.key === 'ArrowLeft') {
      next += event.shiftKey ? KEY_JUMP : KEY_STEP
    } else if (event.key === 'ArrowRight') {
      next -= event.shiftKey ? KEY_JUMP : KEY_STEP
    } else if (event.key === 'Home') {
      next = minMap
    } else if (event.key === 'End') {
      next = maxMap
    } else {
      return
    }

    event.preventDefault()
    const clamped = clampWidth(next, total)
    widthRef.current = clamped
    setMapWidth(clamped)
    saveStoredWidth(clamped)
  }

  const style = (
    isDesktop && mapWidth > 0
      ? ({ '--split-map-width': `${mapWidth}px` } as CSSProperties)
      : undefined
  )

  return (
    <div
      ref={containerRef}
      className={[className, isDesktop ? 'split-layout' : null].filter(Boolean).join(' ')}
      style={style}
    >
      <div className={sidebarClassName}>{sidebar}</div>
      {isDesktop ? (
        <button
          type="button"
          className="split-handle"
          aria-label="Resize map"
          aria-orientation="vertical"
          role="separator"
          aria-valuemin={Math.round(remToPx(MIN_MAP_REM))}
          aria-valuemax={Math.round(
            Math.max(
              remToPx(MIN_MAP_REM),
              (containerRef.current?.getBoundingClientRect().width ?? remToPx(MIN_MAP_REM + MIN_SIDEBAR_REM))
                - remToPx(MIN_SIDEBAR_REM)
                - SPLITTER_PX,
            ),
          )}
          aria-valuenow={Math.round(mapWidth)}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        />
      ) : null}
      {isDesktop ? <div className={mapClassName}>{map}</div> : null}
    </div>
  )
}
