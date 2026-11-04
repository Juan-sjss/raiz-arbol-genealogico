export type Sex = 'male' | 'female'

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'other'

export type RelationType = 'parent' | 'partner'

export interface Person {
  id: string
  firstName: string
  lastName: string
  /** Sexo biológico/legal de la persona. `null` = pendiente de elegir (migración). */
  sex: Sex | null
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

export interface Pet {
  id: string
  name: string
  species: PetSpecies
  breed?: string
  birthDate?: string
  deathDate?: string
  photo?: string
  notes?: string
  /** Personas (dueños) a las que se vincula la mascota. */
  ownerIds: string[]
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
  version: number
  title: string
  people: Person[]
  relationships: Relationship[]
  pets: Pet[]
  updatedAt: number
}

/** Campos editables de una persona (todo menos id y marcas de tiempo). */
export type PersonDraft = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>

/** Campos editables de una mascota (todo menos id y marcas de tiempo). */
export type PetDraft = Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>

/** Cómo se conecta una persona nueva al árbol existente. */
export type NewPersonLink =
  | { type: 'none' }
  | { type: 'child'; of: string }
  | { type: 'parent'; of: string }
  | { type: 'partner'; of: string }

export const EMPTY_DRAFT: PersonDraft = {
  firstName: '',
  lastName: '',
  sex: null,
  birthDate: '',
  deathDate: '',
  birthPlace: '',
  occupation: '',
  notes: '',
  photo: undefined,
}

export const EMPTY_PET_DRAFT: PetDraft = {
  name: '',
  species: 'dog',
  breed: '',
  birthDate: '',
  deathDate: '',
  photo: undefined,
  notes: '',
  ownerIds: [],
}

export function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim()
}

export function petSpeciesLabel(species: PetSpecies): string {
  switch (species) {
    case 'dog':
      return 'Perro'
    case 'cat':
      return 'Gato'
    case 'bird':
      return 'Ave'
    default:
      return 'Otro'
  }
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

export function petLifeSpan(pet: Pet): string {
  const birth = yearOf(pet.birthDate)
  const death = yearOf(pet.deathDate)
  if (!birth && !death) return ''
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `n. ${birth}`
  return `† ${death}`
}

export function sexLabel(sex: Sex | null): string {
  if (sex === 'male') return 'Hombre'
  if (sex === 'female') return 'Mujer'
  return 'Elegir sexo'
}