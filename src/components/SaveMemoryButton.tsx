import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Download } from 'lucide-react'
import Button from './Button'
import MemoryCard from './MemoryCard'
import type { ItineraryState } from '../types'
import { hasLocation } from '../utils/itinerary'
import {
  applyMemoryCardLayout,
  captureMemoryPng,
  measureMemoryCardLayout,
  memoryFilename,
  saveMemoryPng,
  waitForMemoryCard,
} from '../utils/memoryImage'

export type SaveMemoryHandle = {
  open: () => void
}

type SaveMemoryButtonProps = {
  itinerary: ItineraryState
  onNotice: (message: string) => void
  variant?: 'secondary' | 'ghost'
  size?: 'sm'
  label?: string
  block?: boolean
}

const SaveMemoryButton = forwardRef<SaveMemoryHandle, SaveMemoryButtonProps>(
  function SaveMemoryButton(
    {
      itinerary,
      onNotice,
      variant = 'ghost',
      size,
      label = 'Download',
      block = false,
    },
    ref,
  ) {
    const [open, setOpen] = useState(false)
    const [rendering, setRendering] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [includeMap, setIncludeMap] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
    const [previewError, setPreviewError] = useState(false)
    const captureRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)
    const previewUrlRef = useRef<string | null>(null)
    const layout = open ? measureMemoryCardLayout() : null
    const headingId = useId()
    const optionId = useId()
    const canIncludeMap = itinerary.events.some(hasLocation)
    const busy = rendering || sharing

    function revokePreview() {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
    }

    function closeDialog() {
      if (sharing) {
        return
      }
      setOpen(false)
    }

    function openDialog() {
      if (itinerary.events.length === 0) {
        onNotice('Add an event first.')
        return
      }

      setIncludeMap(canIncludeMap)
      setPreviewError(false)
      setOpen(true)
    }

    useImperativeHandle(ref, () => ({ open: openDialog }))

    useEffect(() => {
      if (!open) {
        revokePreview()
        setPreviewUrl(null)
        setPreviewBlob(null)
        setRendering(false)
        setSharing(false)
        setPreviewError(false)
        return
      }

      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !sharing) {
          setOpen(false)
        }
      }

      document.addEventListener('keydown', onKeyDown)
      return () => {
        document.body.style.overflow = previousOverflow
        document.removeEventListener('keydown', onKeyDown)
      }
    }, [open, sharing])

    useEffect(() => {
      if (!open) {
        return
      }

      let cancelled = false
      const withMap = includeMap && canIncludeMap

      setRendering(true)
      setPreviewError(false)

      void (async () => {
        try {
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve())
          })
          if (cancelled) {
            return
          }

          const capture = captureRef.current
          const root = cardRef.current
          if (!capture || !root) {
            throw new Error('missing-card')
          }

          applyMemoryCardLayout(capture)
          await waitForMemoryCard(root, withMap)
          if (cancelled) {
            return
          }

          const blob = await captureMemoryPng(root)
          if (cancelled) {
            return
          }

          const url = URL.createObjectURL(blob)
          revokePreview()
          previewUrlRef.current = url
          setPreviewBlob(blob)
          setPreviewUrl(url)
        } catch {
          if (!cancelled) {
            setPreviewError(true)
            setPreviewBlob(null)
          }
        } finally {
          if (!cancelled) {
            setRendering(false)
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }, [open, includeMap, canIncludeMap])

    useEffect(() => {
      return () => revokePreview()
    }, [])

    async function downloadOrShare() {
      if (!previewBlob || busy) {
        return
      }

      const title = itinerary.title.trim() || 'Untitled plan'
      setSharing(true)
      try {
        const result = await saveMemoryPng(previewBlob, memoryFilename(title), title)
        if (result === 'downloaded') {
          onNotice('Downloaded a PNG of this day.')
        }
        setOpen(false)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
        onNotice('Could not download the image. Try again.')
      } finally {
        setSharing(false)
      }
    }

    const dialog =
      open && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                className="memory-capture"
                ref={captureRef}
                style={
                  layout
                    ? ({
                        '--memory-card-width': `${layout.width}px`,
                        '--memory-card-pad': `${layout.pad}px`,
                      } as CSSProperties)
                    : undefined
                }
                aria-hidden="true"
                inert
              >
                <MemoryCard ref={cardRef} itinerary={itinerary} includeMap={includeMap && canIncludeMap} />
              </div>
              <div
                className="memory-dialog-backdrop"
                onClick={() => {
                  closeDialog()
                }}
              >
                <div
                  className="memory-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 className="memory-dialog__title" id={headingId}>
                    Download
                  </h2>
                  <p className="memory-dialog__copy">
                    Preview this day, then download it to your device or share it.
                  </p>

                  {canIncludeMap ? (
                    <label className="memory-dialog__option" htmlFor={optionId}>
                      <input
                        id={optionId}
                        type="checkbox"
                        checked={includeMap}
                        disabled={sharing}
                        onChange={(event) => setIncludeMap(event.target.checked)}
                      />
                      Include map
                    </label>
                  ) : null}

                  <div className="memory-dialog__preview">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview of this day’s itinerary" />
                    ) : null}
                    {rendering ? (
                      <p
                        className={[
                          'memory-dialog__status',
                          previewUrl ? 'memory-dialog__status--overlay' : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {previewUrl ? 'Updating preview…' : 'Creating preview…'}
                      </p>
                    ) : null}
                    {!rendering && previewError ? (
                      <p className="memory-dialog__status">Could not create a preview. Try again.</p>
                    ) : null}
                  </div>

                  <div className="memory-dialog__actions">
                    <Button
                      label="Cancel"
                      variant="ghost"
                      disabled={sharing}
                      onClick={closeDialog}
                    />
                    <Button
                      label={sharing ? 'Opening…' : 'Download'}
                      icon={sharing ? undefined : <Download size={16} />}
                      disabled={!previewBlob || busy}
                      onClick={() => {
                        void downloadOrShare()
                      }}
                    />
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null

    return (
      <>
        <Button
          label={label}
          icon={<Download size={16} />}
          variant={variant}
          size={size}
          block={block}
          title="Download image"
          onClick={openDialog}
        />
        {dialog}
      </>
    )
  },
)

export default SaveMemoryButton
