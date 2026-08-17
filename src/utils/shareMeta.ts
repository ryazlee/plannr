const SITE_NAME = 'Plannr'
const FALLBACK_TITLE = 'Shared plan'

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
  const planTitle = title?.trim() || FALLBACK_TITLE
  document.title = title?.trim() ? `${planTitle} · ${SITE_NAME}` : SITE_NAME
  setMeta('property', 'og:title', planTitle)
  setMeta('property', 'og:url', `${window.location.origin}${window.location.pathname}`)
  setMeta('name', 'twitter:title', planTitle)

  if (description?.trim()) {
    setMeta('property', 'og:description', description.trim())
    setMeta('name', 'twitter:description', description.trim())
    setMeta('name', 'description', description.trim())
  }
}
