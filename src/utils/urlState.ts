import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { ItineraryState } from '../types'
import { createEmptyState, isEmptyState, parseItineraryState } from './itinerary'

const PLAN_PARAM = 'plan'
const LZ_PREFIX = 's:'

function getAppRootPath(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function readRawHash(): string {
  return window.location.hash.replace(/^#/, '')
}

function decodePayload(encoded: string): ItineraryState | null {
  if (!encoded) {
    return null
  }

  const json = decompressFromEncodedURIComponent(encoded)
  if (!json) {
    return null
  }

  try {
    return parseItineraryState(JSON.parse(json) as unknown)
  } catch {
    return null
  }
}

function hashFromEncoded(encoded: string): string {
  return encoded ? `#${LZ_PREFIX}${encoded}` : ''
}

export function encodeUrlState(state: ItineraryState): string {
  if (isEmptyState(state)) {
    return ''
  }

  return compressToEncodedURIComponent(JSON.stringify(state))
}

export function readUrlState(): ItineraryState | null {
  const rawHash = readRawHash()
  if (rawHash.startsWith(LZ_PREFIX)) {
    const fromHash = decodePayload(rawHash.slice(LZ_PREFIX.length))
    if (fromHash) {
      return fromHash
    }
  }

  if (rawHash.startsWith(`${PLAN_PARAM}=`)) {
    const fromHashPlan = decodePayload(rawHash.slice(`${PLAN_PARAM}=`.length))
    if (fromHashPlan) {
      return fromHashPlan
    }
  }

  const params = new URLSearchParams(window.location.search)
  return decodePayload(params.get(PLAN_PARAM) ?? '')
}

export function writeUrlState(state: ItineraryState): void {
  const encoded = encodeUrlState(state)
  const url = new URL(window.location.href)
  url.searchParams.delete(PLAN_PARAM)
  url.hash = encoded ? `${LZ_PREFIX}${encoded}` : ''

  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) {
    return
  }

  window.history.replaceState(null, '', next)
}

export function hydrateState(): ItineraryState {
  const state = readUrlState() ?? createEmptyState()
  writeUrlState(state)
  return state
}

export function createPreviewLocation(state: ItineraryState): {
  pathname: string
  hash: string
} {
  return {
    pathname: '/preview',
    hash: hashFromEncoded(encodeUrlState(state)),
  }
}

export function createEditorLocation(state: ItineraryState): {
  pathname: string
  hash: string
} {
  return {
    pathname: '/',
    hash: hashFromEncoded(encodeUrlState(state)),
  }
}

export function createPreviewUrl(state: ItineraryState): string {
  const root = getAppRootPath()
  return `${window.location.origin}${root}/preview${hashFromEncoded(encodeUrlState(state))}`
}
