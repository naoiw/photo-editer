import {
  FILL_COLORS,
  getScaledSourceSize,
  clampImageScale,
  type CropRect,
  type FillColorId,
} from './imageUtils'

/** Create a fresh output canvas, optionally filled behind transparent image areas. */
export function createImageCanvas(width: number, height: number, fillColor: FillColorId) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('画像処理を開始できませんでした。')

  const fill = FILL_COLORS[fillColor].canvas
  if (fill) {
    context.fillStyle = fill
    context.fillRect(0, 0, width, height)
  }
  return { canvas, context }
}

/** Draw the scaled source into the output coordinates, offset by the crop window. */
export function drawImageAtCrop(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  crop: CropRect,
  scale: number,
) {
  const scaled = getScaledSourceSize(bitmap.width, bitmap.height, scale)
  context.imageSmoothingEnabled = clampImageScale(scale) !== 1
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    bitmap,
    0, 0, bitmap.width, bitmap.height,
    -crop.x, -crop.y, scaled.width, scaled.height,
  )
}
