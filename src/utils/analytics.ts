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
  for (const segment of ['/view', '/preview']) {
    const at = path.lastIndexOf(segment)
    if (at === -1) {
      continue
    }
    const after = path.slice(at)
    if (after === segment || after.startsWith(`${segment}/`)) {
      return path.slice(0, at + segment.length)
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
