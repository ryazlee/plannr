import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import AppHeader from '../AppHeader'
import Button from '../Button'
import MakerCredit from '../MakerCredit'
import { formatDisplayDate, formatTimeRange } from '../../utils/itinerary'
import { applyShareMeta } from '../../utils/shareMeta'
import { hasUrlPlanPayload, createNewPlanLocation, createEditorLocation } from '../../utils/urlState'
import { readStoredPlans, removeStoredPlan, type StoredPlan } from '../../utils/planStorage'

function planMeta(plan: StoredPlan): string {
  return [
    formatDisplayDate(plan.state.date),
    formatTimeRange(plan.state.events),
    plan.state.events.length > 0
      ? `${plan.state.events.length} event${plan.state.events.length === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const hasPayload = hasUrlPlanPayload()
  const [plans, setPlans] = useState<StoredPlan[]>(() => (hasPayload ? [] : readStoredPlans()))

  useEffect(() => {
    applyShareMeta(
      undefined,
      'Build a day plan with a timeline and a map. Share a view-only link when you’re ready.',
    )
  }, [])

  useEffect(() => {
    if (!hasPayload) {
      return
    }

    navigate(
      {
        pathname: '/edit',
        search: window.location.search,
        hash: window.location.hash,
      },
      { replace: true },
    )
  }, [hasPayload, navigate])

  if (hasPayload) {
    return null
  }

  function removePlan(planId: string) {
    removeStoredPlan(planId)
    setPlans(readStoredPlans())
  }

  return (
    <div className="app-shell app-shell--home">
      <AppHeader title="Plannr" quiet />
      <main className="app-main">
        <div className="shell-inner">
          <div className="home">
            <div className="home__copy">
              <p className="home__lede">
                Build a day plan with a timeline and a map. Share a view-only link when you’re ready.
              </p>
              <p className="home__note">No accounts, no ads, all free. Up to five plans on this device.</p>
            </div>

            {plans.length > 0 ? (
              <div className="home__plans">
                <p className="home__saved-kicker">Saved on this device</p>
                <ul className="home__plan-list">
                  {plans.map((plan) => {
                    const title = plan.state.title.trim() || 'Untitled plan'
                    const meta = planMeta(plan)
                    return (
                      <li key={plan.id} className="home__saved">
                        <Link className="home__saved-main" to={createEditorLocation(plan.state)}>
                          <span className="home__saved-title">{title}</span>
                          {meta ? <span className="home__saved-meta">{meta}</span> : null}
                        </Link>
                        <button
                          type="button"
                          className="home__saved-remove"
                          aria-label={`Remove ${title} from this device`}
                          title="Remove from this device"
                          onClick={() => removePlan(plan.id)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}

            <div className="home__actions">
              <Button
                label="Start a new plan"
                variant={plans.length > 0 ? 'secondary' : 'primary'}
                to={createNewPlanLocation()}
              />
            </div>
          </div>
        </div>
      </main>
      <footer className="app-footer">
        <MakerCredit />
      </footer>
    </div>
  )
}
