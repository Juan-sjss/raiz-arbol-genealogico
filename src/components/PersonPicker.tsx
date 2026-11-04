import { useMemo, useState } from 'react'
import { normalizeText, sortPeople } from '../lib/tree'
import { fullName, lifeSpan, type Person } from '../types'
import { SearchIcon, XIcon } from './Icons'

interface PersonPickerProps {
  title: string
  description?: string
  people: Person[]
  emptyText?: string
  onPick: (id: string) => void
  onClose: () => void
}

export function PersonPicker({
  title,
  description,
  people,
  emptyText = 'No hay personas disponibles para vincular.',
  onPick,
  onClose,
}: PersonPickerProps) {
  const [query, setQuery] = useState('')
  const sorted = useMemo(() => sortPeople(people), [people])
  const results = useMemo(() => {
    const needle = normalizeText(query.trim())
    if (!needle) return sorted
    return sorted.filter((person) =>
      normalizeText(`${person.firstName} ${person.lastName} ${person.birthDate ?? ''}`).includes(
        needle,
      ),
    )
  }, [sorted, query])

  return (
    <div className="sheet-backdrop" onPointerDown={onClose}>
      <div
        className="sheet sheet-compact"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <XIcon />
          </button>
        </header>

        <div className="picker-search">
          <SearchIcon size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o año…"
            autoFocus
          />
        </div>

        <div className="picker-list">
          {results.length === 0 ? (
            <p className="picker-empty">{query ? 'Sin coincidencias.' : emptyText}</p>
          ) : (
            <ul>
              {results.map((person) => (
                <li key={person.id}>
                  <button type="button" className="picker-item" onClick={() => onPick(person.id)}>
                    <span className={`mini-avatar sex-${person.sex}`}>
                      {person.photo ? (
                        <img src={person.photo} alt="" />
                      ) : (
                        <span>
                          {(person.firstName.charAt(0) + person.lastName.charAt(0)).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="relation-info">
                      <span className="relation-name">{fullName(person)}</span>
                      <span className="relation-meta">{lifeSpan(person) || 'Sin fechas'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
