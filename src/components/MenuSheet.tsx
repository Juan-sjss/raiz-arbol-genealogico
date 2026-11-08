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

export type ExportFormat = 'json' | 'jpeg' | 'png' | 'pdf'

interface MenuSheetProps {
  open: boolean
  personCount: number
  saveState: 'saved' | 'error'
  theme: 'light' | 'dark'
  exportFormat: ExportFormat
  onExportFormatChange: (format: ExportFormat) => void
  exportMultiPage: boolean
  onExportMultiPageChange: (value: boolean) => void
  exporting: boolean
  exportProgress: string | null
  onToggleTheme: () => void
  onExport: () => void
  onImport: () => void
  onLoadSample: () => void
  onErase: () => void
  onShowIntro: () => void
  onClose: () => void
}

export function MenuSheet({
  open,
  personCount,
  saveState,
  theme,
  exportFormat,
  onExportFormatChange,
  exportMultiPage,
  onExportMultiPageChange,
  exporting,
  exportProgress,
  onToggleTheme,
  onExport,
  onImport,
  onLoadSample,
  onErase,
  onShowIntro,
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
            <div className="field" style={{ margin: '0 0 10px' }}>
              <span>Formato de exportación</span>
              <select
                value={exportFormat}
                onChange={(event) => onExportFormatChange(event.target.value as ExportFormat)}
                disabled={exporting}
              >
                <option value="json">JSON (respaldo)</option>
                <option value="jpeg">JPEG (imagen)</option>
                <option value="png">PNG (imagen)</option>
                <option value="pdf">PDF (documento)</option>
              </select>
            </div>
            {exportFormat === 'pdf' ? (
              <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <input
                  type="checkbox"
                  checked={exportMultiPage}
                  onChange={(event) => onExportMultiPageChange(event.target.checked)}
                  disabled={exporting}
                />
                <span>Dividir en varias páginas</span>
              </label>
            ) : null}
            <button type="button" className="menu-item" onClick={onExport} disabled={exporting}>
              <span className="menu-icon">
                <DownloadIcon />
              </span>
              <span>
                <strong>{exporting ? 'Exportando…' : 'Exportar'}</strong>
                <small>
                  {exporting
                    ? exportProgress ?? 'Preparando…'
                    : exportFormat === 'json'
                      ? 'Archivo JSON para guardar o compartir'
                      : exportFormat === 'pdf'
                        ? 'Documento PDF del árbol completo'
                        : 'Imagen del árbol completo'}
                </small>
              </span>
            </button>
            {exporting ? (
              <div className="export-progress" aria-live="polite">
                <div className="export-progress-bar" />
              </div>
            ) : null}
            <button type="button" className="menu-item" onClick={onImport} disabled={exporting}>
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

          <section className="menu-section">
            <h3>Ayuda</h3>
            <button type="button" className="menu-item" onClick={onShowIntro}>
              <span className="menu-icon">
                <BookIcon />
              </span>
              <span>
                <strong>Ver la introducción</strong>
                <small>Repasa los botones y cómo crear a la primera persona</small>
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
