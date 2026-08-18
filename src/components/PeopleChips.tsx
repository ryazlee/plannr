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
