const SITE_NAME = 'Plannr'
const SITE_TAGLINE = 'Plannr: Lightweight itinerary planner'
const FALLBACK_TITLE = 'plan'

function setMeta(attr: 'property' | 'name', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let element = document.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function applyShareMeta(title?: string, description?: string) {
  const isPlan = title !== undefined
  const planTitle = title?.trim() || FALLBACK_TITLE
  const previewTitle = isPlan ? `View ${planTitle}` : SITE_TAGLINE

  document.title = title?.trim() ? `${planTitle} · ${SITE_NAME}` : previewTitle
  setMeta('property', 'og:title', previewTitle)
  setMeta('property', 'og:url', `${window.location.origin}${window.location.pathname}`)
  setMeta('name', 'twitter:title', previewTitle)

  if (description?.trim()) {
    setMeta('property', 'og:description', description.trim())
    setMeta('name', 'twitter:description', description.trim())
    setMeta('name', 'description', description.trim())
  }
}
