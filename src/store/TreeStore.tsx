import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { sampleTree } from '../data/sample'
import { newId } from '../lib/id'
import { clearStoredTree, loadTree, saveTree } from '../lib/storage'
import { ancestorsOf } from '../lib/tree'
import type { NewPersonLink, Person, PersonDraft, Pet, PetDraft, TreeData } from '../types'

interface Toast {
  id: number
  message: string
  tone: 'ok' | 'error'
}

interface TreeContextValue {
  data: TreeData
  saveState: 'saved' | 'error'
  toast: Toast | null
  notify: (message: string, tone?: 'ok' | 'error') => void
  addPerson: (draft: PersonDraft, link: NewPersonLink) => string
  updatePerson: (id: string, draft: PersonDraft) => void
  deletePerson: (id: string) => void
  addPet: (draft: PetDraft) => string
  updatePet: (id: string, draft: PetDraft) => void
  deletePet: (id: string) => void
  linkParent: (parentId: string, childId: string) => boolean
  linkPartner: (a: string, b: string) => boolean
  unlink: (relationshipId: string) => void
  replaceTree: (next: TreeData) => void
  loadSample: () => void
  eraseAll: () => void
}

const TreeContext = createContext<TreeContextValue | null>(null)

const EMPTY_TREE: TreeData = {
  version: 2,
  title: 'Mi árbol genealógico',
  people: [],
  relationships: [],
  pets: [],
  updatedAt: Date.now(),
}

export function TreeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TreeData>(() => loadTree() ?? sampleTree())
  const [saveState, setSaveState] = useState<'saved' | 'error'>('saved')
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const notify = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), message, tone })
    toastTimer.current = window.setTimeout(() => setToast(null), 3400)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  // Guardado automático con un pequeño retardo (localStorage es síncrono).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ok = saveTree(data)
      setSaveState(ok ? 'saved' : 'error')
      if (!ok) {
        notify('Sin espacio en el dispositivo. Borra fotos o exporta un respaldo.', 'error')
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [data, notify])

  const mutate = useCallback((updater: (current: TreeData) => TreeData) => {
    setData((current) => ({ ...updater(current), updatedAt: Date.now() }))
  }, [])

  const addPerson = useCallback(
    (draft: PersonDraft, link: NewPersonLink): string => {
      const id = newId()
      const now = Date.now()
      mutate((current) => {
        const person: Person = {
          ...draft,
          id,
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          createdAt: now,
          updatedAt: now,
        }
        const people = [...current.people, person]
        const relationships = [...current.relationships]
        const linkTo = (from: string, to: string) => {
          relationships.push({ id: newId(), type: 'parent', from, to })
        }

        if (link.type === 'child') {
          const parent = current.people.find((p) => p.id === link.of)
          if (parent) {
            linkTo(parent.id, id)
            const partners = current.relationships
              .filter((r) => r.type === 'partner' && (r.from === parent.id || r.to === parent.id))
              .map((r) => (r.from === parent.id ? r.to : r.from))
            if (partners.length === 1) linkTo(partners[0], id)
          }
        } else if (link.type === 'parent') {
          linkTo(id, link.of)
          const existingParents = current.relationships
            .filter((r) => r.type === 'parent' && r.to === link.of)
            .map((r) => r.from)
          if (existingParents.length === 1) {
            const candidates = current.relationships
              .filter((r) => r.type === 'partner' && (r.from === existingParents[0] || r.to === existingParents[0]))
              .map((r) => (r.from === existingParents[0] ? r.to : r.from))
            if (candidates.length === 1) linkTo(candidates[0], link.of)
          }
        } else if (link.type === 'partner') {
          relationships.push({ id: newId(), type: 'partner', from: id, to: link.of })
        }

        return { ...current, people, relationships }
      })
      return id
    },
    [mutate],
  )

  const updatePerson = useCallback(
    (id: string, draft: PersonDraft) => {
      mutate((current) => ({
        ...current,
        people: current.people.map((person) =>
          person.id === id
            ? {
                ...person,
                ...draft,
                firstName: draft.firstName.trim() || person.firstName,
                lastName: draft.lastName.trim(),
                updatedAt: Date.now(),
              }
            : person,
        ),
      }))
    },
    [mutate],
  )

  const deletePerson = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        people: current.people.filter((person) => person.id !== id),
        relationships: current.relationships.filter((rel) => rel.from !== id && rel.to !== id),
        pets: current.pets
          .map((pet) => ({ ...pet, ownerIds: pet.ownerIds.filter((ownerId) => ownerId !== id) }))
          .filter((pet) => pet.ownerIds.length > 0),
      }))
    },
    [mutate],
  )

  const addPet = useCallback(
    (draft: PetDraft): string => {
      const id = newId()
      const now = Date.now()
      mutate((current) => {
        const pet: Pet = {
          ...draft,
          id,
          name: draft.name.trim(),
          breed: draft.breed?.trim() || undefined,
          ownerIds: draft.ownerIds.filter((ownerId) =>
            current.people.some((person) => person.id === ownerId),
          ),
          createdAt: now,
          updatedAt: now,
        }
        return { ...current, pets: [...current.pets, pet] }
      })
      return id
    },
    [mutate],
  )

  const updatePet = useCallback(
    (id: string, draft: PetDraft) => {
      mutate((current) => ({
        ...current,
        pets: current.pets.map((pet) =>
          pet.id === id
            ? {
                ...pet,
                ...draft,
                name: draft.name.trim() || pet.name,
                breed: draft.breed?.trim() || undefined,
                ownerIds: draft.ownerIds.filter((ownerId) =>
                  current.people.some((person) => person.id === ownerId),
                ),
                updatedAt: Date.now(),
              }
            : pet,
        ),
      }))
    },
    [mutate],
  )

  const deletePet = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        pets: current.pets.filter((pet) => pet.id !== id),
      }))
    },
    [mutate],
  )

  const linkParent = useCallback(
    (parentId: string, childId: string): boolean => {
      if (parentId === childId) return false
      if (ancestorsOf(data, parentId).has(childId)) {
        notify('Esa relación crearía un ciclo en el árbol.', 'error')
        return false
      }
      const exists = data.relationships.some(
        (r) => r.type === 'parent' && r.from === parentId && r.to === childId,
      )
      if (exists) return false
      mutate((current) => ({
        ...current,
        relationships: [
          ...current.relationships,
          { id: newId(), type: 'parent', from: parentId, to: childId },
        ],
      }))
      return true
    },
    [data, mutate, notify],
  )

  const linkPartner = useCallback(
    (a: string, b: string): boolean => {
      if (a === b) return false
      const exists = data.relationships.some(
        (r) => r.type === 'partner' && ((r.from === a && r.to === b) || (r.from === b && r.to === a)),
      )
      if (exists) {
        notify('Ya están vinculados como pareja.', 'error')
        return false
      }
      mutate((current) => ({
        ...current,
        relationships: [...current.relationships, { id: newId(), type: 'partner', from: a, to: b }],
      }))
      return true
    },
    [data, mutate, notify],
  )

  const unlink = useCallback(
    (relationshipId: string) => {
      mutate((current) => ({
        ...current,
        relationships: current.relationships.filter((rel) => rel.id !== relationshipId),
      }))
    },
    [mutate],
  )

  const replaceTree = useCallback(
    (next: TreeData) => {
      setData({ ...next, updatedAt: Date.now() })
    },
    [],
  )

  const loadSample = useCallback(() => {
    setData(sampleTree())
    notify('Árbol de ejemplo cargado.')
  }, [notify])

  const eraseAll = useCallback(() => {
    clearStoredTree()
    setData({ ...EMPTY_TREE, updatedAt: Date.now() })
    notify('Árbol borrado. Puedes empezar de cero.')
  }, [notify])

  const value = useMemo<TreeContextValue>(
    () => ({
      data,
      saveState,
      toast,
      notify,
      addPerson,
      updatePerson,
      deletePerson,
      addPet,
      updatePet,
      deletePet,
      linkParent,
      linkPartner,
      unlink,
      replaceTree,
      loadSample,
      eraseAll,
    }),
    [
      data,
      saveState,
      toast,
      notify,
      addPerson,
      updatePerson,
      deletePerson,
      addPet,
      updatePet,
      deletePet,
      linkParent,
      linkPartner,
      unlink,
      replaceTree,
      loadSample,
      eraseAll,
    ],
  )

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>
}

export function useTree(): TreeContextValue {
  const context = useContext(TreeContext)
  if (!context) throw new Error('useTree debe usarse dentro de <TreeProvider>')
  return context
}
