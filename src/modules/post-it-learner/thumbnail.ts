export type Crop = { zoom: number; x: number; y: number }

export const coverWidth = 480
export const coverHeight = 270
export const initialCrop: Crop = { zoom: 1, x: 0, y: 0 }

export function thumbnailUrl(jpeg: string) {
  return `data:image/jpeg;base64,${jpeg}`
}

export function decodeImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('10 MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.')
  }
  return createImageBitmap(file)
}

export function coverFrame(image: ImageBitmap, crop: Crop | null) {
  const scaleX = coverWidth / image.width
  const scaleY = coverHeight / image.height
  const scale = crop ? Math.max(scaleX, scaleY) * crop.zoom : Math.min(scaleX, scaleY)
  const width = image.width * scale
  const height = image.height * scale
  return { width, height, x: (coverWidth - width) / 2, y: (coverHeight - height) / 2 }
}

function drawImage(canvas: HTMLCanvasElement, image: ImageBitmap, x: number, y: number, width: number, height: number) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('이미지를 변환할 수 없습니다.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, x, y, width, height)
}

export function drawCover(canvas: HTMLCanvasElement, image: ImageBitmap, crop: Crop | null) {
  const { x, y, width, height } = coverFrame(image, crop)
  drawImage(canvas, image, x * (1 - (crop?.x ?? 0)), y * (1 - (crop?.y ?? 0)), width, height)
}

function encodeJpeg(canvas: HTMLCanvasElement, maxLength: number) {
  for (const quality of [0.82, 0.66, 0.48, 0.32]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality).slice('data:image/jpeg;base64,'.length)
    if (jpeg.startsWith('/9j/') && jpeg.length <= maxLength) return jpeg
  }
  throw new Error('이미지를 압축할 수 없습니다.')
}

export function encodeCover(image: ImageBitmap, crop: Crop | null) {
  const canvas = document.createElement('canvas')
  canvas.width = coverWidth
  canvas.height = coverHeight
  drawCover(canvas, image, crop)
  return encodeJpeg(canvas, 98304)
}

export async function preparePhoto(file: File) {
  const image = await decodeImage(file)
  try {
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 960 / Math.max(image.width, image.height))
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const width = image.width * scale
    const height = image.height * scale
    drawImage(canvas, image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    return encodeJpeg(canvas, 196608)
  } finally {
    image.close()
  }
}
