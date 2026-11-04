import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { MenuIcon, PlusIcon, SearchIcon, SparklesIcon, TreeIcon } from './components/Icons'
import { MenuSheet } from './components/MenuSheet'
import { PersonForm } from './components/PersonForm'
import { PetForm } from './components/PetForm'
import { PersonPanel, type RelationKind } from './components/PersonPanel'
import { PersonPicker } from './components/PersonPicker'
import { SearchOverlay } from './components/SearchOverlay'
import { Toast } from './components/Toast'
import { TreeCanvas } from './components/TreeCanvas'
import { exportTree, readFileAsText } from './lib/backup'
import { exportImage } from './lib/exportImage'
import { exportPdf } from './lib/exportPdf'
import type { ExportFormat } from './components/MenuSheet'
import { parseTree } from './lib/storage'
import { childrenOf, parentsOf, partnersOf } from './lib/tree'
import { useTree } from './store/TreeStore'
import { EMPTY_DRAFT, EMPTY_PET_DRAFT, fullName, type NewPersonLink, type Person, type PersonDraft, type Pet, type PetDraft } from './types'

type FormState =
  | { kind: 'create'; link: NewPersonLink; subtitle?: string }
  | { kind: 'edit'; personId: string }

interface PickerState {
  kind: RelationKind
  personId: string
}

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  action: () => void
}

const THEME_KEY = 'raiz.theme'

function initialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* sin almacenamiento */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const {
    data,
    saveState,
    notify,
    addPerson,
    updatePerson,
    deletePerson,
    addPet,
    updatePet,
    deletePet,
    linkParent,
    linkPartner,
    replaceTree,
    loadSample,
    eraseAll,
  } = useTree()

  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [petForm, setPetForm] = useState<
    | { kind: 'create'; ownerId?: string }
    | { kind: 'edit'; petId: string }
    | null
  >(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [exportMultiPage, setExportMultiPage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* sin almacenamiento */
    }
  }, [theme])

  const selectedPerson = useMemo(
    () => data.people.find((person) => person.id === selectedId) ?? null,
    [data.people, selectedId],
  )

  useEffect(() => {
    if (selectedId && !selectedPerson) setSelectedId(null)
  }, [selectedId, selectedPerson])

  const focusPerson = (id: string) => {
    setSelectedId(id)
    setFocusRequest({ id, nonce: Date.now() })
  }

  const openCreate = (link: NewPersonLink, subtitle?: string) => {
    setForm({ kind: 'create', link, subtitle })
  }

  const relationLabel = (kind: RelationKind): string => {
    if (kind === 'parent') return 'madre o padre'
    if (kind === 'child') return 'hijo o hija'
    return 'pareja'
  }

  const createRelative = (kind: RelationKind) => {
    if (!selectedPerson) return
    const map: Record<RelationKind, NewPersonLink> = {
      parent: { type: 'parent', of: selectedPerson.id },
      child: { type: 'child', of: selectedPerson.id },
      partner: { type: 'partner', of: selectedPerson.id },
    }
    openCreate(map[kind], `Se añadirá como ${relationLabel(kind)} de ${fullName(selectedPerson)}.`)
  }

  const openPicker = (kind: RelationKind) => {
    if (!selectedPerson) return
    setPicker({ kind, personId: selectedPerson.id })
  }

  const pickerPeople = useMemo(() => {
    if (!picker) return []
    const person = data.people.find((item) => item.id === picker.personId)
    if (!person) return []
    const existing =
      picker.kind === 'parent'
        ? parentsOf(data, person.id)
        : picker.kind === 'child'
          ? childrenOf(data, person.id)
          : partnersOf(data, person.id)
    const excluded = new Set([person.id, ...existing.map((item) => item.id)])
    return data.people.filter((item) => !excluded.has(item.id))
  }, [picker, data])

  const handlePick = (relativeId: string) => {
    if (!picker) return
    const ok =
      picker.kind === 'parent'
        ? linkParent(relativeId, picker.personId)
        : picker.kind === 'child'
          ? linkParent(picker.personId, relativeId)
          : linkPartner(picker.personId, relativeId)
    if (ok) notify('Vínculo creado.')
    setPicker(null)
  }

  const handleFormSubmit = (draft: PersonDraft) => {
    if (!form) return
    if (form.kind === 'create') {
      const id = addPerson(draft, form.link)
      setSelectedId(id)
      setFocusRequest({ id, nonce: Date.now() })
      notify('Persona añadida a tu árbol.')
    } else {
      updatePerson(form.personId, draft)
      notify('Ficha actualizada.')
    }
    setForm(null)
  }

  const handlePetSubmit = (draft: PetDraft) => {
    if (!petForm) return
    if (petForm.kind === 'create') {
      addPet(draft)
      notify('Mascota añadida.')
    } else {
      updatePet(petForm.petId, draft)
      notify('Mascota actualizada.')
    }
    setPetForm(null)
  }

  const askDeletePet = (petId: string) => {
    const pet = data.pets.find((item) => item.id === petId)
    if (!pet) return
    setConfirm({
      title: 'Eliminar mascota',
      message: `Se eliminará a ${pet.name}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      action: () => {
        deletePet(pet.id)
        notify('Mascota eliminada.')
      },
    })
  }

  const askDelete = () => {
    if (!selectedPerson) return
    const person = selectedPerson
    setConfirm({
      title: 'Eliminar persona',
      message: `Se eliminará a ${fullName(person)} y sus vínculos del árbol. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      action: () => {
        deletePerson(person.id)
        setSelectedId(null)
        notify('Persona eliminada.')
      },
    })
  }

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportProgress('Preparando…')
    try {
      if (exportFormat === 'json') {
        const result = await exportTree(data)
        notify(
          result === 'shared'
            ? 'Respaldo listo para guardar o compartir.'
            : 'Respaldo descargado en tu dispositivo.',
        )
      } else if (exportFormat === 'jpeg' || exportFormat === 'png') {
        setExportProgress('Capturando el árbol…')
        const result = await exportImage(data, exportFormat)
        notify(
          result === 'shared'
            ? 'Imagen lista para guardar o compartir.'
            : 'Imagen descargada en tu dispositivo.',
        )
      } else {
        setExportProgress('Generando el PDF…')
        const result = await exportPdf(data, exportMultiPage)
        notify(
          result === 'shared'
            ? 'PDF listo para guardar o compartir.'
            : 'PDF descargado en tu dispositivo.',
        )
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message === 'TREE_TOO_LARGE'
          ? 'El árbol es demasiado grande para exportar como imagen. Prueba con JSON o reduce el número de personas.'
          : 'No se pudo exportar. Inténtalo de nuevo.'
      notify(message, 'error')
    } finally {
      setExporting(false)
      setExportProgress(null)
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const parsed = parseTree(JSON.parse(await readFileAsText(file)))
      if (!parsed) throw new Error('Formato no reconocido')
      replaceTree(parsed)
      setSelectedId(null)
      notify(`Importadas ${parsed.people.length} personas y ${parsed.pets.length} mascotas.`)
    } catch {
      notify('Ese archivo no es un respaldo válido de Raíz.', 'error')
    }
  }

  const askLoadSample = () => {
    setMenuOpen(false)
    setConfirm({
      title: 'Cargar árbol de ejemplo',
      message: 'Se reemplazará el árbol actual por la familia García de demostración. Exporta antes un respaldo si no quieres perderlo.',
      confirmLabel: 'Cargar ejemplo',
      action: () => {
        loadSample()
        setSelectedId(null)
      },
    })
  }

  const askErase = () => {
    setMenuOpen(false)
    setConfirm({
      title: 'Empezar de cero',
      message: 'Se borrarán todas las personas de este dispositivo. Descarga un respaldo antes si quieres conservar tu árbol.',
      confirmLabel: 'Borrar todo',
      danger: true,
      action: () => {
        eraseAll()
        setSelectedId(null)
      },
    })
  }

  const formInitial: PersonDraft = EMPTY_DRAFT
  const editingPerson =
    form?.kind === 'edit' ? data.people.find((person) => person.id === form.personId) : undefined

  return (
    <div className={`app${selectedPerson ? ' has-panel' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-logo">
            <TreeIcon size={22} />
          </span>
          <div className="brand-text">
            <span className="brand-name">Raíz</span>
            <span className="brand-sub">{data.title}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setSearchOpen(true)}
            aria-label="Buscar personas"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <main className="stage">
        <TreeCanvas
          data={data}
          selectedId={selectedId}
          focusRequest={focusRequest}
          onSelect={setSelectedId}
        />

        {data.people.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <TreeIcon size={34} />
            </span>
            <h2>Tu árbol empieza aquí</h2>
            <p>
              Añade a la primera persona y ve sumando padres, parejas e hijos. Todo se guarda en este
              dispositivo.
            </p>
            <div className="empty-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => openCreate({ type: 'none' })}
              >
                <PlusIcon size={18} /> Añadir la primera persona
              </button>
              <button type="button" className="ghost-button" onClick={askLoadSample}>
                <SparklesIcon size={17} /> Ver ejemplo
              </button>
            </div>
          </div>
        ) : null}

        {searchOpen ? (
          <SearchOverlay
            people={data.people}
            onPick={(id) => {
              setSearchOpen(false)
              focusPerson(id)
            }}
            onClose={() => setSearchOpen(false)}
          />
        ) : null}
      </main>

      {selectedPerson ? (
        <PersonPanel
          person={selectedPerson}
          onClose={() => setSelectedId(null)}
          onEdit={() => setForm({ kind: 'edit', personId: selectedPerson.id })}
          onDelete={askDelete}
          onFocus={focusPerson}
          onCreateRelative={createRelative}
          onLinkExisting={openPicker}
          onAddPet={() => setPetForm({ kind: 'create', ownerId: selectedPerson?.id })}
          onEditPet={(petId) => setPetForm({ kind: 'edit', petId })}
          onDeletePet={askDeletePet}
        />
      ) : null}

      <div className="canvas-actions">
        <button
          type="button"
          className="fab"
          onClick={() => openCreate({ type: 'none' })}
          aria-label="Añadir persona"
        >
          <PlusIcon size={22} />
          <span>Añadir</span>
        </button>
      </div>

      {petForm ? (
        <PetForm
          title={petForm.kind === 'create' ? 'Nueva mascota' : 'Editar mascota'}
          subtitle={petForm.kind === 'create' ? 'Se vinculará a la persona seleccionada.' : undefined}
          initial={
            petForm.kind === 'create'
              ? { ...EMPTY_PET_DRAFT, ownerIds: petForm.ownerId ? [petForm.ownerId] : [] }
              : mapPetToDraft(data.pets.find((pet) => pet.id === petForm.petId))
          }
          people={data.people}
          submitLabel={petForm.kind === 'create' ? 'Añadir mascota' : 'Guardar cambios'}
          onSubmit={handlePetSubmit}
          onClose={() => setPetForm(null)}
        />
      ) : null}

      {form ? (
        <PersonForm
          title={form.kind === 'create' ? 'Nueva persona' : 'Editar ficha'}
          subtitle={form.kind === 'create' ? form.subtitle : undefined}
          initial={form.kind === 'create' ? formInitial : mapPersonToDraft(editingPerson)}
          submitLabel={form.kind === 'create' ? 'Añadir al árbol' : 'Guardar cambios'}
          onSubmit={handleFormSubmit}
          onClose={() => setForm(null)}
        />
      ) : null}

      {picker ? (
        <PersonPicker
          title={`Vincular ${relationLabel(picker.kind)}`}
          description="Elige a alguien que ya esté en tu árbol."
          people={pickerPeople}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      ) : null}

      <MenuSheet
        open={menuOpen}
        personCount={data.people.length}
        saveState={saveState}
        theme={theme}
        exportFormat={exportFormat}
        onExportFormatChange={setExportFormat}
        exportMultiPage={exportMultiPage}
        onExportMultiPageChange={setExportMultiPage}
        exporting={exporting}
        exportProgress={exportProgress}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        onExport={() => void handleExport()}
        onImport={() => {
          setMenuOpen(false)
          fileInputRef.current?.click()
        }}
        onLoadSample={askLoadSample}
        onErase={askErase}
        onClose={() => setMenuOpen(false)}
      />

      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={() => {
            confirm.action()
            setConfirm(null)
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}

      <Toast />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImportFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

function mapPersonToDraft(person: Person | undefined): PersonDraft {
  if (!person) return EMPTY_DRAFT
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    sex: person.sex,
    birthDate: person.birthDate ?? '',
    deathDate: person.deathDate ?? '',
    birthPlace: person.birthPlace ?? '',
    occupation: person.occupation ?? '',
    notes: person.notes ?? '',
    photo: person.photo,
  }
}

function mapPetToDraft(pet: Pet | undefined): PetDraft {
  if (!pet) return EMPTY_PET_DRAFT
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? '',
    birthDate: pet.birthDate ?? '',
    deathDate: pet.deathDate ?? '',
    photo: pet.photo,
    notes: pet.notes ?? '',
    ownerIds: pet.ownerIds,
  }
}
