import { useState } from 'react'

export const PREVIEW_MODE_KEY = 'plannr-preview-mode'

export type PreviewMode = 'timeline' | 'map' | 'split'

function isPreviewMode(value: string | null): value is PreviewMode {
  return value === 'timeline' || value === 'map' || value === 'split'
}

function loadPreviewMode(): PreviewMode {
  try {
    const raw = localStorage.getItem(PREVIEW_MODE_KEY)
    return isPreviewMode(raw) ? raw : 'split'
  } catch {
    return 'split'
  }
}

function savePreviewMode(mode: PreviewMode) {
  try {
    localStorage.setItem(PREVIEW_MODE_KEY, mode)
  } catch {
    // ignore quota / private mode
  }
}

export function usePreviewMode(): [PreviewMode, (mode: PreviewMode) => void] {
  const [mode, setMode] = useState<PreviewMode>(loadPreviewMode)

  function update(next: PreviewMode) {
    setMode(next)
    savePreviewMode(next)
  }

  return [mode, update]
}

export function effectivePreviewMode(mode: PreviewMode, isDesktop: boolean): PreviewMode {
  if (!isDesktop && mode === 'split') {
    return 'timeline'
  }

  return mode
}
