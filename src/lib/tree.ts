import type { Person, Pet, Relationship, TreeData } from '../types'

export function parentsOf(data: TreeData, personId: string): Person[] {
  const ids = data.relationships
    .filter((r) => r.type === 'parent' && r.to === personId)
    .map((r) => r.from)
  return ids
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
}

export function childrenOf(data: TreeData, personId: string): Person[] {
  const ids = data.relationships
    .filter((r) => r.type === 'parent' && r.from === personId)
    .map((r) => r.to)
  return ids
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
}

export function partnersOf(data: TreeData, personId: string): Person[] {
  const ids = data.relationships
    .filter((r) => r.type === 'partner' && (r.from === personId || r.to === personId))
    .map((r) => (r.from === personId ? r.to : r.from))
  return ids
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
}

/** Todos los ascendientes de una persona (para evitar ciclos). */
export function ancestorsOf(data: TreeData, personId: string): Set<string> {
  const result = new Set<string>()
  const stack = [personId]
  while (stack.length) {
    const current = stack.pop()!
    for (const r of data.relationships) {
      if (r.type === 'parent' && r.to === current && !result.has(r.from)) {
        result.add(r.from)
        stack.push(r.from)
      }
    }
  }
  return result
}

export function relationshipBetween(
  relationships: Relationship[],
  type: Relationship['type'],
  a: string,
  b: string,
): Relationship | undefined {
  return relationships.find(
    (r) =>
      r.type === type &&
      ((r.from === a && r.to === b) || (r.type === 'partner' && r.from === b && r.to === a)),
  )
}

export function sortPeople(people: Person[]): Person[] {
  return [...people].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, 'es', { sensitivity: 'base' })
    if (byLast !== 0) return byLast
    return a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' })
  })
}

export function petsOfPerson(data: TreeData, personId: string): Pet[] {
  return data.pets.filter((pet) => pet.ownerIds.includes(personId))
}

export function ownersOfPet(data: TreeData, pet: Pet): Person[] {
  return pet.ownerIds
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
}

/** Texto en minúsculas y sin tildes, para buscar de forma tolerante. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
