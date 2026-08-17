type TimeFieldsProps = {
  startTime: string
  endTime: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onFocus?: () => void
  inset?: boolean
  startLabel?: string
  endLabel?: string
}

export default function TimeFields({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  onFocus,
  inset = false,
  startLabel = 'Start',
  endLabel = 'End',
}: TimeFieldsProps) {
  const inputClass = ['input', 'input--time', inset ? 'input--on-inset' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="time-fields">
      <label className="field">
        <span className="field__label">{startLabel}</span>
        <input
          className={inputClass}
          type="time"
          value={startTime}
          onChange={(event) => onStartChange(event.target.value)}
          onFocus={onFocus}
          aria-label={startLabel}
        />
      </label>
      <label className="field">
        <span className="field__label">
          {endLabel}
          <span className="field__hint">optional</span>
        </span>
        <input
          className={inputClass}
          type="time"
          value={endTime}
          onChange={(event) => onEndChange(event.target.value)}
          onFocus={onFocus}
          aria-label={`${endLabel}, optional, defaults to plus one hour`}
        />
        {endTime ? null : <span className="field__placeholder-hint">+1 hour if empty</span>}
      </label>
    </div>
  )
}
