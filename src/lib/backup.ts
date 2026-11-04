import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { TreeData } from '../types'

export function treeToJson(data: TreeData): string {
  return JSON.stringify(
    {
      app: 'raiz',
      exportedAt: new Date().toISOString(),
      ...data,
    },
    null,
    2,
  )
}

export function treeFileName(data: TreeData): string {
  const slug =
    data.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'arbol'
  const date = new Date().toISOString().slice(0, 10)
  return `${slug}-${date}.json`
}

export type ExportResult = 'shared' | 'downloaded'

/** Exporta el árbol: en Android lo comparte con otras apps; en web lo descarga. */
export async function exportTree(data: TreeData): Promise<ExportResult> {
  const json = treeToJson(data)
  const fileName = treeFileName(data)

  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({
      title: 'Respaldo de mi árbol genealógico',
      text: `Respaldo de "${data.title}" creado con Raíz.`,
      url: file.uri,
      files: [file.uri],
      dialogTitle: 'Guardar o compartir el respaldo',
    })
    return 'shared'
  }

  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
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

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo'))
    reader.readAsText(file)
  })
}
