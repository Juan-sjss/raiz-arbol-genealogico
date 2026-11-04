import { useRef, useState } from 'react'
import { fileToCompressedDataUrl } from '../lib/image'
import type { PersonDraft, Sex } from '../types'
import { CameraIcon, TrashIcon, XIcon } from './Icons'

interface PersonFormProps {
  title: string
  subtitle?: string
  initial: PersonDraft
  submitLabel: string
  onSubmit: (draft: PersonDraft) => void
  onClose: () => void
}

const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: 'female', label: 'Mujer' },
  { value: 'male', label: 'Hombre' },
]

export function PersonForm({
  title,
  subtitle,
  initial,
  submitLabel,
  onSubmit,
  onClose,
}: PersonFormProps) {
  const [draft, setDraft] = useState<PersonDraft>(initial)
  const [error, setError] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = <K extends keyof PersonDraft>(key: K, value: PersonDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
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
    if (!draft.firstName.trim() && !draft.lastName.trim()) {
      setError('Escribe al menos el nombre o el apellido.')
      return
    }
    if (!draft.sex) {
      setError('Elige el sexo de la persona.')
      return
    }
    onSubmit({
      ...draft,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
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
                className={`photo-picker sex-${draft.sex ?? 'pending'}`}
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

            <div className="field-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  value={draft.firstName}
                  onChange={(event) => update('firstName', event.target.value)}
                  placeholder="María"
                  autoFocus
                />
              </label>
              <label className="field">
                <span>Apellidos</span>
                <input
                  value={draft.lastName}
                  onChange={(event) => update('lastName', event.target.value)}
                  placeholder="García López"
                />
              </label>
            </div>

            <fieldset className="field sex-field">
              <legend>Sexo</legend>
              <div className="segmented">
                {SEX_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={draft.sex === option.value ? 'is-active' : ''}
                    onClick={() => update('sex', option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="field-grid">
              <label className="field">
                <span>Nacimiento</span>
                <input
                  value={draft.birthDate ?? ''}
                  onChange={(event) => update('birthDate', event.target.value)}
                  placeholder="1958 o 1958-04-18"
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
              <label className="field">
                <span>Lugar de nacimiento</span>
                <input
                  value={draft.birthPlace ?? ''}
                  onChange={(event) => update('birthPlace', event.target.value)}
                  placeholder="Granada, España"
                />
              </label>
              <label className="field">
                <span>Ocupación</span>
                <input
                  value={draft.occupation ?? ''}
                  onChange={(event) => update('occupation', event.target.value)}
                  placeholder="Panadero"
                />
              </label>
            </div>

            <label className="field">
              <span>Notas</span>
              <textarea
                value={draft.notes ?? ''}
                onChange={(event) => update('notes', event.target.value)}
                rows={4}
                placeholder="Anécdotas, oficios, lugares… todo lo que quieras recordar."
              />
            </label>

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
