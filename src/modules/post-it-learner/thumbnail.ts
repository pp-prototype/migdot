export function thumbnailUrl(jpeg: string) {
  return `data:image/jpeg;base64,${jpeg}`
}

export async function prepareImage(file: File, kind: 'cover' | 'photo') {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('10 MB 이하의 JPG, PNG, WebP 이미지를 선택해 주세요.')
  }
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const cover = kind === 'cover'
    const photoScale = Math.min(1, 960 / Math.max(image.width, image.height))
    canvas.width = cover ? 480 : Math.max(1, Math.round(image.width * photoScale))
    canvas.height = cover ? 270 : Math.max(1, Math.round(image.height * photoScale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지를 변환할 수 없습니다.')
    const scale = cover ? Math.max(canvas.width / image.width, canvas.height / image.height) : photoScale
    const width = image.width * scale
    const height = image.height * scale
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
    for (const quality of [0.82, 0.66, 0.48, 0.32]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality).slice('data:image/jpeg;base64,'.length)
      if (jpeg.startsWith('/9j/') && jpeg.length <= (cover ? 98304 : 196608)) return jpeg
    }
    throw new Error('이미지를 압축할 수 없습니다.')
  } finally {
    image.close()
  }
}
