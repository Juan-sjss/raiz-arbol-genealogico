import { CARD_H, CARD_W } from '../lib/layout'
import { fullName, lifeSpan, type Person } from '../types'

interface PersonCardProps {
  person: Person
  x: number
  y: number
  selected: boolean
  dimmed: boolean
  onSelect: (id: string) => void
}

export function PersonCard({ person, x, y, selected, dimmed, onSelect }: PersonCardProps) {
  const initials =
    `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.trim().toUpperCase() || '?'
  const name = fullName(person) || 'Sin nombre'

  return (
    <button
      type="button"
      className={`person-card sex-${person.sex}${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
      style={{
        width: CARD_W,
        height: CARD_H,
        transform: `translate3d(${x}px, ${y}px, 0)`,
      }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(person.id)
      }}
      aria-label={`${name}${lifeSpan(person) ? `, ${lifeSpan(person)}` : ''}`}
    >
      <span className="person-avatar">
        {person.photo ? (
          <img src={person.photo} alt="" draggable={false} />
        ) : (
          <span className="person-initials">{initials}</span>
        )}
      </span>
      <span className="person-text">
        <span className="person-name">{name}</span>
        <span className="person-meta">{lifeSpan(person) || 'Sin fechas'}</span>
        {person.birthPlace ? <span className="person-place">{person.birthPlace}</span> : null}
      </span>
      <span className="person-flag" aria-hidden="true" />
    </button>
  )
}
