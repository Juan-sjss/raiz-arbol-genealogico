import type { Person, Pet, Relationship, TreeData } from '../types'

interface Seed {
  key: string
  firstName: string
  lastName: string
  sex: Person['sex']
  birthDate?: string
  deathDate?: string
  birthPlace?: string
  occupation?: string
  notes?: string
}

const SEED: Seed[] = [
  {
    key: 'antonio',
    firstName: 'Antonio',
    lastName: 'García López',
    sex: 'male',
    birthDate: '1932-04-18',
    deathDate: '2008-11-02',
    birthPlace: 'Granada, España',
    occupation: 'Panadero',
    notes: 'Abuelo. Abrió la panadería del barrio en 1958.',
  },
  {
    key: 'carmen',
    firstName: 'Carmen',
    lastName: 'Ruiz Molina',
    sex: 'female',
    birthDate: '1936-09-05',
    deathDate: '2019-03-14',
    birthPlace: 'Granada, España',
    occupation: 'Costurera',
  },
  {
    key: 'manuel',
    firstName: 'Manuel',
    lastName: 'García Ruiz',
    sex: 'male',
    birthDate: '1960-01-22',
    birthPlace: 'Granada, España',
    occupation: 'Profesor',
  },
  {
    key: 'rosa',
    firstName: 'Rosa',
    lastName: 'Fernández Vidal',
    sex: 'female',
    birthDate: '1962-06-30',
    birthPlace: 'Málaga, España',
    occupation: 'Médica',
  },
  {
    key: 'lucia',
    firstName: 'Lucía',
    lastName: 'García Ruiz',
    sex: 'female',
    birthDate: '1964-08-11',
    birthPlace: 'Granada, España',
    occupation: 'Arquitecta',
  },
  {
    key: 'pedro',
    firstName: 'Pedro',
    lastName: 'Santamaría Gil',
    sex: 'male',
    birthDate: '1963-02-17',
    birthPlace: 'Sevilla, España',
    occupation: 'Carpintero',
  },
  {
    key: 'javier',
    firstName: 'Javier',
    lastName: 'García Ruiz',
    sex: 'male',
    birthDate: '1968-12-03',
    birthPlace: 'Granada, España',
    occupation: 'Fotógrafo',
  },
  {
    key: 'marta',
    firstName: 'Marta',
    lastName: 'Nogales Prats',
    sex: 'female',
    birthDate: '1970-05-25',
    birthPlace: 'Valencia, España',
    occupation: 'Veterinaria',
  },
  {
    key: 'diego',
    firstName: 'Diego',
    lastName: 'García Fernández',
    sex: 'male',
    birthDate: '1988-03-19',
    birthPlace: 'Madrid, España',
    occupation: 'Ingeniero de software',
    notes: 'Creador de esta app 😄',
  },
  {
    key: 'alba',
    firstName: 'Alba',
    lastName: 'Moreno Cid',
    sex: 'female',
    birthDate: '1989-10-07',
    birthPlace: 'Madrid, España',
    occupation: 'Diseñadora gráfica',
  },
  {
    key: 'elena',
    firstName: 'Elena',
    lastName: 'García Fernández',
    sex: 'female',
    birthDate: '1991-07-14',
    birthPlace: 'Madrid, España',
    occupation: 'Bióloga',
  },
  {
    key: 'sofia',
    firstName: 'Sofía',
    lastName: 'Santamaría García',
    sex: 'female',
    birthDate: '1990-11-28',
    birthPlace: 'Sevilla, España',
    occupation: 'Periodista',
  },
  {
    key: 'hugo',
    firstName: 'Hugo',
    lastName: 'García Nogales',
    sex: 'male',
    birthDate: '1996-04-02',
    birthPlace: 'Valencia, España',
    occupation: 'Músico',
  },
  {
    key: 'martin',
    firstName: 'Martín',
    lastName: 'García Moreno',
    sex: 'male',
    birthDate: '2019-06-21',
    birthPlace: 'Madrid, España',
  },
  {
    key: 'vera',
    firstName: 'Vera',
    lastName: 'García Moreno',
    sex: 'female',
    birthDate: '2022-02-09',
    birthPlace: 'Madrid, España',
  },
]

const COUPLES: Array<[string, string]> = [
  ['antonio', 'carmen'],
  ['manuel', 'rosa'],
  ['lucia', 'pedro'],
  ['javier', 'marta'],
  ['diego', 'alba'],
]

const PARENTS: Array<[string, string[]]> = [
  ['manuel', ['antonio', 'carmen']],
  ['lucia', ['antonio', 'carmen']],
  ['javier', ['antonio', 'carmen']],
  ['diego', ['manuel', 'rosa']],
  ['elena', ['manuel', 'rosa']],
  ['sofia', ['lucia', 'pedro']],
  ['hugo', ['javier', 'marta']],
  ['martin', ['diego', 'alba']],
  ['vera', ['diego', 'alba']],
]

/** Árbol de ejemplo para que la app no arranque vacía. */
export function sampleTree(): TreeData {
  const now = Date.now()
  const ids = new Map<string, string>()
  const people: Person[] = SEED.map((seed, index) => {
    const id = `demo-${seed.key}`
    ids.set(seed.key, id)
    return {
      id,
      firstName: seed.firstName,
      lastName: seed.lastName,
      sex: seed.sex,
      birthDate: seed.birthDate ?? '',
      deathDate: seed.deathDate ?? '',
      birthPlace: seed.birthPlace ?? '',
      occupation: seed.occupation ?? '',
      notes: seed.notes ?? '',
      createdAt: now + index,
      updatedAt: now + index,
    }
  })

  const relationships: Relationship[] = []
  COUPLES.forEach(([a, b], index) => {
    relationships.push({ id: `demo-rel-p-${index}`, type: 'partner', from: ids.get(a)!, to: ids.get(b)! })
  })
  PARENTS.forEach(([child, parents], index) => {
    parents.forEach((parentKey, parentIndex) => {
      relationships.push({
        id: `demo-rel-parent-${index}-${parentIndex}`,
        type: 'parent',
        from: ids.get(parentKey)!,
        to: ids.get(child)!,
      })
    })
  })

  const pets: Pet[] = [
    {
      id: 'demo-pet-1',
      name: 'Luna',
      species: 'dog',
      breed: 'Mestiza',
      birthDate: '2018-03-10',
      ownerIds: [ids.get('diego')!, ids.get('alba')!],
      notes: 'La perra de la familia.',
      createdAt: now,
      updatedAt: now,
    },
  ]

  return {
    version: 2,
    title: 'Familia García',
    people,
    relationships,
    pets,
    updatedAt: now,
  }
}
