import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ChevronRightIcon, SparklesIcon, TreeIcon } from './Icons'
import { markOnboardingSeen } from '../lib/onboarding'

interface OnboardingProps {
  open: boolean
  personCount: number
  onClose: () => void
  onLoadSample: () => void
}

type StepKind = 'tour' | 'choice' | 'end'

interface Step {
  id: string
  kind: StepKind
  /** Selector del elemento que se ilumina. Sin selector, la tarjeta se centra. */
  target?: string
  placement?: 'top' | 'bottom'
  shape?: 'pill' | 'card'
  kicker: string
  title: string
  body: ReactNode
  note?: string
}

function buildSteps(personCount: number): Step[] {
  const steps: Step[] = [
    {
      id: 'welcome',
      kind: 'tour',
      kicker: 'Bienvenido a Raíz',
      title: 'Tu familia, con raíces',
      body: (
        <>
          Raíz es un cuaderno vivo para guardar a tu familia: nombres, fechas, lugares,
          historias y hasta las mascotas. Las ramas crecen contigo y todo queda guardado
          <strong> solo en este dispositivo</strong>, sin cuentas ni internet.
        </>
      ),
      note: 'Esta guía dura un minuto y puedes saltarla cuando quieras.',
    },
    {
      id: 'search',
      kind: 'tour',
      target: '[data-tour="search"]',
      placement: 'bottom',
      shape: 'pill',
      kicker: 'Paso 1 · Encontrar',
      title: 'Busca entre las hojas',
      body: (
        <>
          Toca la lupa para buscar a cualquier persona por nombre. El árbol viajará
          directo hasta su hoja, aunque tu familia ya sea muy grande.
        </>
      ),
    },
    {
      id: 'menu',
      kind: 'tour',
      target: '[data-tour="menu"]',
      placement: 'bottom',
      shape: 'pill',
      kicker: 'Paso 2 · Guardar',
      title: 'El baúl de la familia',
      body: (
        <>
          En el menú puedes exportar un respaldo (JSON, imagen o PDF), importar un
          archivo antiguo, cambiar de tema y cargar el árbol de ejemplo.
        </>
      ),
      note: 'Exporta de vez en cuando: es tu copia de seguridad por si cambias de teléfono.',
    },
    {
      id: 'zoom',
      kind: 'tour',
      target: '[data-tour="zoom"]',
      placement: 'top',
      shape: 'card',
      kicker: 'Paso 3 · Explorar',
      title: 'Acerca, aleja y encuadra',
      body: (
        <>
          Los tres botones acercan, alejan y vuelven a encuadrar todo el árbol. También
          puedes arrastrar con el dedo para moverte y pellizcar para hacer zoom.
        </>
      ),
    },
    {
      id: 'add',
      kind: 'tour',
      target: '[data-tour="add"]',
      placement: 'top',
      shape: 'pill',
      kicker: 'Paso 4 · Crecer',
      title: 'Añade una nueva hoja',
      body: (
        <>
          Este botón abre la ficha de una persona nueva. Escribe su nombre, fotografía,
          fechas y oficio. Al guardarla aparecerá como una hoja en tu árbol.
        </>
      ),
    },
  ]

  if (personCount === 0) {
    steps.push({
      id: 'empty',
      kind: 'tour',
      target: '[data-tour="first-person"]',
      placement: 'top',
      shape: 'pill',
      kicker: 'Paso 5 · La primera semilla',
      title: 'Así nace tu árbol',
      body: (
        <>
          Cuando el árbol está vacío verás esta tarjeta. Pulsa
          <strong> «Añadir la primera persona»</strong> y tu tronco empezará a crecer.
          Después, al abrir su hoja, podrás sumar madre, padre, pareja, hijos e hijas.
        </>
      ),
      note: 'El árbol de ejemplo es solo una demo: no se carga salvo que tú lo elijas.',
    })
    steps.push({
      id: 'choice',
      kind: 'choice',
      kicker: 'Todo listo',
      title: '¿Cómo quieres empezar?',
      body: (
        <>
          Tu árbol puede empezar vacío, con tu primera persona, o con la familia García
          de demostración para mirar cómo funciona todo.
        </>
      ),
    })
  } else {
    steps.push({
      id: 'end',
      kind: 'end',
      kicker: 'Todo listo',
      title: 'Sigue haciendo crecer tu árbol',
      body: (
        <>
          Toca cualquier hoja para ver la ficha de esa persona y añadir familiares,
          mascotas o recuerdos. Tu árbol se guarda automáticamente.
        </>
      ),
    })
  }

  return steps
}

const SPOT_PAD = 7

export function Onboarding({ open, personCount, onClose, onLoadSample }: OnboardingProps) {
  const steps = useMemo(() => buildSteps(personCount), [personCount])
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  const step = steps[Math.min(index, steps.length - 1)]

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  // Mide el elemento señalado y se actualiza al girar o redimensionar.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (!step.target) {
        setRect(null)
        return
      }
      const element = document.querySelector(step.target)
      setRect(element ? element.getBoundingClientRect() : null)
    }
    update()
    const timer = window.setTimeout(update, 80)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [open, step.target, index])

  useEffect(() => {
    if (!open) return
    bubbleRef.current?.focus({ preventScroll: true })
  }, [open, index])

  const finish = useCallback(
    (action?: 'sample') => {
      markOnboardingSeen()
      if (action === 'sample') onLoadSample()
      onClose()
    },
    [onClose, onLoadSample],
  )

  const skip = useCallback(() => finish(), [finish])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip()
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(current + 1, steps.length - 1))
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(current - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, skip, steps.length])

  if (!open) return null

  const isLast = index === steps.length - 1
  const vw = window.innerWidth
  const vh = window.innerHeight
  const bubbleWidth = Math.min(392, vw - 24)

  let side: 'above' | 'below' | 'center' = 'center'
  let bubbleStyle: CSSProperties = { width: bubbleWidth }
  let arrowLeft = bubbleWidth / 2
  let spotStyle: CSSProperties | null = null

  if (rect) {
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    const prefersTop = step.placement === 'top'
    side = prefersTop && spaceAbove > 210 ? 'above' : 'below'
    if (side === 'below' && spaceBelow < 210 && spaceAbove > spaceBelow) side = 'above'

    const centerX = rect.left + rect.width / 2
    const left = Math.min(Math.max(centerX - bubbleWidth / 2, 12), vw - bubbleWidth - 12)
    arrowLeft = Math.min(Math.max(centerX - left, 26), bubbleWidth - 26)

    bubbleStyle =
      side === 'above'
        ? { left, width: bubbleWidth, bottom: vh - rect.top + 16 }
        : { left, width: bubbleWidth, top: rect.bottom + 16 }

    spotStyle = {
      left: rect.left - SPOT_PAD,
      top: rect.top - SPOT_PAD,
      width: rect.width + SPOT_PAD * 2,
      height: rect.height + SPOT_PAD * 2,
      borderRadius: step.shape === 'card' ? 26 : 999,
    }
  } else {
    bubbleStyle = { width: bubbleWidth, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  }

  const showArrow = side !== 'center' && rect
  const bubbleClass = [
    'tour-bubble',
    side === 'above' ? 'tour-bubble--above' : side === 'below' ? 'tour-bubble--below' : 'tour-bubble--center',
    isLast ? 'tour-bubble--final' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Introducción a Raíz">
      <div className="tour-catcher" />
      {!rect ? <div className="tour-veil" /> : null}
      {spotStyle ? <div className="tour-spot" style={spotStyle} aria-hidden="true" /> : null}

      <div
        ref={bubbleRef}
        className={bubbleClass}
        style={bubbleStyle}
        tabIndex={-1}
        aria-live="polite"
      >
        <LeafOrnament className="tour-ornament tour-ornament--top" />
        <LeafOrnament className="tour-ornament tour-ornament--bottom" />

        <div className="tour-content">
          {step.id === 'welcome' ? <SproutMark /> : null}

          <p className="tour-kicker">
            <span className="tour-kicker-leaf" aria-hidden="true" />
            {step.kicker}
          </p>
          <h2 className="tour-title">{step.title}</h2>
          <p className="tour-body">{step.body}</p>
          {step.note ? <p className="tour-note">{step.note}</p> : null}

          {step.kind === 'choice' ? (
            <div className="tour-choices">
              <button type="button" className="tour-choice tour-choice--primary" onClick={() => finish()}>
                <span className="tour-choice-icon">
                  <TreeIcon size={21} />
                </span>
                <span className="tour-choice-text">
                  <strong>Empezar mi árbol</strong>
                  <small>Empiezo vacío y crezco a mi ritmo.</small>
                </span>
              </button>
              <button type="button" className="tour-choice" onClick={() => finish('sample')}>
                <span className="tour-choice-icon tour-choice-icon--gold">
                  <SparklesIcon size={21} />
                </span>
                <span className="tour-choice-text">
                  <strong>Ver árbol de ejemplo</strong>
                  <small>La familia García, solo si tú lo pides.</small>
                </span>
              </button>
            </div>
          ) : null}

          <div className="tour-footer">
            <div className="tour-progress" aria-hidden="true">
              {steps.map((item, dotIndex) => (
                <span
                  key={item.id}
                  className={`tour-dot${dotIndex === index ? ' is-active' : ''}${
                    dotIndex < index ? ' is-done' : ''
                  }`}
                />
              ))}
            </div>

            <div className="tour-nav">
              {index > 0 ? (
                <button type="button" className="tour-btn tour-btn--ghost" onClick={() => setIndex(index - 1)}>
                  Atrás
                </button>
              ) : null}

              {!isLast ? (
                <>
                  <button type="button" className="tour-btn tour-btn--quiet" onClick={skip}>
                    Saltar
                  </button>
                  <button type="button" className="tour-btn tour-btn--next" onClick={() => setIndex(index + 1)}>
                    Siguiente
                    <ChevronRightIcon size={15} />
                  </button>
                </>
              ) : step.kind === 'choice' ? (
                <button type="button" className="tour-btn tour-btn--quiet" onClick={skip}>
                  Prefiero explorar por mi cuenta
                </button>
              ) : (
                <button type="button" className="tour-btn tour-btn--next" onClick={skip}>
                  Seguir explorando
                </button>
              )}
            </div>
          </div>
        </div>

        {showArrow ? (
          <span className="tour-arrow" style={{ left: arrowLeft - 9 }} aria-hidden="true" />
        ) : null}
      </div>
    </div>
  )
}

function LeafOrnament({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M7 57C7 30 24 12 57 7 55 41 38 57 7 57Z" fill="currentColor" />
      <path d="M12 52C27 39 39 27 51 15" stroke="rgba(30, 20, 10, 0.28)" strokeWidth="2" fill="none" />
      <path d="M26 38c-1-6-4-10-9-13M35 29c4-1 8-1 12 0M22 44c-5 1-9 0-12-2" stroke="rgba(30, 20, 10, 0.18)" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function SproutMark() {
  return (
    <div className="tour-mark" aria-hidden="true">
      <svg viewBox="0 0 150 130" className="tour-mark-art">
        <defs>
          <linearGradient id="tour-bark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c08a52" />
            <stop offset="0.55" stopColor="#8a5a30" />
            <stop offset="1" stopColor="#5a381f" />
          </linearGradient>
          <linearGradient id="tour-leaf-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#9ab97a" />
            <stop offset="1" stopColor="#5f7a52" />
          </linearGradient>
          <linearGradient id="tour-leaf-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c2cf8d" />
            <stop offset="1" stopColor="#748a4e" />
          </linearGradient>
        </defs>

        <path
          d="M75 111c-2-18-4-31-4-44 0-13 1-24 4-35"
          stroke="url(#tour-bark)"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M74 88c-10-3-19-9-26-19M72 69c9-4 17-11 22-20M71 60c-7-1-13-4-18-9" stroke="url(#tour-bark)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M73 56c4-8 10-14 18-17" stroke="url(#tour-bark)" strokeWidth="4" strokeLinecap="round" fill="none" />

        <ellipse cx="47" cy="62" rx="15" ry="8" transform="rotate(-34 47 62)" fill="url(#tour-leaf-a)" />
        <ellipse cx="96" cy="44" rx="17" ry="9" transform="rotate(28 96 44)" fill="url(#tour-leaf-b)" />
        <ellipse cx="88" cy="33" rx="13" ry="7" transform="rotate(48 88 33)" fill="url(#tour-leaf-a)" />
        <ellipse cx="53" cy="48" rx="12" ry="7" transform="rotate(-55 53 48)" fill="url(#tour-leaf-b)" />
        <ellipse cx="74" cy="24" rx="12" ry="7" transform="rotate(-8 74 24)" fill="url(#tour-leaf-a)" />

        <path d="M75 111c-9 5-16 8-25 8M75 111c8 5 15 8 24 8M75 111c-4 5-6 9-6 14M75 111c4 5 6 9 6 14" stroke="url(#tour-bark)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  )
}
