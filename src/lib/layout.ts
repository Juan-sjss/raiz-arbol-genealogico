import type { Person, Relationship } from '../types'

export const CARD_W = 172
export const CARD_H = 92
export const PARTNER_GAP = 20
export const GAP_X = 34
export const GAP_Y = 100
export const PADDING = 140

export interface Placement {
  x: number
  y: number
}

export interface TreeLayout {
  positions: Map<string, Placement>
  width: number
  height: number
  generations: number
}

interface Unit {
  id: string
  members: string[]
  row: number
  x: number
  width: number
}

/**
 * Regresión isotónica (PAVA): devuelve la secuencia no decreciente más cercana
 * a `values`. La usamos para colocar una fila sin solapamientos gastando el
 * mínimo desplazamiento posible respecto a la posición deseada.
 */
function isotonic(values: number[]): number[] {
  const result = values.slice()
  const blocks: Array<{ value: number; count: number; start: number }> = []

  for (let index = 0; index < values.length; index++) {
    blocks.push({ value: values[index], count: 1, start: index })
    while (blocks.length > 1) {
      const last = blocks[blocks.length - 1]
      const previous = blocks[blocks.length - 2]
      if (previous.value <= last.value) break
      blocks.splice(blocks.length - 2, 2, {
        value: (previous.value * previous.count + last.value * last.count) / (previous.count + last.count),
        count: previous.count + last.count,
        start: previous.start,
      })
    }
  }

  for (const block of blocks) {
    for (let offset = 0; offset < block.count; offset++) {
      result[block.start + offset] = block.value
    }
  }
  return result
}

/**
 * Calcula la posición de cada persona en el lienzo.
 *
 * 1. Asigna una generación a cada persona siguiendo las relaciones padre/hijo.
 * 2. Agrupa parejas en "unidades" para que se dibujen juntas.
 * 3. Ordena cada fila acercando a los hijos bajo sus padres (baricentro).
 * 4. Reparte el espacio con un ajuste óptimo: sin solapamientos y con los
 *    padres centrados sobre sus hijos.
 */
export function layoutTree(people: Person[], relationships: Relationship[]): TreeLayout {
  if (people.length === 0) {
    return { positions: new Map(), width: 0, height: 0, generations: 0 }
  }

  const ids = new Set(people.map((person) => person.id))
  const parentEdges = relationships.filter(
    (rel) => rel.type === 'parent' && ids.has(rel.from) && ids.has(rel.to) && rel.from !== rel.to,
  )
  const partnerEdges = relationships.filter(
    (rel) => rel.type === 'partner' && ids.has(rel.from) && ids.has(rel.to) && rel.from !== rel.to,
  )

  const parentIdsOf = new Map<string, string[]>()
  people.forEach((person) => parentIdsOf.set(person.id, []))
  for (const edge of parentEdges) parentIdsOf.get(edge.to)!.push(edge.from)

  // 1. Generaciones: cada hijo queda una fila por debajo de sus padres.
  const generation = new Map<string, number>()
  people.forEach((person) => generation.set(person.id, 0))
  for (let iteration = 0; iteration < people.length + 1; iteration++) {
    let changed = false
    for (const [childId, parentIds] of parentIdsOf) {
      const childGen = generation.get(childId)!
      for (const parentId of parentIds) {
        const parentGen = generation.get(parentId)!
        if (childGen < parentGen + 1) {
          generation.set(childId, parentGen + 1)
          changed = true
        }
      }
    }
    if (!changed) break
  }

  // Las parejas comparten fila (se toma la más baja de las dos).
  for (const edge of partnerEdges) {
    const a = generation.get(edge.from)!
    const b = generation.get(edge.to)!
    if (a !== b) {
      const row = Math.max(a, b)
      generation.set(edge.from, row)
      generation.set(edge.to, row)
    }
  }

  // 2. Unidades: parejas unidas por "partner" en la misma fila.
  const parent = new Map<string, string>()
  people.forEach((person) => parent.set(person.id, person.id))
  const find = (id: string): string => {
    let root = id
    while (parent.get(root) !== root) root = parent.get(root)!
    while (parent.get(id) !== root) {
      const next = parent.get(id)!
      parent.set(id, root)
      id = next
    }
    return root
  }
  for (const edge of partnerEdges) {
    if (generation.get(edge.from) === generation.get(edge.to)) {
      const rootA = find(edge.from)
      const rootB = find(edge.to)
      if (rootA !== rootB) parent.set(rootA, rootB)
    }
  }

  const order = new Map<string, number>()
  people.forEach((person, index) => order.set(person.id, index))

  const units = new Map<string, Unit>()
  const unitOfPerson = new Map<string, string>()
  for (const person of people) {
    const root = find(person.id)
    let unit = units.get(root)
    if (!unit) {
      unit = { id: root, members: [], row: generation.get(person.id)!, x: 0, width: 0 }
      units.set(root, unit)
    }
    unit.members.push(person.id)
    unitOfPerson.set(person.id, root)
  }
  for (const unit of units.values()) {
    unit.members.sort((a, b) => order.get(a)! - order.get(b)!)
    unit.width = unit.members.length * CARD_W + (unit.members.length - 1) * PARTNER_GAP
  }

  const maxRow = Math.max(...[...units.values()].map((unit) => unit.row))
  const rows: Unit[][] = Array.from({ length: maxRow + 1 }, () => [])
  for (const unit of units.values()) rows[unit.row].push(unit)
  for (const row of rows) {
    row.sort((a, b) => order.get(a.members[0])! - order.get(b.members[0])!)
  }

  const indexInRow = new Map<string, number>()
  const reindex = () => {
    for (const row of rows) row.forEach((unit, index) => indexInRow.set(unit.id, index))
  }
  reindex()

  const childUnitsOf = (unit: Unit): Unit[] => {
    const found = new Set<string>()
    for (const edge of parentEdges) {
      if (unit.members.includes(edge.from)) found.add(unitOfPerson.get(edge.to)!)
    }
    found.delete(unit.id)
    return [...found].map((id) => units.get(id)!)
  }

  const parentUnitsOf = (unit: Unit): Unit[] => {
    const found = new Set<string>()
    for (const memberId of unit.members) {
      for (const parentId of parentIdsOf.get(memberId) ?? []) {
        found.add(unitOfPerson.get(parentId)!)
      }
    }
    found.delete(unit.id)
    return [...found].map((id) => units.get(id)!)
  }

  // 3. Orden dentro de cada fila: baricentro respecto a padres e hijos.
  const sortByBarycenter = (row: Unit[], neighborsOf: (unit: Unit) => Unit[]) => {
    const current = new Map<Unit, number>()
    row.forEach((unit, index) => current.set(unit, index))
    const scores = new Map<Unit, number>()
    for (const unit of row) {
      const indices = neighborsOf(unit)
        .map((neighbor) => indexInRow.get(neighbor.id))
        .filter((value): value is number => value !== undefined)
      const base = current.get(unit)!
      scores.set(
        unit,
        indices.length
          ? (indices.reduce((acc, value) => acc + value, 0) / indices.length) * 0.85 + base * 0.15
          : base,
      )
    }
    row.sort((a, b) => scores.get(a)! - scores.get(b)!)
    reindex()
  }

  for (let pass = 0; pass < 4; pass++) {
    for (let row = 1; row <= maxRow; row++) sortByBarycenter(rows[row], parentUnitsOf)
    for (let row = maxRow - 1; row >= 0; row--) sortByBarycenter(rows[row], childUnitsOf)
  }

  // Distribución inicial en horizontal, cada fila centrada en el origen.
  for (const row of rows) {
    let cursor = 0
    for (const unit of row) {
      unit.x = cursor
      cursor += unit.width + GAP_X
    }
    const total = cursor - GAP_X
    for (const unit of row) unit.x -= total / 2
  }
  reindex()

  const centerOf = (unit: Unit) => unit.x + unit.width / 2

  /** Coloca la fila lo más cerca posible de sus objetivos sin solaparse. */
  const placeRow = (row: Unit[], targets: Map<Unit, number>) => {
    if (!row.length) return
    const desired: number[] = []
    const offsets: number[] = []
    let offset = 0
    for (const unit of row) {
      offsets.push(offset)
      desired.push((targets.get(unit) ?? unit.x) - offset)
      offset += unit.width + GAP_X
    }
    const fitted = isotonic(desired)
    row.forEach((unit, index) => {
      unit.x = fitted[index] + offsets[index]
    })
    reindex()
  }

  const alignTo = (row: Unit[], neighborsOf: (unit: Unit) => Unit[]) => {
    const targets = new Map<Unit, number>()
    for (const unit of row) {
      const neighbors = neighborsOf(unit)
      if (!neighbors.length) {
        targets.set(unit, unit.x)
        continue
      }
      const center = neighbors.reduce((acc, neighbor) => acc + centerOf(neighbor), 0) / neighbors.length
      targets.set(unit, center - unit.width / 2)
    }
    placeRow(row, targets)
  }

  // 4. Refinamiento: primero los hijos hacia sus padres y después los padres
  //    sobre sus hijos, que es lo que se ve más natural.
  for (let pass = 0; pass < 8; pass++) {
    for (let row = maxRow; row > 0; row--) alignTo(rows[row], parentUnitsOf)
    for (let row = 0; row < maxRow; row++) alignTo(rows[row], childUnitsOf)
  }

  // 5. Corredor central para el tronco. Las tarjetas (hojas) que caen sobre
  //    la franja del tronco se desplazan hacia los lados para no taparlo.
  //    Los hijos de una fila se empujan en cadena para no solaparse.
  const rowsOfCards: Array<Array<{ id: string; x: number }>> = Array.from(
    { length: maxRow + 1 },
    () => [],
  )
  for (const unit of units.values()) {
    unit.members.forEach((memberId, index) => {
      rowsOfCards[unit.row].push({
        id: memberId,
        x: unit.x + index * (CARD_W + PARTNER_GAP),
      })
    })
  }
  for (const row of rowsOfCards) row.sort((a, b) => a.x - b.x)

  const TRUNK_CLEAR_HALF = 74
  const CARD_GAP_MIN = 16
  const topRow = rowsOfCards[0]
  const trunkCx = topRow.length
    ? topRow.reduce((sum, card) => sum + card.x + CARD_W / 2, 0) / topRow.length
    : 0
  const corridorLeft = trunkCx - TRUNK_CLEAR_HALF
  const corridorRight = trunkCx + TRUNK_CLEAR_HALF

  const pushLeft = (row: Array<{ x: number }>, index: number, targetX: number) => {
    if (row[index].x <= targetX) return
    row[index].x = targetX
    let limit = targetX
    for (let i = index - 1; i >= 0; i--) {
      const maxX = limit - CARD_GAP_MIN - CARD_W
      if (row[i].x <= maxX) break
      row[i].x = maxX
      limit = maxX
    }
  }

  const pushRight = (row: Array<{ x: number }>, index: number, targetX: number) => {
    if (row[index].x >= targetX) return
    row[index].x = targetX
    let limit = targetX + CARD_W
    for (let i = index + 1; i < row.length; i++) {
      const minX = limit + CARD_GAP_MIN
      if (row[i].x >= minX) break
      row[i].x = minX
      limit = minX + CARD_W
    }
  }

  // La primera fila queda por encima del nacimiento del tronco, así que solo
  // apartamos las filas siguientes.
  for (let rowIndex = 1; rowIndex < rowsOfCards.length; rowIndex++) {
    const row = rowsOfCards[rowIndex]
    for (let index = 0; index < row.length; index++) {
      const card = row[index]
      const right = card.x + CARD_W
      if (right <= corridorLeft || card.x >= corridorRight) continue

      const leftShift = right - corridorLeft
      const rightShift = corridorRight - card.x
      let side: -1 | 1
      if (leftShift < rightShift - 0.5) {
        side = -1
      } else if (rightShift < leftShift - 0.5) {
        side = 1
      } else {
        const previous = row[index - 1]
        const next = row[index + 1]
        const spaceLeft = previous ? card.x - (previous.x + CARD_W) : Number.POSITIVE_INFINITY
        const spaceRight = next ? next.x - right : Number.POSITIVE_INFINITY
        side = spaceRight >= spaceLeft ? 1 : -1
      }

      if (side === -1) pushLeft(row, index, corridorLeft - CARD_W)
      else pushRight(row, index, corridorRight)
    }
  }

  // Centrar el dibujo completo y calcular el tamaño del lienzo.
  const positions = new Map<string, Placement>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  rowsOfCards.forEach((row, rowIndex) => {
    const y = rowIndex * (CARD_H + GAP_Y)
    for (const card of row) {
      positions.set(card.id, { x: card.x, y })
      minX = Math.min(minX, card.x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, card.x + CARD_W)
      maxY = Math.max(maxY, y + CARD_H)
    }
  })

  for (const [id, placement] of positions) {
    positions.set(id, {
      x: placement.x - minX + PADDING,
      y: placement.y - minY + PADDING,
    })
  }

  return {
    positions,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
    generations: maxRow + 1,
  }
}
