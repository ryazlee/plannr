import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookmarkPlus, Calendar, Check, Download, Menu } from 'lucide-react'
import type { PreviewMode } from '../hooks/usePreviewMode'

const ALL_MODES: { id: PreviewMode; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'map', label: 'Map' },
  { id: 'split', label: 'Split' },
]

type PreviewModeControlProps = {
  mode: PreviewMode
  isDesktop: boolean
  onChange: (mode: PreviewMode) => void
  onAddDay: () => void
  onAddEachEvent: () => void
  onSaveImage: () => void
  savedOnDevice: boolean
  onSaveToDevice: () => void
}

export default function PreviewModeControl({
  mode,
  isDesktop,
  onChange,
  onAddDay,
  onAddEachEvent,
  onSaveImage,
  savedOnDevice,
  onSaveToDevice,
}: PreviewModeControlProps) {
  const modes = isDesktop ? ALL_MODES : ALL_MODES.filter((option) => option.id !== 'split')
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    function updatePosition() {
      const trigger = triggerRef.current
      const panel = menuRef.current
      if (!trigger) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const gap = 6
      const panelWidth = panel?.offsetWidth ?? 264
      const panelHeight = panel?.offsetHeight ?? 0
      const vw = window.innerWidth
      const vh = window.innerHeight
      let left = rect.left
      let top = rect.bottom + gap

      if (left + panelWidth > vw - 8) {
        left = Math.max(8, vw - panelWidth - 8)
      }
      if (top + panelHeight > vh - 8 && rect.top - gap - panelHeight > 8) {
        top = rect.top - gap - panelHeight
      }

      setCoords({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function chooseMode(next: PreviewMode) {
    onChange(next)
    setOpen(false)
  }

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="preview-menu__panel"
          id={menuId}
          role="menu"
          aria-label="View options"
          style={{ top: coords.top, left: coords.left }}
        >
          {modes.map((option) => {
            const active = option.id === mode
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                className={['preview-menu__item', active ? 'preview-menu__item--active' : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-checked={active}
                onClick={() => chooseMode(option.id)}
              >
                <span className="preview-menu__leading">
                  {active ? <Check size={16} aria-hidden="true" /> : null}
                </span>
                {option.label}
              </button>
            )
          })}

          <div className="preview-menu__sep" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="preview-menu__item"
            disabled={savedOnDevice}
            onClick={() => {
              if (savedOnDevice) {
                return
              }
              onSaveToDevice()
              setOpen(false)
            }}
          >
            <span className="preview-menu__leading">
              {savedOnDevice ? <Check size={16} aria-hidden="true" /> : <BookmarkPlus size={16} aria-hidden="true" />}
            </span>
            {savedOnDevice ? 'Saved on this device' : 'Save to this device'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="preview-menu__item"
            onClick={() => {
              setOpen(false)
              onSaveImage()
            }}
          >
            <span className="preview-menu__leading">
              <Download size={16} aria-hidden="true" />
            </span>
            Download image
          </button>
          <button
            type="button"
            role="menuitem"
            className="preview-menu__item"
            onClick={() => {
              onAddDay()
              setOpen(false)
            }}
          >
            <span className="preview-menu__leading">
              <Calendar size={16} aria-hidden="true" />
            </span>
            Add day to Google Calendar
          </button>
          <button
            type="button"
            role="menuitem"
            className="preview-menu__item"
            onClick={() => {
              onAddEachEvent()
              setOpen(false)
            }}
          >
            <span className="preview-menu__leading">
              <Download size={16} aria-hidden="true" />
            </span>
            Add each event to Google Calendar
          </button>
        </div>,
        document.body,
      )
    : null

  return (
    <div className="preview-menu">
      <button
        ref={triggerRef}
        type="button"
        className="preview-menu__trigger"
        aria-label="View options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          const rect = triggerRef.current?.getBoundingClientRect()
          if (rect) {
            setCoords({ top: rect.bottom + 6, left: rect.left })
          }
          setOpen((value) => !value)
        }}
      >
        <Menu size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      {menu}
    </div>
  )
}
