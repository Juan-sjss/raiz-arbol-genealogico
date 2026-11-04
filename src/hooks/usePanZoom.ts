import { useCallback, useEffect, useRef, useState } from 'react'

export interface View {
  x: number
  y: number
  scale: number
}

export const MIN_SCALE = 0.15
export const MAX_SCALE = 2.5

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * Arrastre, zoom con rueda y pellizco de dos dedos sobre un lienzo.
 * El elemento referenciado debe tener `touch-action: none`.
 */
export function usePanZoom(contentWidth: number, contentHeight: number) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [view, setViewState] = useState<View>({ x: 0, y: 0, scale: 0.8 })
  const viewRef = useRef<View>(view)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; mid: { x: number; y: number } } | null>(null)
  const dragged = useRef(false)
  const interacted = useRef(false)

  const setView = useCallback((updater: (current: View) => View) => {
    setViewState((current) => {
      const next = updater(current)
      viewRef.current = next
      return next
    })
  }, [])

  const fit = useCallback(
    (factor = 0.9) => {
      const element = containerRef.current
      if (!element || !contentWidth || !contentHeight) return
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const scale = clamp(
        Math.min(rect.width / contentWidth, rect.height / contentHeight) * factor,
        MIN_SCALE,
        1.15,
      )
      setView(() => ({
        scale,
        x: (rect.width - contentWidth * scale) / 2,
        y: (rect.height - contentHeight * scale) / 2,
      }))
    },
    [contentWidth, contentHeight, setView],
  )

  const zoomBy = useCallback(
    (factor: number) => {
      const element = containerRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const cx = rect.width / 2
      const cy = rect.height / 2
      setView((current) => {
        const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
        const ratio = scale / current.scale
        return {
          scale,
          x: cx - (cx - current.x) * ratio,
          y: cy - (cy - current.y) * ratio,
        }
      })
      interacted.current = true
    },
    [setView],
  )

  const centerOn = useCallback(
    (x: number, y: number, minScale = 0.9) => {
      const element = containerRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setView((current) => {
        const scale = clamp(Math.max(current.scale, minScale), MIN_SCALE, 1.3)
        return {
          scale,
          x: rect.width / 2 - x * scale,
          y: rect.height / 2 - y * scale,
        }
      })
      interacted.current = true
    },
    [setView],
  )

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-no-pan]')) return
    dragged.current = false
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current

    const handleMove = (event: PointerEvent) => {
      const previous = pointers.current.get(event.pointerId)
      if (!previous) return
      const point = { x: event.clientX, y: event.clientY }
      pointers.current.set(event.pointerId, point)

      const host = containerRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      const points = [...pointers.current.values()]

      if (points.length >= 2 && pinch.current) {
        const [a, b] = points
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const before = pinch.current
        if (before.distance > 10) {
          const ratio = distance / before.distance
          setView((current) => {
            const scale = clamp(current.scale * ratio, MIN_SCALE, MAX_SCALE)
            const k = scale / current.scale
            const mx = mid.x - rect.left
            const my = mid.y - rect.top
            return {
              scale,
              x: mx - (mx - current.x) * k + (mid.x - before.mid.x) * 0.7,
              y: my - (my - current.y) * k + (mid.y - before.mid.y) * 0.7,
            }
          })
          dragged.current = true
          interacted.current = true
        }
        pinch.current = { distance, mid }
        return
      }

      const dx = point.x - previous.x
      const dy = point.y - previous.y
      if (Math.abs(dx) + Math.abs(dy) > 1.5) {
        dragged.current = true
        interacted.current = true
      }
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
    }

    const handleUp = (event: PointerEvent) => {
      pointers.current.delete(event.pointerId)
      if (pointers.current.size < 2) pinch.current = null
    }

    const handleWheel = (event: WheelEvent) => {
      if (!element) return
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const mx = event.clientX - rect.left
      const my = event.clientY - rect.top
      const factor = Math.exp(-event.deltaY * 0.0016)
      setView((current) => {
        const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE)
        const k = scale / current.scale
        return { scale, x: mx - (mx - current.x) * k, y: my - (my - current.y) * k }
      })
      interacted.current = true
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    element?.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      element?.removeEventListener('wheel', handleWheel)
    }
  }, [setView])

  return {
    containerRef,
    view,
    viewRef,
    setView,
    fit,
    zoomBy,
    centerOn,
    onPointerDown,
    interacted,
    wasDragged: () => dragged.current,
  }
}
