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
              // Tronco central alineado con el centro real del árbol (centroide de la 1ª fila).
              const tops = [...layout.positions.values()]
              const minY = Math.min(...tops.map((p) => p.y))
              const topRow = tops.filter((p) => p.y === minY).map((p) => p.x)
              const cx = topRow.length ? topRow.reduce((a, b) => a + b, 0) / topRow.length + CARD_W / 2 : layout.width / 2
              const h = layout.height
              const rows = Math.max(1, layout.generations)
              const baseW = 34
              const segs: Array<{ y1: number; y2: number; w: number }> = []
              for (let g = 0; g < rows; g++) {
                const y1 = 140 + g * ((h - 200) / rows)
                const y2 = 140 + (g + 1) * ((h - 200) / rows)
                segs.push({ y1, y2, w: baseW - g * 4 })
              }
              return (
                <>
                  {segs.map((s, i) => (
                    <g key={`seg-${i}`}>
                      <path
                        d={`M ${cx - s.w} ${s.y1} C ${cx - s.w - 14} ${(s.y1 + s.y2) / 2}, ${cx + s.w + 14} ${(s.y1 + s.y2) / 2}, ${cx + s.w} ${s.y2} L ${cx + s.w} ${s.y2 + 6} C ${cx + s.w + 18} ${(s.y1 + s.y2) / 2}, ${cx - s.w - 18} ${(s.y1 + s.y2) / 2}, ${cx - s.w} ${s.y1 + 6} Z`}
                        className="trunk-segment"
                      />
                      <path
                        d={`M ${cx - s.w * 0.35} ${s.y1 + 10} c -4 14, 3 28, 0 ${Math.max(20, s.y2 - s.y1 - 20)} M ${cx + s.w * 0.3} ${s.y1 + 16} c 3 10, -3 20, 0 ${Math.max(16, s.y2 - s.y1 - 26)} M ${cx - s.w * 0.1} ${s.y1 + 26} c -2 8, 2 16, 0 ${Math.max(12, s.y2 - s.y1 - 36)}`}
                        className="trunk-grain"
                      />
                      <ellipse cx={cx} cy={s.y1 + 10} rx={s.w * 0.5} ry={s.w * 0.32} className="trunk-knot" />
                    </g>
                  ))}
                  {edges.childPaths.map((edge) => (
                    <path key={`t-${edge.key}`} d={edge.d} className="edge edge-child branch-twig" style={{ strokeWidth: 3 }} />
                  ))}
                  <path
                    d={Array.from({ length: 11 }, (_, i) => {
                      const x = cx + (i - 5) * 30
                      return `M ${x} ${h - 8} c ${(i % 2 ? 1 : -1) * 16} 16, ${(i % 2 ? -1 : 1) * 26} 24, ${(i - 5) * 42} 44`
                    }).join(' ')}
                    className="root-lines"
                  />
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
