export type Sex = 'male' | 'female' | 'unknown'

export type RelationType = 'parent' | 'partner'

export interface Person {
  id: string
  firstName: string
  lastName: string
  sex: Sex
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  occupation?: string
  notes?: string
  /** Imagen en formato data URL (comprimida antes de guardarse). */
  photo?: string
  createdAt: number
  updatedAt: number
}

export interface Relationship {
  id: string
  type: RelationType
  /** En 'parent': la madre o el padre. En 'partner': una de las dos personas. */
  from: string
  /** En 'parent': el hijo o la hija. En 'partner': la otra persona. */
  to: string
}

export interface TreeData {
  version: 1
  title: string
  people: Person[]
  relationships: Relationship[]
  updatedAt: number
}

/** Campos editables de una persona (todo menos id y marcas de tiempo). */
export type PersonDraft = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>

/** Cómo se conecta una persona nueva al árbol existente. */
export type NewPersonLink =
  | { type: 'none' }
  | { type: 'child'; of: string }
  | { type: 'parent'; of: string }
  | { type: 'partner'; of: string }

export const EMPTY_DRAFT: PersonDraft = {
  firstName: '',
  lastName: '',
  sex: 'unknown',
  birthDate: '',
  deathDate: '',
  birthPlace: '',
  occupation: '',
  notes: '',
  photo: undefined,
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

function yearOf(value?: string): string {
  if (!value) return ''
  const match = value.match(/\d{4}/)
  return match ? match[0] : value.trim()
}

export function lifeSpan(person: Person): string {
  const birth = yearOf(person.birthDate)
  const death = yearOf(person.deathDate)
  if (!birth && !death) return ''
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `n. ${birth}`
  return `† ${death}`
}

export function sexLabel(sex: Sex): string {
  if (sex === 'male') return 'Hombre'
  if (sex === 'female') return 'Mujer'
  return 'Sin especificar'
}
