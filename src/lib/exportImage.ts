import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { captureTree, dataUrlToBase64 } from './capture'
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

export async function exportImage(
  data: TreeData,
  format: 'jpeg' | 'png',
): Promise<ExportResult> {
  const dataUrl = await captureTree({ format, pixelRatio: 2 })
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  const fileName = `${slug(data.title)}-${dateStamp()}.${ext}`

  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: fileName,
      data: dataUrlToBase64(dataUrl),
      directory: Directory.Cache,
    })
    await Share.share({
      title: `Imagen de ${data.title}`,
      text: `Árbol genealógico "${data.title}" exportado con Raíz.`,
      url: file.uri,
      files: [file.uri],
      dialogTitle: 'Guardar o compartir la imagen',
    })
    return 'shared'
  }

  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return 'downloaded'
}