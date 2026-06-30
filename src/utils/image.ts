const AVATAR_SIZE = 320
const AVATAR_QUALITY = 0.82
const EVENT_IMAGE_MAX_SIZE = 1280
const EVENT_IMAGE_QUALITY = 0.8
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function compressImageToDataUrl(file: File): Promise<string> {
  validateImageFile(file)

  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器不支持图片压缩')
  }

  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const sourceX = Math.max(0, Math.round((image.naturalWidth - side) / 2))
  const sourceY = Math.max(0, Math.round((image.naturalHeight - side) / 2))

  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  return canvas.toDataURL('image/jpeg', AVATAR_QUALITY)
}

export async function compressEventImageToDataUrl(file: File): Promise<string> {
  validateImageFile(file)

  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)
  const scale = Math.min(1, EVENT_IMAGE_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('当前浏览器不支持图片压缩')
  }

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', EVENT_IMAGE_QUALITY)
}

function validateImageFile(file: File): void {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('请选择 PNG、JPEG 或 WebP 图片')
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('图片读取失败，请换一张图片试试'))
      }
    }
    reader.onerror = () => reject(new Error('图片读取失败，请换一张图片试试'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败，请换一张图片试试'))
    image.src = src
  })
}
