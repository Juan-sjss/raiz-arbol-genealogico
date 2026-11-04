import {
  BookIcon,
  CheckIcon,
  DownloadIcon,
  MoonIcon,
  SparklesIcon,
  SunIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from './Icons'

interface MenuSheetProps {
  open: boolean
  personCount: number
  saveState: 'saved' | 'error'
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onExport: () => void
  onImport: () => void
  onLoadSample: () => void
  onErase: () => void
  onClose: () => void
}

export function MenuSheet({
  open,
  personCount,
  saveState,
  theme,
  onToggleTheme,
  onExport,
  onImport,
  onLoadSample,
  onErase,
  onClose,
}: MenuSheetProps) {
  if (!open) return null

  return (
    <div className="sheet-backdrop backdrop-soft" onPointerDown={onClose}>
      <div
        className="sheet drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de Raíz"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="sheet-header">
          <div>
            <h2>Raíz</h2>
            <p>
              {personCount} {personCount === 1 ? 'persona' : 'personas'} en tu árbol
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar menú">
            <XIcon />
          </button>
        </header>

        <div className="drawer-body">
          <section className="menu-section">
            <h3>Respaldo</h3>
            <button type="button" className="menu-item" onClick={onExport}>
              <span className="menu-icon">
                <DownloadIcon />
              </span>
              <span>
                <strong>Exportar respaldo</strong>
                <small>Archivo JSON para guardar o compartir</small>
              </span>
            </button>
            <button type="button" className="menu-item" onClick={onImport}>
              <span className="menu-icon">
                <UploadIcon />
              </span>
              <span>
                <strong>Importar respaldo</strong>
                <small>Restaura un archivo exportado antes</small>
              </span>
            </button>
          </section>

          <section className="menu-section">
            <h3>Árbol</h3>
            <button type="button" className="menu-item" onClick={onLoadSample}>
              <span className="menu-icon">
                <SparklesIcon />
              </span>
              <span>
                <strong>Cargar árbol de ejemplo</strong>
                <small>Reemplaza el árbol actual por la familia García</small>
              </span>
            </button>
            <button type="button" className="menu-item danger" onClick={onErase}>
              <span className="menu-icon">
                <TrashIcon />
              </span>
              <span>
                <strong>Empezar de cero</strong>
                <small>Borra todas las personas de este dispositivo</small>
              </span>
            </button>
          </section>

          <section className="menu-section">
            <h3>Apariencia</h3>
            <button type="button" className="menu-item" onClick={onToggleTheme}>
              <span className="menu-icon">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</span>
              <span>
                <strong>{theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}</strong>
                <small>Se guarda para la próxima vez</small>
              </span>
            </button>
          </section>

          <section className="menu-section about">
            <h3>
              <BookIcon size={15} /> Acerca de Raíz
            </h3>
            <p>
              Raíz es una app libre para armar tu árbol genealógico. Funciona sin conexión y tus datos
              nunca salen del dispositivo: no hay cuentas, ni servidores, ni rastreo.
            </p>
            <p className="save-indicator">
              {saveState === 'saved' ? (
                <>
                  <CheckIcon size={14} /> Guardado en este dispositivo
                </>
              ) : (
                <>⚠️ No se pudo guardar: falta espacio</>
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
