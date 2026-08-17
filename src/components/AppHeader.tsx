import ThemeToggle from './ThemeToggle'

type AppHeaderProps = {
  title: string
  subtitle?: string
  mode: 'editing' | 'viewing'
}

export default function AppHeader({
  title,
  subtitle = 'Plan a day, drop pins, share the link.',
  mode,
}: AppHeaderProps) {
  const modeLabel = mode === 'editing' ? 'Editing' : 'Viewing'

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand-block">
          <div className="brand-row">
            <h1 className="brand">{title}</h1>
            <span className={`mode-tag mode-tag--${mode}`}>{modeLabel}</span>
          </div>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
