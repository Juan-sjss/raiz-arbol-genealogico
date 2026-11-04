import { useEffect, useMemo, useRef, useState } from 'react'
import { normalizeText, sortPeople } from '../lib/tree'
import { fullName, lifeSpan, type Person } from '../types'
import { SearchIcon, XIcon } from './Icons'

interface SearchOverlayProps {
  people: Person[]
  onPick: (id: string) => void
  onClose: () => void
}

export function SearchOverlay({ people, onPick, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const needle = normalizeText(query.trim())
    const sorted = sortPeople(people)
    if (!needle) return sorted.slice(0, 12)
    return sorted.filter((person) =>
      normalizeText(
        `${person.firstName} ${person.lastName} ${person.birthPlace ?? ''} ${person.birthDate ?? ''}`,
      ).includes(needle),
    )
  }, [people, query])

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(event) => event.stopPropagation()}>
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en el árbol…"
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
            }}
          />
          <button
            type="button"
            className="icon-button subtle"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
          >
            <XIcon size={17} />
          </button>
        </div>

        <div className="search-results">
          {results.length === 0 ? (
            <p className="picker-empty">Sin coincidencias.</p>
          ) : (
            <ul>
              {results.map((person) => (
                <li key={person.id}>
                  <button type="button" className="search-result" onClick={() => onPick(person.id)}>
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
                      <span className="relation-meta">
                        {[lifeSpan(person), person.birthPlace].filter(Boolean).join(' · ') ||
                          'Sin datos'}
                      </span>
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
