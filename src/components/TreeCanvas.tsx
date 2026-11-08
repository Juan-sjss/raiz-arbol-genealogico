import { useEffect, useMemo, useRef } from 'react'
import { usePanZoom } from '../hooks/usePanZoom'
import { CARD_H, CARD_W, layoutTree } from '../lib/layout'
import type { TreeData } from '../types'
import { FitIcon, ZoomInIcon, ZoomOutIcon } from './Icons'
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

    type ChildPath = {
      key: string
      d: string
      thickness: number
      bark: string
      twig: string
      twigEnd: string
      leaf: string
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
      // Tronco con un leve zigzag orgánico: sale vertical, se desvía y brota en la hoja.
      const mx = startX + (endX - startX) * 0.5
      const t1y = bottom + drop * 0.28
      const t2y = bottom + drop * 0.58
      const t3y = bottom + drop * 0.82
      const wiggle = ((parentPoints.length + childId.length) % 3) - 1
      const thickness = Math.max(6, Math.min(13, 13 - (endY / Math.max(1, layout.height)) * 4 - (childId.length % 3)))
      childPaths.push({
        key: childId,
        d: `M ${startX} ${bottom - 6} C ${startX} ${t1y}, ${mx + wiggle * 14} ${t1y}, ${mx + wiggle * 14} ${t2y} C ${mx + wiggle * 14} ${t3y}, ${endX} ${t3y}, ${endX} ${endY}`,
        thickness,
        bark: `M ${startX + wiggle * 14} ${bottom + drop * 0.18} l -6 ${drop * 0.22} M ${mx + wiggle * 10} ${bottom + drop * 0.42} l 7 ${drop * 0.18} M ${mx - wiggle * 8} ${bottom + drop * 0.62} l -5 ${drop * 0.12}`,
        twig: `M ${mx + wiggle * 6} ${bottom + drop * 0.52} c -4 ${drop * 0.06}, -10 ${drop * 0.1}, ${-18} ${drop * 0.04}`,
        twigEnd: `M ${endX + (mx - endX) * 0.15} ${endY - drop * 0.12} c 2 ${drop * 0.08}, -3 ${drop * 0.14}, ${-7} ${drop * 0.1}`,
        leaf: `M ${endX} ${endY - 8} q 4 -6 10 -4 q -2 8 -10 4`,
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
                style={{ strokeWidth: Math.max(1.4, edge.thickness * 0.22) }}
              />
              <path
                className="edge edge-child branch-twig"
                d={edge.twig}
                style={{ strokeWidth: Math.max(2, edge.thickness * 0.34) }}
              />
              <path
                className="edge edge-child branch-twig"
                d={edge.twigEnd}
                style={{ strokeWidth: Math.max(1.6, edge.thickness * 0.28) }}
              />
              <path className="edge-leaf" d={edge.leaf} />
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
              const top = 150
              const bottom = Math.max(top + 120, h - 60)
              const span = bottom - top
              // Se ensancha hacia la base, como un tronco real con sus raíces.
              const halfWidth = (t: number) => 38 + t * 18 + Math.sin(t * Math.PI) * 5

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

              const roots = Array.from({ length: 9 }, (_, index) => {
                const side = index % 2 === 0 ? 1 : -1
                const step = Math.floor(index / 2) + 1
                const spread = 26 + step * 23
                const startY = bottom - 16 + step * 2
                const endY = bottom + 42 - step * 3
                return {
                  d: `M ${round(cx + side * 7)} ${round(startY)} C ${round(cx + side * spread * 0.34)} ${round(startY + 12)}, ${round(cx + side * spread * 0.7)} ${round(endY - 12)}, ${round(cx + side * spread)} ${round(endY)}`,
                  width: Math.max(1.5, 3.6 - step * 0.42),
                  opacity: Math.max(0.28, 0.62 - step * 0.05),
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
                  </defs>
                  <g className="trunk-roots">
                    {roots.map((root, index) => (
                      <path
                        key={`root-${index}`}
                        className="root-lines"
                        d={root.d}
                        style={{ strokeWidth: root.width, opacity: root.opacity }}
                      />
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
                <span aria-hidden="true">🐾 </span>
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
