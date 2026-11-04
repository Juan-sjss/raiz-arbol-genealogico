import html2canvas from 'html2canvas'

export interface CaptureOptions {
  format: 'png' | 'jpeg'
  pixelRatio?: number
  backgroundColor?: string
}

const MAX_DIMENSION = 12000

export async function captureTree(options: CaptureOptions): Promise<string> {
  const world = document.querySelector('.world') as HTMLElement | null
  if (!world) throw new Error('No se encontró el árbol en la página.')

  const width = Math.round(world.offsetWidth)
  const height = Math.round(world.offsetHeight)
  if (!width || !height) throw new Error('El árbol está vacío.')

  const ratio = options.pixelRatio ?? 2
  if (width * ratio > MAX_DIMENSION || height * ratio > MAX_DIMENSION) {
    throw new Error('TREE_TOO_LARGE')
  }

  const previousTransform = world.style.transform
  world.style.transform = 'none'

  const bgColor =
    options.backgroundColor ??
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() ??
    '#f3ead7'

  try {
    const canvas = await html2canvas(world, {
      scale: ratio,
      backgroundColor: bgColor,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
    })
    const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const quality = options.format === 'jpeg' ? 0.92 : undefined
    return canvas.toDataURL(mime, quality)
  } finally {
    world.style.transform = previousTransform
  }
}

export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}