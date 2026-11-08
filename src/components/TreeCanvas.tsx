import { useEffect, useMemo, useRef } from 'react'
import { usePanZoom } from '../hooks/usePanZoom'
import { CARD_H, CARD_W, layoutTree } from '../lib/layout'
import type { TreeData } from '../types'
import { FitIcon, LeafIcon, ZoomInIcon, ZoomOutIcon } from './Icons'
import { PersonCard } from './PersonCard'

interface TreeCanvasProps {
  data: TreeData
  selectedId: string | null
  focusRequest: { id: string; nonce: number } | null
  onSelect: (id: string | null) => void
}

interface Point {
  x: number
  y: number
}

const round = (value: number) => Math.round(value * 100) / 100

/** Curva suave (Catmull-Rom convertida a Bézier) para dibujar formas orgánicas. */
function smoothPath(points: Point[], closed: boolean): string {
  if (points.length < 2) return ''
  const count = points.length
  const at = (index: number) =>
    closed
      ? points[(index + count) % count]
      : points[Math.min(count - 1, Math.max(0, index))]

  let d = `M ${round(points[0].x)} ${round(points[0].y)}`
  const last = closed ? count : count - 1
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(p2.x)} ${round(p2.y)}`
  }
  return closed ? `${d} Z` : d
}

const LEAF_PATH = 'M0 0 C3.4 -4.6, 10.6 -5.2, 15 0 C10.6 5.2, 3.4 4.6, 0 0 Z'
const LEAF_VEIN = 'M1.6 0 C5.4 -1.2, 9.8 -1.1, 13.4 0'
const PETAL_PATH = 'M0 0 C-2.4 -1.8, -2.6 -5, 0 -6.2 C2.6 -5, 2.4 -1.8, 0 0 Z'
const PETAL_ANGLES = [0, 72, 144, 216, 288]

function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p1.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p1.y,
  }
}

function cubicTangent(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p1.x - c2.x),
    y: 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p1.y - c2.y),
  }
}

function unitVector(point: Point): Point {
  const length = Math.hypot(point.x, point.y)
  return length ? { x: point.x / length, y: point.y / length } : { x: 0, y: 1 }
}

/** Forma afilada que sigue una curva: sirve para raíces macizas. */
function ribbonPath(p0: Point, c1: Point, c2: Point, p1: Point, width: number): string {
  const left: Point[] = []
  const right: Point[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const point = cubicPoint(p0, c1, c2, p1, t)
    const direction = unitVector(cubicTangent(p0, c1, c2, p1, t))
    const half = (width * Math.pow(1 - t, 1.25)) / 2 + 0.4
    left.push({ x: point.x - direction.y * half, y: point.y + direction.x * half })
    right.push({ x: point.x + direction.y * half, y: point.y - direction.x * half })
  }
  return smoothPath([...left, ...right.reverse()], true)
}

interface Decoration {
  kind: 'leaf' | 'flower'
  x: number
  y: number
  angle: number
  scale: number
}

function BranchLeaf({ x, y, angle, scale }: Omit<Decoration, 'kind'>) {
  return (
    <g transform={`translate(${round(x)} ${round(y)}) rotate(${round(angle)}) scale(${scale})`}>
      <path className="edge-leaf" d={LEAF_PATH} />
      <path className="edge-leaf-vein" d={LEAF_VEIN} />
    </g>
  )
}

function BranchFlower({ x, y, angle, scale }: Omit<Decoration, 'kind'>) {
  return (
    <g
      className="branch-flower"
      transform={`translate(${round(x)} ${round(y)}) rotate(${round(angle)}) scale(${scale})`}
    >
      {PETAL_ANGLES.map((degrees) => (
        <path
          key={degrees}
          className="branch-flower-petal"
          d={PETAL_PATH}
          transform={`rotate(${degrees})`}
        />
      ))}
      <circle className="branch-flower-center" r={1.6} />
    </g>
  )
}

export function TreeCanvas({ data, selectedId, focusRequest, onSelect }: TreeCanvasProps) {
  const layout = useMemo(
    () => layoutTree(data.people, data.relationships),
    [data.people, data.relationships],
  )
  const { containerRef, view, fit, zoomBy, centerOn, onPointerDown, interacted, wasDragged } =
    usePanZoom(layout.width, layout.height)

  const pendingFit = useRef(true)

  useEffect(() => {
    if (!pendingFit.current || !layout.width) return
    const frame = requestAnimationFrame(() => {
      pendingFit.current = false
      const element = containerRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const scaleToFit = Math.min(rect.width / layout.width, rect.height / layout.height) * 0.94
      if (!rect.width || scaleToFit >= 0.55) {
        fit(0.94)
        return
      }
      // En pantallas pequeñas abrimos a una escala legible sobre la primera fila.
      let minY = Infinity
      for (const placement of layout.positions.values()) minY = Math.min(minY, placement.y)
      const topXs = [...layout.positions.values()]
        .filter((placement) => placement.y === minY)
        .map((placement) => placement.x)
      const minX = Math.min(...topXs)
      const maxX = Math.max(...topXs) + CARD_W
      centerOn((minX + maxX) / 2, minY + CARD_H / 2, 0.85)
    })
    return () => cancelAnimationFrame(frame)
  }, [layout.width, layout.height, layout.positions, fit, centerOn, containerRef])

  useEffect(() => {
    if (!focusRequest) return
    const placement = layout.positions.get(focusRequest.id)
    if (!placement) return
    centerOn(placement.x + CARD_W / 2, placement.y + CARD_H / 2, 0.85)
  }, [focusRequest, layout, centerOn])

  const edges = useMemo(() => {
    const positions = layout.positions
    const parentGroups = new Map<string, string[]>()

    for (const rel of data.relationships) {
      if (rel.type !== 'parent') continue
      if (!positions.has(rel.from) || !positions.has(rel.to)) continue
      const list = parentGroups.get(rel.to) ?? []
      list.push(rel.from)
      parentGroups.set(rel.to, list)
    }

    type Twig = { d: string; decoration: Decoration }
    type ChildPath = {
      key: string
      d: string
      thickness: number
      bark: string
      twigs: Twig[]
    }
    const childPaths: ChildPath[] = []
    for (const [childId, parentIds] of parentGroups) {
      const child = positions.get(childId)!
      const parentPoints = [...new Set(parentIds)]
        .map((id) => positions.get(id))
        .filter((point): point is { x: number; y: number } => Boolean(point))
      if (!parentPoints.length) continue

      const bottom = Math.max(...parentPoints.map((point) => point.y)) + CARD_H
      let startX: number
      if (parentPoints.length >= 2) {
        const xs = parentPoints.map((point) => point.x).sort((a, b) => a - b)
        const left = xs[0]
        const right = xs[xs.length - 1]
        startX =
          right - left < CARD_W * 1.6 ? (left + CARD_W + right) / 2 : (left + right + CARD_W) / 2
      } else {
        startX = parentPoints[0].x + CARD_W / 2
      }

      const endX = child.x + CARD_W / 2
      const endY = child.y
      const drop = Math.max(24, endY - bottom)
      // Rama con un leve zigzag orgánico: sale vertical, se desvía y brota en la hoja.
      const mx = startX + (endX - startX) * 0.5
      const t1y = bottom + drop * 0.28
      const t2y = bottom + drop * 0.58
      const t3y = bottom + drop * 0.82
      const wiggle = ((parentPoints.length + childId.length) % 3) - 1
      const thickness = Math.max(6, Math.min(13, 13 - (endY / Math.max(1, layout.height)) * 4 - (childId.length % 3)))

      const p0 = { x: startX, y: bottom - 6 }
      const c1 = { x: startX, y: t1y }
      const c2 = { x: mx + wiggle * 14, y: t1y }
      const p1 = { x: mx + wiggle * 14, y: t2y }
      const c3 = { x: mx + wiggle * 14, y: t3y }
      const c4 = { x: endX, y: t3y }
      const p2 = { x: endX, y: endY }
      const pointAt = (u: number) =>
        u <= 0.5
          ? cubicPoint(p0, c1, c2, p1, u * 2)
          : cubicPoint(p1, c3, c4, p2, (u - 0.5) * 2)
      const directionAt = (u: number) =>
        unitVector(
          u <= 0.5
            ? cubicTangent(p0, c1, c2, p1, u * 2)
            : cubicTangent(p1, c3, c4, p2, (u - 0.5) * 2),
        )

      // Marcas de corteza centradas en la rama: siempre quedan pegadas a ella.
      const bark = [0.2, 0.44, 0.68]
        .map((u, index) => {
          const point = pointAt(u)
          const direction = directionAt(u)
          const normal = { x: -direction.y, y: direction.x }
          const half = thickness * (0.17 + (index % 2) * 0.04)
          const drift = (index % 2 ? 1 : -1) * 2.4
          const start = {
            x: point.x - normal.x * half + direction.x * drift,
            y: point.y - normal.y * half + direction.y * drift,
          }
          const end = {
            x: point.x + normal.x * half + direction.x * drift,
            y: point.y + normal.y * half + direction.y * drift,
          }
          return `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`
        })
        .join(' ')

      const seed = [...childId].reduce((sum, character) => sum + character.charCodeAt(0), 0)
      const twigs: Twig[] = []
      for (let index = 0; index < 2; index++) {
        const u = 0.31 + index * 0.3 + ((seed >> (index * 2)) & 3) * 0.018
        const point = pointAt(u)
        const direction = directionAt(u)
        const side = (seed >> (index + 3)) & 1 ? 1 : -1
        const normal = { x: -direction.y * side, y: direction.x * side }
        const length = 11 + ((seed >> (index + 1)) & 3) * 2.4
        const end = {
          x: point.x + normal.x * length - direction.x * (3 + index),
          y: point.y + normal.y * length - direction.y * (3 + index),
        }
        const control = {
          x: point.x + normal.x * length * 0.55 - direction.x * 1.6,
          y: point.y + normal.y * length * 0.55 - direction.y * 1.6,
        }
        const angle = (Math.atan2(end.y - point.y, end.x - point.x) * 180) / Math.PI
        const kind: Decoration['kind'] = (seed + index * 3) % 5 === 0 ? 'flower' : 'leaf'
        twigs.push({
          d: `M ${round(point.x)} ${round(point.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
          decoration: {
            kind,
            x: end.x,
            y: end.y,
            angle,
            scale: kind === 'flower' ? 1.1 : 0.78 + ((seed >> index) & 1) * 0.16,
          },
        })
      }

      childPaths.push({
        key: childId,
        d: `M ${startX} ${bottom - 6} C ${startX} ${t1y}, ${mx + wiggle * 14} ${t1y}, ${mx + wiggle * 14} ${t2y} C ${mx + wiggle * 14} ${t3y}, ${endX} ${t3y}, ${endX} ${endY}`,
        thickness,
        bark,
        twigs,
      })
    }

    const partnerPaths: Array<{ key: string; x1: number; x2: number; y: number }> = []
    for (const rel of data.relationships) {
      if (rel.type !== 'partner') continue
      const a = positions.get(rel.from)
      const b = positions.get(rel.to)
      if (!a || !b) continue
      if (Math.abs(a.y - b.y) > 1) continue
      const left = a.x <= b.x ? a : b
      const right = a.x <= b.x ? b : a
      partnerPaths.push({
        key: rel.id,
        x1: left.x + CARD_W,
        x2: right.x,
        y: left.y + CARD_H / 2,
      })
    }

    return { childPaths, partnerPaths }
  }, [data.relationships, layout])

  const showHint = !interacted.current && data.people.length > 2

  return (
    <div
      className="canvas"
      ref={containerRef}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (!wasDragged()) onSelect(null)
      }}
    >
      <div
        className="world"
        style={{
          width: layout.width,
          height: layout.height,
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
        }}
      >
        <svg
          className="edges"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          aria-hidden="true"
        >
          {edges.partnerPaths.map((edge) => (
            <line
              key={edge.key}
              className="edge edge-partner"
              x1={edge.x1}
              y1={edge.y}
              x2={edge.x2}
              y2={edge.y}
            />
          ))}
          {edges.childPaths.map((edge) => (
            <g key={edge.key}>
              <path
                className="edge edge-child branch-trunk"
                d={edge.d}
                style={{ strokeWidth: edge.thickness }}
              />
              <path
                className="edge edge-child branch-bark"
                d={edge.bark}
                style={{ strokeWidth: Math.max(1.2, edge.thickness * 0.18) }}
              />
              {edge.twigs.map((twig) => (
                <g key={twig.d}>
                  <path
                    className="branch-twig"
                    d={twig.d}
                    style={{ strokeWidth: Math.max(1.4, edge.thickness * 0.22) }}
                  />
                  {twig.decoration.kind === 'flower' ? (
                    <BranchFlower
                      x={twig.decoration.x}
                      y={twig.decoration.y}
                      angle={twig.decoration.angle}
                      scale={twig.decoration.scale}
                    />
                  ) : (
                    <BranchLeaf
                      x={twig.decoration.x}
                      y={twig.decoration.y}
                      angle={twig.decoration.angle}
                      scale={twig.decoration.scale}
                    />
                  )}
                </g>
              ))}
            </g>
          ))}
          {edges.partnerPaths.map((edge) => (
            <circle
              key={`knot-${edge.key}`}
              className="edge-knot"
              cx={(edge.x1 + edge.x2) / 2}
              cy={edge.y}
              r={5}
            />
          ))}
          <g className="trunk-center" aria-hidden="true">
            {(() => {
              if (!layout.positions.size) return null
              // Tronco central alineado con el centro real del árbol (centroide de la 1ª fila).
              const tops = [...layout.positions.values()]
              const minY = Math.min(...tops.map((p) => p.y))
              const topRow = tops.filter((p) => p.y === minY).map((p) => p.x)
              const cx = topRow.length ? topRow.reduce((a, b) => a + b, 0) / topRow.length + CARD_W / 2 : layout.width / 2
              const h = layout.height
              // El tronco nace justo debajo de la primera generación: así las
              // hojas de arriba no lo tapan y se ve completo hasta las raíces.
              const top = minY + CARD_H + 14
              const bottom = Math.max(top + 50, h - 56)
              const span = bottom - top
              // Se ensancha hacia la base, como un tronco real con sus raíces.
              const halfWidth = (t: number) => 38 + t * 20 + Math.sin(t * Math.PI) * 5

              // Silueta con bordes irregulares: nada de rectas ni óvalos.
              const right: Point[] = []
              const left: Point[] = []
              const steps = 20
              for (let i = 0; i <= steps; i++) {
                const t = i / steps
                const y = top + t * span
                const w = halfWidth(t)
                const sway = Math.sin(t * Math.PI * 2.6 + 0.6) * 2.4 + Math.sin(t * Math.PI * 6.2) * 1.2
                const notch = Math.sin(t * Math.PI * 4.4 + 1.1) * 1.7
                right.push({ x: cx + w + sway, y })
                left.push({ x: cx - w + sway + notch, y })
              }
              const outline: Point[] = [
                ...right,
                { x: cx + halfWidth(1) * 0.45, y: bottom + 5 },
                { x: cx, y: bottom + 9 },
                { x: cx - halfWidth(1) * 0.45, y: bottom + 5 },
                ...left.reverse(),
                { x: cx - 20, y: top - 2 },
                { x: cx, y: top - 6 },
                { x: cx + 20, y: top - 2 },
              ]

              // Vetas de corteza: curvas largas que siguen la madera.
              const grain = (offset: number, wobble: number, from = 0.04, to = 0.95) => {
                const points: Point[] = []
                const segments = 12
                for (let i = 0; i <= segments; i++) {
                  const t = from + ((to - from) * i) / segments
                  const w = halfWidth(t)
                  points.push({
                    x: cx + offset * w * 0.86 + Math.sin(t * Math.PI * 5.4 + wobble) * 1.5,
                    y: top + t * span,
                  })
                }
                return smoothPath(points, false)
              }

              const grooves = [
                { offset: -0.62, wobble: 0.4, width: 1.2, opacity: 0.32 },
                { offset: -0.28, wobble: 2.3, width: 1.7, opacity: 0.4 },
                { offset: 0.08, wobble: 4.1, width: 1.3, opacity: 0.3 },
                { offset: 0.42, wobble: 1.4, width: 1.9, opacity: 0.42 },
                { offset: 0.68, wobble: 3.2, width: 1.2, opacity: 0.28 },
              ]

              const rootOffsets = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]
              const roots = rootOffsets.map((offset, index) => {
                const startX = cx + offset * 30
                const startY = bottom - 6 + Math.abs(offset) * 4
                const endX = cx + offset * 158
                const endY = bottom + 38 + (1 - Math.abs(offset)) * 10 + ((index * 7) % 5) * 1.4
                const baseWidth = 13.5 - Math.abs(offset) * 4.6
                const c1 = {
                  x: startX + (endX - startX) * 0.18,
                  y: startY + 10 + Math.abs(offset) * 4,
                }
                const c2 = {
                  x: startX + (endX - startX) * 0.72,
                  y: endY - 10,
                }
                return {
                  d: ribbonPath(
                    { x: startX, y: startY },
                    c1,
                    c2,
                    { x: endX, y: endY },
                    baseWidth,
                  ),
                  width: baseWidth,
                }
              })

              const tendrils = [-1, -0.5, 0.5, 1].map((offset, index) => {
                const startX = cx + offset * 24
                const startY = bottom - 12
                const endX = cx + offset * 182
                const endY = bottom + 26 + (index % 2) * 9
                return {
                  d: `M ${round(startX)} ${round(startY)} C ${round(cx + offset * 80)} ${round(bottom + 2)}, ${round(cx + offset * 138)} ${round(bottom + 14)}, ${round(endX)} ${round(endY)}`,
                  width: 1.3 + (index % 2) * 0.5,
                  opacity: 0.42 + (index % 2) * 0.12,
                }
              })

              return (
                <>
                  <defs>
                    <linearGradient
                      id="trunk-wood"
                      gradientUnits="userSpaceOnUse"
                      x1={cx - 68}
                      y1={0}
                      x2={cx + 68}
                      y2={0}
                    >
                      <stop offset="0%" className="trunk-stop-edge" />
                      <stop offset="14%" className="trunk-stop-edge" />
                      <stop offset="36%" className="trunk-stop-light" />
                      <stop offset="64%" className="trunk-stop-mid" />
                      <stop offset="88%" className="trunk-stop-edge" />
                      <stop offset="100%" className="trunk-stop-edge" />
                    </linearGradient>
                    <linearGradient
                      id="trunk-root-wood"
                      gradientUnits="userSpaceOnUse"
                      x1={cx - 175}
                      y1={0}
                      x2={cx + 175}
                      y2={0}
                    >
                      <stop offset="0%" className="trunk-stop-edge" />
                      <stop offset="28%" className="trunk-stop-mid" />
                      <stop offset="50%" className="trunk-stop-light" />
                      <stop offset="72%" className="trunk-stop-mid" />
                      <stop offset="100%" className="trunk-stop-edge" />
                    </linearGradient>
                  </defs>
                  <g className="trunk-roots">
                    {tendrils.map((tendril, index) => (
                      <path
                        key={`tendril-${index}`}
                        className="root-lines"
                        d={tendril.d}
                        style={{ strokeWidth: tendril.width, opacity: tendril.opacity }}
                      />
                    ))}
                    {roots.map((root, index) => (
                      <path key={`root-${index}`} className="trunk-root" d={root.d} />
                    ))}
                  </g>
                  <path className="trunk-wood" d={smoothPath(outline, true)} />
                  <path className="trunk-shade" d={grain(0.62, 2.1)} />
                  <path className="trunk-highlight" d={grain(-0.44, 0.9)} />
                  {grooves.map((groove, index) => (
                    <path
                      key={`groove-${index}`}
                      className="trunk-groove"
                      d={grain(groove.offset, groove.wobble)}
                      style={{ strokeWidth: groove.width, opacity: groove.opacity }}
                    />
                  ))}
                </>
              )
            })()}
          </g>
        </svg>

        {data.people.map((person) => {
          const placement = layout.positions.get(person.id)
          if (!placement) return null
          return (
            <PersonCard
              key={person.id}
              person={person}
              x={placement.x}
              y={placement.y}
              selected={person.id === selectedId}
              dimmed={Boolean(selectedId)}
              onSelect={(id) => {
                if (wasDragged()) return
                onSelect(id)
              }}
            />
          )
        })}

        {data.pets.flatMap((pet) =>
          pet.ownerIds.map((ownerId) => {
            const placement = layout.positions.get(ownerId)
            if (!placement) return null
            return (
              <div
                key={`${pet.id}-${ownerId}`}
                className="pet-badge"
                style={{
                  transform: `translate3d(${placement.x}px, ${placement.y + CARD_H + 6}px, 0)`,
                }}
                title={`${pet.name}`}
              >
                <LeafIcon size={13} />
                <span>{pet.name}</span>
              </div>
            )
          }),
        )}
      </div>

      <div className="zoom-controls" data-no-pan data-tour="zoom" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="icon-button" onClick={() => zoomBy(1.25)} aria-label="Acercar">
          <ZoomInIcon />
        </button>
        <button type="button" className="icon-button" onClick={() => zoomBy(0.8)} aria-label="Alejar">
          <ZoomOutIcon />
        </button>
        <button type="button" className="icon-button" onClick={() => fit(0.94)} aria-label="Ver todo el árbol">
          <FitIcon />
        </button>
      </div>

      {showHint ? (
        <div className="canvas-hint" aria-hidden="true">
          Arrastra para mover · Pellizca para acercar
        </div>
      ) : null}
    </div>
  )
}
