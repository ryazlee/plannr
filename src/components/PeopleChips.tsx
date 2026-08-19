import { personCssVars } from '../utils/personColor'
import type { CSSProperties } from 'react'

type PeopleChipsProps = {
  people: string[]
  assigned: string[]
  onTogglePerson: (name: string) => void
}

export default function PeopleChips({
  people,
  assigned,
  onTogglePerson,
}: PeopleChipsProps) {
  if (people.length === 0) {
    return null
  }

  return (
    <div className="chip-row" onClick={(click) => click.stopPropagation()}>
      {people.map((person) => {
        const isAssigned = assigned.includes(person)
        return (
          <button
            key={person}
            type="button"
            className={['chip', 'chip--person', isAssigned ? 'chip--active' : null].filter(Boolean).join(' ')}
            style={personCssVars(person, people) as CSSProperties}
            onClick={() => onTogglePerson(person)}
          >
            {person}
          </button>
        )
      })}
    </div>
  )
}
