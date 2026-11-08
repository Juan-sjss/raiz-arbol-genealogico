import { useTree } from '../store/TreeStore'
import { childrenOf, parentsOf, partnersOf, petsOfPerson } from '../lib/tree'
import { fullName, lifeSpan, petLifeSpan, petSpeciesLabel, type Person } from '../types'
import {
  ChevronRightIcon,
  HeartIcon,
  LeafIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from './Icons'

export type RelationKind = 'parent' | 'child' | 'partner'

interface PersonPanelProps {
  person: Person
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onFocus: (id: string) => void
  onCreateRelative: (kind: RelationKind) => void
  onLinkExisting: (kind: RelationKind) => void
  onAddPet: () => void
  onEditPet: (petId: string) => void
  onDeletePet: (petId: string) => void
}

interface RelationListProps {
  title: string
  people: Person[]
  emptyText: string
  onFocus: (id: string) => void
  onRemove: (id: string) => void
  onAdd: () => void
  onLink: () => void
}

function RelationList({
  title,
  people,
  emptyText,
  onFocus,
  onRemove,
  onAdd,
  onLink,
}: RelationListProps) {
  return (
    <section className="relation-group">
      <div className="relation-head">
        <h3>{title}</h3>
        <span className="counter">{people.length}</span>
      </div>
      {people.length === 0 ? (
        <p className="relation-empty">{emptyText}</p>
      ) : (
        <ul className="relation-list">
          {people.map((relative) => (
            <li key={relative.id} className="relation-item">
              <button type="button" className="relation-main" onClick={() => onFocus(relative.id)}>
                <span className={`mini-avatar sex-${relative.sex ?? 'pending'}`}>
                  {relative.photo ? (
                    <img src={relative.photo} alt="" />
                  ) : (
                    <span>{(relative.firstName.charAt(0) + relative.lastName.charAt(0)).toUpperCase()}</span>
                  )}
                </span>
                <span className="relation-info">
                  <span className="relation-name">{fullName(relative)}</span>
                  <span className="relation-meta">{lifeSpan(relative) || 'Sin fechas'}</span>
                </span>
                <ChevronRightIcon size={16} />
              </button>
              <button
                type="button"
                className="icon-button subtle"
                onClick={() => onRemove(relative.id)}
                aria-label={`Desvincular a ${fullName(relative)}`}
                title="Desvincular"
              >
                <XIcon size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relation-actions">
        <button type="button" className="text-button" onClick={onAdd}>
          <PlusIcon size={16} /> Nueva persona
        </button>
        <button type="button" className="text-button" onClick={onLink}>
          <LinkIcon size={16} /> Vincular existente
        </button>
      </div>
    </section>
  )
}

export function PersonPanel({
  person,
  onClose,
  onEdit,
  onDelete,
  onFocus,
  onCreateRelative,
  onLinkExisting,
  onAddPet,
  onEditPet,
  onDeletePet,
}: PersonPanelProps) {
  const { data, unlink } = useTree()

  const parents = parentsOf(data, person.id)
  const partners = partnersOf(data, person.id)
  const children = childrenOf(data, person.id)
  const pets = petsOfPerson(data, person.id)

  const removeParent = (parentId: string) => {
    const rel = data.relationships.find(
      (r) => r.type === 'parent' && r.from === parentId && r.to === person.id,
    )
    if (rel) unlink(rel.id)
  }

  const removeChild = (childId: string) => {
    const rel = data.relationships.find(
      (r) => r.type === 'parent' && r.from === person.id && r.to === childId,
    )
    if (rel) unlink(rel.id)
  }

  const removePartner = (partnerId: string) => {
    const rel = data.relationships.find(
      (r) =>
        r.type === 'partner' &&
        ((r.from === person.id && r.to === partnerId) || (r.from === partnerId && r.to === person.id)),
    )
    if (rel) unlink(rel.id)
  }

  const initials =
    `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.trim().toUpperCase() || '?'
  const facts = [
    { label: 'Nacimiento', value: person.birthDate },
    { label: 'Fallecimiento', value: person.deathDate },
    { label: 'Lugar de nacimiento', value: person.birthPlace },
    { label: 'Ocupación', value: person.occupation },
  ].filter((fact) => fact.value)

  return (
    <aside className="panel" aria-label={`Ficha de ${fullName(person)}`}>
      <div className="panel-grabber" aria-hidden="true" />
      <div className="panel-toolbar">
        <button type="button" className="icon-button" onClick={onEdit} aria-label="Editar persona">
          <PencilIcon />
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar ficha">
          <XIcon />
        </button>
      </div>

      <div className="panel-scroll">
        <header className="panel-header">
          <span className={`big-avatar sex-${person.sex ?? 'pending'}`}>
            {person.photo ? <img src={person.photo} alt="" /> : <span>{initials}</span>}
          </span>
          <div className="panel-title">
            <h2>{fullName(person) || 'Sin nombre'}</h2>
            <p className="panel-dates">{lifeSpan(person) || 'Sin fechas registradas'}</p>
            <p className="panel-kind">
              <UsersIcon size={14} />
              {person.sex === 'male' ? 'Hombre' : person.sex === 'female' ? 'Mujer' : 'Sexo sin elegir'}
            </p>
          </div>
        </header>

        {person.sex === null ? (
          <div className="pet-section">
            <p className="panel-muted">Falta elegir el sexo de esta persona.</p>
            <button type="button" className="text-button" onClick={onEdit}>
              Completar ficha
            </button>
          </div>
        ) : null}

        {facts.length > 0 ? (
          <dl className="facts">
            {facts.map((fact) => (
              <div key={fact.label} className="fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="panel-muted">Aún no hay datos biográficos.</p>
        )}

        {person.notes ? (
          <div className="notes">
            <h3>Notas</h3>
            <p>{person.notes}</p>
          </div>
        ) : null}

        <section className="relation-group">
          <div className="relation-head">
            <h3>Mascotas</h3>
            <span className="counter">{pets.length}</span>
          </div>
          {pets.length === 0 ? (
            <p className="relation-empty">Sin mascotas registradas.</p>
          ) : (
            <ul className="relation-list">
              {pets.map((pet) => (
                <li key={pet.id} className="relation-item">
                  <div className="relation-main">
                    <span className="mini-avatar pet-avatar">
                      {pet.photo ? <img src={pet.photo} alt="" /> : <LeafIcon size={16} />}
                    </span>
                    <span className="relation-info">
                      <span className="relation-name">{pet.name}</span>
                      <span className="relation-meta">
                        {petSpeciesLabel(pet.species)}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                        {petLifeSpan(pet) ? ` · ${petLifeSpan(pet)}` : ''}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button subtle"
                    onClick={() => onEditPet(pet.id)}
                    aria-label={`Editar ${pet.name}`}
                    title="Editar"
                  >
                    <PencilIcon size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button subtle"
                    onClick={() => onDeletePet(pet.id)}
                    aria-label={`Eliminar ${pet.name}`}
                    title="Eliminar"
                  >
                    <TrashIcon size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="relation-actions">
            <button type="button" className="text-button" onClick={onAddPet}>
              <PlusIcon size={16} /> Añadir mascota
            </button>
          </div>
        </section>

        <RelationList
          title="Padres"
          people={parents}
          emptyText="Sin padres registrados."
          onFocus={onFocus}
          onRemove={removeParent}
          onAdd={() => onCreateRelative('parent')}
          onLink={() => onLinkExisting('parent')}
        />
        <RelationList
          title="Parejas"
          people={partners}
          emptyText="Sin parejas registradas."
          onFocus={onFocus}
          onRemove={removePartner}
          onAdd={() => onCreateRelative('partner')}
          onLink={() => onLinkExisting('partner')}
        />
        <RelationList
          title="Hijos e hijas"
          people={children}
          emptyText="Sin descendencia registrada."
          onFocus={onFocus}
          onRemove={removeChild}
          onAdd={() => onCreateRelative('child')}
          onLink={() => onLinkExisting('child')}
        />

        <div className="panel-footer">
          <button type="button" className="danger-button" onClick={onDelete}>
            <TrashIcon size={17} /> Eliminar persona
          </button>
          <p className="panel-hint">
            <HeartIcon size={14} /> Los cambios se guardan solos en este dispositivo.
          </p>
        </div>
      </div>
    </aside>
  )
}
