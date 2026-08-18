import {
  compressToUint8Array,
  decompressFromEncodedURIComponent,
  decompressFromUint8Array,
} from 'lz-string'
import type { ItineraryState } from '../types'
import { createEmptyState, isEmptyState, parseItineraryState, serializeItineraryState } from './itinerary'

const PLAN_PARAM = 'plan'
const LZ_PREFIX = 's:'
const PLAN_STORAGE_KEY = 'plannr-plan'
// Letters and numbers only. iMessage/Signal drop a URL after 301 Base64-like
// characters with no hyphen, so payloads are hyphenated every 64 chars.
const PAYLOAD_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const PAYLOAD_GROUP_SIZE = 64
const SLUG_MAX_LENGTH = 48

function getAppRootPath(): string {
  const base = import.meta.env.BASE_URL
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function getRelativePathname(pathname: string): string {
  const root = getAppRootPath()
  if (root && (pathname === root || pathname.startsWith(`${root}/`))) {
    return pathname.slice(root.length) || '/'
  }
  return pathname
}

function isEditorPath(pathname: string): boolean {
  const relative = getRelativePathname(pathname)
  return relative === '/edit' || relative.startsWith('/edit/')
}

function isViewPath(pathname: string): boolean {
  const relative = getRelativePathname(pathname)
  return (
    relative === '/view' ||
    relative.startsWith('/view/') ||
    relative === '/preview' ||
    relative.startsWith('/preview/')
  )
}

function readRawHash(): string {
  return window.location.hash.replace(/^#/, '')
}

function hyphenatePayload(payload: string): string {
  if (payload.length <= PAYLOAD_GROUP_SIZE) {
    return payload
  }

  const groups: string[] = []
  for (let index = 0; index < payload.length; index += PAYLOAD_GROUP_SIZE) {
    groups.push(payload.slice(index, index + PAYLOAD_GROUP_SIZE))
  }
  return groups.join('-')
}

function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '')

  return slug
}

function encodeBaseAlphabet(bytes: Uint8Array, alphabet: string): string {
  if (bytes.length === 0) {
    return ''
  }

  const base = BigInt(alphabet.length)
  let leadingZeros = 0
  for (const byte of bytes) {
    if (byte !== 0) {
      break
    }
    leadingZeros += 1
  }

  let value = 0n
  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte)
  }

  if (value === 0n) {
    return alphabet[0].repeat(bytes.length)
  }

  let encoded = ''
  while (value > 0n) {
    encoded = alphabet[Number(value % base)] + encoded
    value /= base
  }

  return alphabet[0].repeat(leadingZeros) + encoded
}

function decodeBaseAlphabet(encoded: string, alphabet: string): Uint8Array | null {
  if (!encoded) {
    return new Uint8Array()
  }

  const base = BigInt(alphabet.length)
  const lookup = new Map([...alphabet].map((char, index) => [char, BigInt(index)]))

  let leadingZeros = 0
  for (const char of encoded) {
    if (char !== alphabet[0]) {
      break
    }
    leadingZeros += 1
  }

  let value = 0n
  for (const char of encoded) {
    const digit = lookup.get(char)
    if (digit === undefined) {
      return null
    }
    value = value * base + digit
  }

  const bytes: number[] = []
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn))
    value >>= 8n
  }

  return Uint8Array.from(Array.from({ length: leadingZeros }, () => 0).concat(bytes))
}

function parseJsonState(json: string | null | undefined): ItineraryState | null {
  if (!json) {
    return null
  }

  try {
    return parseItineraryState(JSON.parse(json) as unknown)
  } catch {
    return null
  }
}

function decodeLegacyPayload(encoded: string): ItineraryState | null {
  return parseJsonState(decompressFromEncodedURIComponent(encoded))
}

function decodeCompactPayload(encoded: string): ItineraryState | null {
  if (!encoded || /[^A-Za-z0-9]/.test(encoded)) {
    return null
  }

  const bytes = decodeBaseAlphabet(encoded, PAYLOAD_ALPHABET)
  if (!bytes || bytes.length === 0) {
    return null
  }

  try {
    return parseJsonState(decompressFromUint8Array(bytes))
  } catch {
    return null
  }
}

function decodePayload(encoded: string): ItineraryState | null {
  if (!encoded) {
    return null
  }

  return decodeCompactPayload(encoded.replace(/-/g, '')) ?? decodeLegacyPayload(encoded)
}

function extractPayload(raw: string): string {
  if (!raw) {
    return ''
  }

  if (raw.startsWith(LZ_PREFIX)) {
    return raw.slice(LZ_PREFIX.length)
  }

  if (raw.startsWith(`${PLAN_PARAM}=`)) {
    return raw.slice(`${PLAN_PARAM}=`.length)
  }

  const slash = raw.lastIndexOf('/')
  if (slash !== -1) {
    return raw.slice(slash + 1)
  }

  return raw
}

function readPathPayload(): string {
  const relative = getRelativePathname(window.location.pathname)
  for (const prefix of ['/view/', '/preview/']) {
    if (!relative.startsWith(prefix)) {
      continue
    }

    const rest = relative.slice(prefix.length).replace(/\/+$/, '')
    const segments = rest.split('/').filter(Boolean)
    return segments.at(-1) ?? ''
  }

  return ''
}

function viewRelativePath(state: ItineraryState): string {
  const payload = hyphenatePayload(encodeUrlState(state))
  if (!payload) {
    return '/view'
  }

  const slug = slugify(state.title)
  return slug ? `/view/${slug}/${payload}` : `/view/${payload}`
}

function viewPathname(state: ItineraryState): string {
  return `${getAppRootPath()}${viewRelativePath(state)}`
}

export function encodeUrlState(state: ItineraryState): string {
  if (isEmptyState(state)) {
    return ''
  }

  const json = JSON.stringify(serializeItineraryState(state))
  return encodeBaseAlphabet(compressToUint8Array(json), PAYLOAD_ALPHABET)
}

export function readUrlState(): ItineraryState | null {
  const fromPath = decodePayload(readPathPayload())
  if (fromPath) {
    return fromPath
  }

  const fromHash = decodePayload(extractPayload(readRawHash()))
  if (fromHash) {
    return fromHash
  }

  const params = new URLSearchParams(window.location.search)
  return decodePayload(params.get(PLAN_PARAM) ?? '')
}

export function hasUrlPlanPayload(): boolean {
  if (readPathPayload()) {
    return true
  }

  if (readRawHash()) {
    return true
  }

  return new URLSearchParams(window.location.search).has(PLAN_PARAM)
}

function readStoredState(): ItineraryState | null {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY)
    if (!raw) {
      return null
    }

    return parseItineraryState(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function writeStoredState(state: ItineraryState): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(serializeItineraryState(state)))
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredState(): void {
  try {
    localStorage.removeItem(PLAN_STORAGE_KEY)
  } catch {
    // ignore quota / private mode
  }
}

export function readSavedPlan(): ItineraryState | null {
  const stored = readStoredState()
  if (!stored || isEmptyState(stored)) {
    return null
  }

  return stored
}

export function writeUrlState(state: ItineraryState): void {
  if (!isEmptyState(state)) {
    writeStoredState(state)
  }

  const url = new URL(window.location.href)
  url.searchParams.delete(PLAN_PARAM)

  if (isViewPath(url.pathname)) {
    url.pathname = viewPathname(state)
    url.hash = ''
  } else if (isEditorPath(url.pathname)) {
    url.hash = hyphenatePayload(encodeUrlState(state))
  }

  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) {
    return
  }

  window.history.replaceState(null, '', next)
}

export function hydrateState(): ItineraryState {
  const fromUrl = readUrlState()
  if (fromUrl) {
    writeUrlState(fromUrl)
    return fromUrl
  }

  if (hasUrlPlanPayload()) {
    writeUrlState(createEmptyState())
    return createEmptyState()
  }

  const fromStorage = readStoredState()
  if (fromStorage && !isEmptyState(fromStorage)) {
    writeUrlState(fromStorage)
    return fromStorage
  }

  writeUrlState(createEmptyState())
  return createEmptyState()
}

export function createViewLocation(state: ItineraryState): {
  pathname: string
} {
  return {
    pathname: viewRelativePath(state),
  }
}

export function createEditorLocation(state: ItineraryState): {
  pathname: string
  hash: string
} {
  const encoded = hyphenatePayload(encodeUrlState(state))
  return {
    pathname: '/edit',
    hash: encoded ? `#${encoded}` : '',
  }
}

export function createViewUrl(state: ItineraryState): string {
  return `${window.location.origin}${viewPathname(state)}`
}
