import Button from './Button'
import SectionCard from './SectionCard'
import { personCssVars } from '../utils/personColor'
import type { CSSProperties } from 'react'

type PeoplePanelProps = {
  personDraft: string
  people: string[]
  onPersonDraftChange: (value: string) => void
  onAddPerson: () => void
  onRemovePerson: (name: string) => void
}

export default function PeoplePanel({
  personDraft,
  people,
  onPersonDraftChange,
  onAddPerson,
  onRemovePerson,
}: PeoplePanelProps) {
  return (
    <div className="planner-people">
      <SectionCard title="People" plain>
        <div className="stack">
          <div className="chip-row">
            {people.length > 0 ? (
              people.map((person) => (
                <button
                  key={person}
                  type="button"
                  onClick={() => onRemovePerson(person)}
                  className="chip chip--active chip--person"
                  style={personCssVars(person, people) as CSSProperties}
                  title={`Remove ${person}`}
                >
                  {person} ×
                </button>
              ))
            ) : (
              <p className="empty-hint">Add who’s coming.</p>
            )}
          </div>

          <div className="inline-add">
            <input
              value={personDraft}
              onChange={(event) => onPersonDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onAddPerson()
                }
              }}
              placeholder="Name"
              className="input"
              aria-label="Add a person"
            />
            <Button label="Add" onClick={onAddPerson} />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
