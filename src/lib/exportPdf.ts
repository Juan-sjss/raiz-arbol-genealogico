import { jsPDF } from 'jspdf'
import { captureTree } from './capture'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { TreeData } from '../types'

export type ExportResult = 'shared' | 'downloaded'

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'arbol'
  )
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del árbol.'))
    img.src = src
  })
}

async function saveOrSharePdf(fileName: string, base64: string): Promise<ExportResult> {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    })
    await Share.share({
      title: 'Respaldo en PDF',
      text: 'Árbol genealógico exportado con Raíz.',
      url: file.uri,
      files: [file.uri],
      dialogTitle: 'Guardar o compartir el PDF',
    })
    return 'shared'
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'downloaded'
}

export async function exportPdf(
  data: TreeData,
  multiPage: boolean,
): Promise<ExportResult> {
  const dataUrl = await captureTree({ format: 'jpeg', pixelRatio: 2 })
  const img = await loadImage(dataUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 10
  const headerH = 12

  const title = data.title || 'Mi árbol genealógico'

  if (!multiPage) {
    const areaW = pageW - margin * 2
    const areaH = pageH - margin * 2 - headerH
    const r = Math.min(areaW / (img.width * (25.4 / 96)), areaH / (img.height * (25.4 / 96)))
    const drawW = img.width * r * (25.4 / 96)
    const drawH = img.height * r * (25.4 / 96)
    const x = (pageW - drawW) / 2
    const y = margin + headerH

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(title, pageW / 2, margin + 5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Exportado el ${formatDate()}`, pageW / 2, margin + 9.5, { align: 'center' })

    doc.addImage(dataUrl, 'JPEG', x, y, drawW, drawH)
  } else {
    // Tiling: cada página muestra un recorte a escala legible.
    const mmToPx = 96 / 25.4
    const pagePxW = pageW * mmToPx
    const pagePxH = pageH * mmToPx
    const tileW = Math.round(pagePxW * 1.3)
    const tileH = Math.round(pagePxH * 1.3)
    const cols = Math.ceil(img.width / tileW)
    const rows = Math.ceil(img.height / tileH)

    let first = true
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!first) doc.addPage()
        first = false

        const sx = c * tileW
        const sy = r * tileH
        const sw = Math.min(tileW, img.width - sx)
        const sh = Math.min(tileH, img.height - sy)

        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No se pudo preparar el PDF.')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sw, sh)
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
        const tileUrl = canvas.toDataURL('image/jpeg', 0.92)

        const areaW = pageW - margin * 2
        const areaH = pageH - margin * 2 - (r === 0 && c === 0 ? headerH : 6)
        const scale = Math.min(areaW / (sw * (25.4 / 96)), areaH / (sh * (25.4 / 96)))
        const drawW = sw * scale * (25.4 / 96)
        const drawH = sh * scale * (25.4 / 96)
        const x = (pageW - drawW) / 2
        const y = margin + (r === 0 && c === 0 ? headerH : 4)

        if (r === 0 && c === 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(14)
          doc.text(title, pageW / 2, margin + 5, { align: 'center' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.text(`Exportado el ${formatDate()}`, pageW / 2, margin + 9.5, { align: 'center' })
        }
        doc.setFontSize(8)
        doc.text(`Página ${r * cols + c + 1} de ${rows * cols}`, pageW / 2, pageH - 4, { align: 'center' })

        doc.addImage(tileUrl, 'JPEG', x, y, drawW, drawH)
      }
    }
  }

  const base64 = doc.output('datauristring').split(',')[1]
  const fileName = `${slug(data.title)}-${dateStamp()}.pdf`
  return saveOrSharePdf(fileName, base64)
}