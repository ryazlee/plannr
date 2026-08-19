export const MEMORY_SITE_LABEL = 'ryazlee.github.io/plannr'
export const MEMORY_MAP_CREDIT = 'Map data © OpenStreetMap, CARTO'
export const MEMORY_CARD_WIDTH = 720

const LAYOUT_SELECTORS = [
  '.preview-timeline',
  '.preview-hero__copy',
  '.planner-timeline',
  '.planner-sidebar',
]

export function measureMemoryCardLayout(): { width: number; pad: number } {
  const pad = window.matchMedia('(min-width: 768px)').matches ? 24 : 16

  for (const selector of LAYOUT_SELECTORS) {
    const element = document.querySelector(selector)
    if (element instanceof HTMLElement && element.clientWidth >= 200) {
      return { width: Math.round(element.clientWidth) + pad * 2, pad }
    }
  }

  const inner = Math.min(MEMORY_CARD_WIDTH, Math.max(320, window.innerWidth - pad * 2))
  return { width: inner + pad * 2, pad }
}

export function applyMemoryCardLayout(capture: HTMLElement): void {
  const { width, pad } = measureMemoryCardLayout()
  capture.style.setProperty('--memory-card-width', `${width}px`)
  capture.style.setProperty('--memory-card-pad', `${pad}px`)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function waitUntil(predicate: () => boolean, timeoutMs: number): Promise<boolean> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (predicate()) {
      return true
    }
    await delay(80)
  }
  return predicate()
}

function tilesReady(root: HTMLElement): boolean {
  const tiles = [...root.querySelectorAll('img.leaflet-tile')]
  if (tiles.length === 0) {
    return false
  }

  return tiles.every((node) => {
    const image = node as HTMLImageElement
      return image.complete && image.naturalWidth > 0 && image.classList.contains('leaflet-tile-loaded')
  })
}

export async function waitForMemoryCard(root: HTMLElement, includeMap: boolean): Promise<void> {
  await nextFrame()
  await nextFrame()

  if (includeMap) {
    await delay(450)
    await waitUntil(() => tilesReady(root), 5000)
  }

  await waitUntil(() => {
    return [...root.querySelectorAll('img')].every((image) => image.complete)
  }, 2000)

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // Font loading should not block a save.
    }
  }

  await delay(160)
  await nextFrame()
}

function pageBackground(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  return value || '#fafafa'
}

function flattenFlexGaps(root: HTMLElement): void {
  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')]

  for (const element of elements) {
    const styles = getComputedStyle(element)
    if (!styles.display.includes('flex')) {
      continue
    }

    const rowGap = Number.parseFloat(styles.rowGap) || 0
    const columnGap = Number.parseFloat(styles.columnGap) || 0
    if (rowGap <= 0 && columnGap <= 0) {
      continue
    }

    const vertical = styles.flexDirection.startsWith('column')
    const children = [...element.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== 'none',
    )

    element.style.gap = '0px'
    element.style.rowGap = '0px'
    element.style.columnGap = '0px'

    children.forEach((child, index) => {
      if (index === 0) {
        return
      }
      if (vertical && rowGap > 0) {
        child.style.marginTop = `${rowGap}px`
      }
      if (!vertical && columnGap > 0) {
        child.style.marginLeft = `${columnGap}px`
      }
    })
  }
}

function flattenCaptureLayout(root: HTMLElement): void {
  flattenFlexGaps(root)

  const elements = [root, ...root.querySelectorAll<HTMLElement>('*')]
  for (const element of elements) {
    const styles = getComputedStyle(element)
    if (!styles.display.includes('grid')) {
      continue
    }

    const children = [...element.children].filter(
      (child): child is HTMLElement => child instanceof HTMLElement && getComputedStyle(child).display !== 'none',
    )
    if (children.length === 0) {
      continue
    }

    element.style.display = 'flex'
    element.style.flexDirection = 'row'
    element.style.flexWrap = 'nowrap'
    element.style.alignItems = styles.alignItems === 'center' ? 'center' : 'flex-start'
    element.style.columnGap = '0px'
    element.style.rowGap = '0px'
    element.style.gap = '0px'
    element.style.gridTemplateColumns = 'none'

    children.forEach((child) => {
      const width = Math.ceil(child.getBoundingClientRect().width)
      if (width > 0) {
        child.style.flex = `0 0 ${width}px`
        child.style.width = `${width}px`
        child.style.maxWidth = `${width}px`
        child.style.minWidth = '0'
        child.style.boxSizing = 'border-box'
      }
    })

    const last = children[children.length - 1]
    if (last) {
      last.style.flex = '1 1 auto'
      last.style.width = 'auto'
      last.style.maxWidth = '100%'
    }
  }
}

export async function captureMemoryPng(root: HTMLElement): Promise<Blob> {
  flattenCaptureLayout(root)

  const { domToBlob } = await import('modern-screenshot')
  const width = Math.max(root.scrollWidth, root.offsetWidth, 1)
  const height = Math.max(root.scrollHeight, root.offsetHeight, 1)
  const maxEdge = 4096
  const scale = Math.max(1, Math.min(2, maxEdge / width, maxEdge / height))

  const blob = await domToBlob(root, {
    width,
    height,
    scale,
    backgroundColor: pageBackground(),
    maximumCanvasSize: maxEdge,
    timeout: 12_000,
    style: {
      margin: '0',
      position: 'static',
      left: 'auto',
      right: 'auto',
      top: 'auto',
      transform: 'none',
    },
    fetch: {
      requestInit: { mode: 'cors', credentials: 'omit' },
    },
    filter: (node) => {
      if (!(node instanceof Element)) {
        return true
      }
      return !node.classList.contains('leaflet-control-container')
    },
  })

  if (!blob) {
    throw new Error('empty-image')
  }

  return blob
}

export function memoryFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'plannr'}.png`
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function saveMemoryPng(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const withFiles = { files: [file] }
  const withMeta = { files: [file], title, text: title }

  if (typeof navigator.share === 'function') {
    const canShare = typeof navigator.canShare === 'function' ? navigator.canShare.bind(navigator) : null
    const payload = canShare
      ? canShare(withMeta)
        ? withMeta
        : canShare(withFiles)
          ? withFiles
          : null
      : withFiles

    if (payload) {
      try {
        await navigator.share(payload)
        return 'shared'
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }
      }
    }
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
