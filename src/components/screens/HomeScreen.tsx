import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../AppHeader'
import Button from '../Button'
import { formatDisplayDate, formatTimeRange } from '../../utils/itinerary'
import { applyShareMeta } from '../../utils/shareMeta'
import { hasUrlPlanPayload, readSavedPlan } from '../../utils/urlState'

export default function HomeScreen() {
  const navigate = useNavigate()
  const hasPayload = hasUrlPlanPayload()
  const saved = useMemo(() => (hasPayload ? null : readSavedPlan()), [hasPayload])

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

  const savedTitle = saved?.title.trim() || 'Untitled plan'
  const savedMeta = saved
    ? [
        formatDisplayDate(saved.date),
        formatTimeRange(saved.events),
        saved.events.length > 0
          ? `${saved.events.length} event${saved.events.length === 1 ? '' : 's'}`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <div className="app-shell app-shell--home">
      <AppHeader title="Plannr" quiet />
      <main className="app-main">
        <div className="shell-inner">
          <div className="home">
            <p className="home__lede">
              Build a day plan with a timeline and a map. Share a view-only link when you’re ready.
            </p>

            {saved ? (
              <Link className="home__saved" to="/edit">
                <span className="home__saved-kicker">Saved on this device</span>
                <span className="home__saved-title">{savedTitle}</span>
                {savedMeta ? <span className="home__saved-meta">{savedMeta}</span> : null}
              </Link>
            ) : null}

            <Button label={saved ? 'Continue plan' : 'Start a plan'} to="/edit" />
          </div>
        </div>
      </main>
    </div>
  )
}
