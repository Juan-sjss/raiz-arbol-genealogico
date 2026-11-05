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
      className={`person-card sex-${person.sex ?? 'pending'}${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
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
      <svg className="leaf-vein" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 2 C52 28 52 72 50 98" className="leaf-vein-main" />
        <path d="M50 20 C60 26 68 28 78 28 M50 34 C62 40 72 42 84 42 M50 48 C60 54 68 56 78 56 M50 64 C58 68 64 70 74 70 M50 20 C40 26 32 28 22 28 M50 34 C38 40 28 42 16 42 M50 48 C40 54 32 56 22 56 M50 64 C42 68 36 70 26 70" className="leaf-vein-small" />
      </svg>
    </button>
  )
}
