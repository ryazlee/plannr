import type { ItineraryState } from '../types'
import { isEmptyState, parseItineraryState, serializeItineraryState } from './itinerary'

export const MAX_STORED_PLANS = 5

const PLANS_KEY = 'plannr-plans'
const LEGACY_PLAN_KEY = 'plannr-plan'

export type StoredPlan = {
  id: string
  updatedAt: number
  state: ItineraryState
}

function fingerprint(state: ItineraryState): string {
  return JSON.stringify(serializeItineraryState(state))
}

function sortPlans(plans: StoredPlan[]): StoredPlan[] {
  return [...plans].sort((left, right) => right.updatedAt - left.updatedAt)
}

function parseStoredPlan(value: unknown): StoredPlan | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<StoredPlan>
  if (typeof candidate.id !== 'string' || !candidate.id) {
    return null
  }

  const state = parseItineraryState(candidate.state)
  if (!state || isEmptyState(state)) {
    return null
  }

  const updatedAt =
    typeof candidate.updatedAt === 'number' && Number.isFinite(candidate.updatedAt)
      ? candidate.updatedAt
      : 0

  return { id: candidate.id, updatedAt, state }
}

function writePlans(plans: StoredPlan[]): void {
  try {
    localStorage.setItem(
      PLANS_KEY,
      JSON.stringify(
        sortPlans(plans)
          .slice(0, MAX_STORED_PLANS)
          .map((plan) => ({
            id: plan.id,
            updatedAt: plan.updatedAt,
            state: serializeItineraryState(plan.state),
          })),
      ),
    )
  } catch {
    // ignore quota / private mode
  }
}

function migrateLegacyPlan(): StoredPlan[] {
  try {
    const raw = localStorage.getItem(LEGACY_PLAN_KEY)
    if (!raw) {
      return []
    }

    const state = parseItineraryState(JSON.parse(raw) as unknown)
    localStorage.removeItem(LEGACY_PLAN_KEY)
    if (!state || isEmptyState(state)) {
      return []
    }

    const plans = [
      {
        id: crypto.randomUUID(),
        updatedAt: Date.now(),
        state,
      },
    ]
    writePlans(plans)
    return plans
  } catch {
    return []
  }
}

export function readStoredPlans(): StoredPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY)
    if (!raw) {
      return migrateLegacyPlan()
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return migrateLegacyPlan()
    }

    const plans: StoredPlan[] = []
    const seen = new Set<string>()
    for (const entry of parsed) {
      const plan = parseStoredPlan(entry)
      if (!plan || seen.has(plan.id)) {
        continue
      }
      seen.add(plan.id)
      plans.push(plan)
    }

    return sortPlans(plans).slice(0, MAX_STORED_PLANS)
  } catch {
    return []
  }
}

export function findStoredPlanByState(state: ItineraryState): StoredPlan | null {
  if (isEmptyState(state)) {
    return null
  }

  const encoded = fingerprint(state)
  return readStoredPlans().find((plan) => fingerprint(plan.state) === encoded) ?? null
}

export function upsertStoredPlan(state: ItineraryState, planId?: string | null): string | null {
  if (isEmptyState(state)) {
    return planId ?? null
  }

  const plans = readStoredPlans()
  const now = Date.now()

  if (planId) {
    const index = plans.findIndex((plan) => plan.id === planId)
    if (index !== -1) {
      plans[index] = { id: planId, updatedAt: now, state }
      writePlans(plans)
      return planId
    }
  }

  const encoded = fingerprint(state)
  const match = plans.find((plan) => fingerprint(plan.state) === encoded)
  if (match) {
    const index = plans.findIndex((plan) => plan.id === match.id)
    plans[index] = { ...match, updatedAt: now, state }
    writePlans(plans)
    return match.id
  }

  const id = planId || crypto.randomUUID()
  writePlans([{ id, updatedAt: now, state }, ...plans.filter((plan) => plan.id !== id)])
  return id
}

export function removeStoredPlan(planId: string): void {
  writePlans(readStoredPlans().filter((plan) => plan.id !== planId))
}
