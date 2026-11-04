import { useRef, useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/image'
import type { Person, PetDraft, PetSpecies } from '../types'
import { petSpeciesLabel } from '../types'
import { CameraIcon, TrashIcon, XIcon } from './Icons'

interface PetFormProps {
  title: string
  subtitle?: string
  initial: PetDraft
  people: Person[]
  submitLabel: string
  onSubmit: (draft: PetDraft) => void
  onClose: () => void
}

const SPECIES: PetSpecies[] = ['dog', 'cat', 'bird', 'other']

export function PetForm({
  title,
  subtitle,
  initial,
  people,
  submitLabel,
  onSubmit,
  onClose,
}: PetFormProps) {
  const [draft, setDraft] = useState<PetDraft>(initial)
  const [error, setError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof PetDraft>(key: K, value: PetDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const toggleOwner = (id: string) => {
    setDraft((current) => {
      const owners = current.ownerIds.includes(id)
        ? current.ownerIds.filter((owner) => owner !== id)
        : [...current.ownerIds, id]
      return { ...current, ownerIds: owners }
    })
  }

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoBusy(true)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      update('photo', dataUrl)
    } catch {
      setError('No se pudo leer la imagen. Prueba con otra foto.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError('Escribe el nombre de la mascota.')
      return
    }
    if (draft.ownerIds.length === 0) {
      setError('Elige al menos un dueño.')
      return
    }
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      breed: draft.breed?.trim() || '',
    })
  }

  return (
    <div className="sheet-backdrop" onPointerDown={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <XIcon />
          </button>
        </header>

        <form className="sheet-form" onSubmit={handleSubmit}>
          <div className="sheet-body">
            <div className="photo-row">
              <button
                type="button"
                className="photo-picker sex-pending"
                onClick={() => fileRef.current?.click()}
              >
                {draft.photo ? (
                  <img src={draft.photo} alt="" />
                ) : (
                  <span className="photo-placeholder">
                    <CameraIcon size={22} />
                    <span>{photoBusy ? 'Procesando…' : 'Añadir foto'}</span>
                  </span>
                )}
              </button>
              {draft.photo ? (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => update('photo', undefined)}
                >
                  <TrashIcon size={15} /> Quitar foto
                </button>
              ) : (
                <p className="photo-hint">
                  La foto se guarda comprimida dentro del árbol, sin salir de tu dispositivo.
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(event) => {
                  void handlePhoto(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>

            <label className="field">
              <span>Nombre</span>
              <input
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
                placeholder="Luna"
                autoFocus
              />
            </label>

            <fieldset className="field sex-field">
              <legend>Especie</legend>
              <div className="segmented">
                {SPECIES.map((species) => (
                  <button
                    key={species}
                    type="button"
                    className={draft.species === species ? 'is-active' : ''}
                    onClick={() => update('species', species)}
                  >
                    {petSpeciesLabel(species)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="field">
              <span>Raza (opcional)</span>
              <input
                value={draft.breed ?? ''}
                onChange={(event) => update('breed', event.target.value)}
                placeholder="Mestiza"
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>Nacimiento</span>
                <input
                  value={draft.birthDate ?? ''}
                  onChange={(event) => update('birthDate', event.target.value)}
                  placeholder="2018 o 2018-03-10"
                  inputMode="numeric"
                />
              </label>
              <label className="field">
                <span>Fallecimiento</span>
                <input
                  value={draft.deathDate ?? ''}
                  onChange={(event) => update('deathDate', event.target.value)}
                  placeholder="Opcional"
                  inputMode="numeric"
                />
              </label>
            </div>

            <label className="field">
              <span>Notas</span>
              <textarea
                value={draft.notes ?? ''}
                onChange={(event) => update('notes', event.target.value)}
                rows={3}
                placeholder="Carácter, gustos, anécdotas…"
              />
            </label>

            <fieldset className="field">
              <legend>Dueños</legend>
              <ul className="relation-list">
                {people.map((person) => (
                  <li key={person.id} className="relation-item">
                    <label className="relation-main" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={draft.ownerIds.includes(person.id)}
                        onChange={() => toggleOwner(person.id)}
                      />
                      <span className="relation-info">
                        <span className="relation-name">
                          {person.firstName} {person.lastName}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            {error ? <p className="form-error">{error}</p> : null}
          </div>

          <footer className="sheet-footer">
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={photoBusy}>
              {submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}