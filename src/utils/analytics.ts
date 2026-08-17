type GoatCounter = {
  count: (vars?: { path?: string; title?: string; event?: boolean; referrer?: string }) => void
}

declare global {
  interface Window {
    goatcounter?: GoatCounter
  }
}

function getPagePath(): string {
  const path = window.location.pathname
  const previewAt = path.lastIndexOf('/preview')
  if (previewAt !== -1) {
    const after = path.slice(previewAt)
    if (after === '/preview' || after.startsWith('/preview/')) {
      return path.slice(0, previewAt + '/preview'.length)
    }
  }

  return path
}

export function trackPageview(path = getPagePath()): void {
  try {
    window.goatcounter?.count({ path })
  } catch {
    // Analytics should never break the app.
  }
}
