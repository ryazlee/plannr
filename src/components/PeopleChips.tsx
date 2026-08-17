type PeopleChipsProps = {
  people: string[]
  assigned: string[]
  onTogglePerson: (name: string) => void
  onToggleEveryone: () => void
}

export default function PeopleChips({
  people,
  assigned,
  onTogglePerson,
  onToggleEveryone,
}: PeopleChipsProps) {
  if (people.length === 0) {
    return null
  }

  const allAssigned = people.every((person) => assigned.includes(person))

  return (
    <div className="chip-row" onClick={(click) => click.stopPropagation()}>
      <button
        type="button"
        className={['chip', allAssigned ? 'chip--active' : null].filter(Boolean).join(' ')}
        onClick={onToggleEveryone}
      >
        Everyone
      </button>
      {people.map((person) => {
        const isAssigned = assigned.includes(person)
        return (
          <button
            key={person}
            type="button"
            className={['chip', isAssigned ? 'chip--active' : null].filter(Boolean).join(' ')}
            onClick={() => onTogglePerson(person)}
          >
            {person}
          </button>
        )
      })}
    </div>
  )
}
