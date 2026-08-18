import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

type AppHeaderProps = {
  title: string
  subtitle?: string
  mode?: 'editing' | 'viewing'
  quiet?: boolean
}

export default function AppHeader({
  title,
  subtitle,
  mode,
  quiet = false,
}: AppHeaderProps) {
  const showMode = Boolean(mode)
  const showSubtitle = Boolean(subtitle) && !quiet

  return (
    <header className={['app-header', quiet ? 'app-header--quiet' : null].filter(Boolean).join(' ')}>
      <div className="app-header-inner">
        <div className="brand-block">
          <div className="brand-row">
            <h1 className="brand">
              <Link to="/">{title}</Link>
            </h1>
            {showMode ? (
              <span className={`mode-tag mode-tag--${mode}`}>{mode === 'editing' ? 'Edit' : 'View'}</span>
            ) : null}
          </div>
          {showSubtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
