import type { Person, Relationship, Sex, TreeData } from '../types'
import { newId } from './id'

export const STORAGE_KEY = 'raiz.tree.v1'

const SEXES: Sex[] = ['male', 'female', 'unknown']

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizePerson(raw: unknown): Person | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const id = typeof value.id === 'string' && value.id ? value.id : newId()
  const firstName = text(value.firstName).trim()
  const lastName = text(value.lastName).trim()
  if (!firstName && !lastName) return null

  const now = Date.now()
  return {
    id,
    firstName,
    lastName,
    sex: SEXES.includes(value.sex as Sex) ? (value.sex as Sex) : 'unknown',
    birthDate: text(value.birthDate),
    deathDate: text(value.deathDate),
    birthPlace: text(value.birthPlace),
    occupation: text(value.occupation),
    notes: text(value.notes),
    photo: typeof value.photo === 'string' && value.photo.startsWith('data:image') ? value.photo : undefined,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : now,
  }
}

/**
 * Valida y normaliza un árbol venido de localStorage o de un archivo.
 * Devuelve `null` si el contenido no tiene forma de árbol genealógico.
 */
export function parseTree(raw: unknown): TreeData | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (!Array.isArray(value.people)) return null

  const seen = new Set<string>()
  const people: Person[] = []
  for (const item of value.people) {
    const person = normalizePerson(item)
    if (!person) continue
    if (seen.has(person.id)) person.id = newId()
    seen.add(person.id)
    people.push(person)
  }

  const validIds = new Set(people.map((p) => p.id))
  const relationships: Relationship[] = []
  const keys = new Set<string>()

  if (Array.isArray(value.relationships)) {
    for (const item of value.relationships) {
      if (!item || typeof item !== 'object') continue
      const rel = item as Record<string, unknown>
      const type = rel.type
      const from = rel.from
      const to = rel.to
      if (type !== 'parent' && type !== 'partner') continue
      if (typeof from !== 'string' || typeof to !== 'string') continue
      if (from === to || !validIds.has(from) || !validIds.has(to)) continue
      const key = type === 'parent' ? `parent:${from}>${to}` : `partner:${[from, to].sort().join('<>')}`
      if (keys.has(key)) continue
      keys.add(key)
      relationships.push({
        id: typeof rel.id === 'string' && rel.id ? rel.id : newId(),
        type,
        from,
        to,
      })
    }
  }

  return {
    version: 1,
    title: text(value.title).trim() || 'Mi árbol genealógico',
    people,
    relationships,
    updatedAt: Date.now(),
  }
}

export function loadTree(): TreeData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return parseTree(JSON.parse(stored))
  } catch {
    return null
  }
}

export function saveTree(data: TreeData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function clearStoredTree(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* sin acceso a almacenamiento: no hay nada que borrar */
  }
}
