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

    const childPaths: Array<{ key: string; d: string; thickness: number }> = []
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
       const drop = endY - bottom
       const cp1x = startX
       const cp1y = bottom + drop * 0.35
       const cp2x = endX
       const cp2y = endY - drop * 0.25
       const thickness = Math.max(1.1, Math.min(3.4, 3.4 - (endY / Math.max(1, layout.height)) * 1.6))
       childPaths.push({ key: childId, d: `M ${startX} ${bottom} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`, thickness })
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
            <path
              key={edge.key}
              className="edge edge-child"
              d={edge.d}
              style={{ strokeWidth: edge.thickness }}
            />
          ))}
          {edges.partnerPaths.map((edge) => (
            <circle
              key={`knot-${edge.key}`}
              className="edge-knot"
              cx={(edge.x1 + edge.x2) / 2}
              cy={edge.y}
              r={4}
            />
          ))}
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
                <span aria-hidden="true">🐾</span>
                <span>{pet.name}</span>
              </div>
            )
          }),
        )}
      </div>

      <div className="zoom-controls" data-no-pan onClick={(event) => event.stopPropagation()}>
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
