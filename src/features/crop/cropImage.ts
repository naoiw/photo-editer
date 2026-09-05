import {
  canvasToBlob,
  FILL_COLORS,
  getPixelCropRect,
  getSourceIntersection,
  softClampCropRect,
  type CropRect,
  type FillColorId,
  type Size,
} from '../image/imageUtils'

export async function cropImageToSize(
  file: File,
  outputSize: Size,
  cropRect: CropRect | undefined,
  fillColor: FillColorId = 'black',
) {
  const bitmap = await createImageBitmap(file)
  try {
    const outputWidth = Math.max(1, Math.floor(outputSize.width))
    const outputHeight = Math.max(1, Math.floor(outputSize.height))
    const sourceCrop = softClampCropRect(
      {
        ...(cropRect ?? getPixelCropRect(bitmap.width, bitmap.height, outputWidth, outputHeight)),
        width: outputWidth,
        height: outputHeight,
      },
      bitmap.width,
      bitmap.height,
    )

    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('画像処理を開始できませんでした。')

    context.clearRect(0, 0, outputWidth, outputHeight)
    const fill = FILL_COLORS[fillColor].canvas
    if (fill) {
      context.fillStyle = fill
      context.fillRect(0, 0, outputWidth, outputHeight)
    }

    const intersection = getSourceIntersection(sourceCrop, bitmap.width, bitmap.height)
    if (intersection) {
      context.drawImage(
        bitmap,
        intersection.sx,
        intersection.sy,
        intersection.sw,
        intersection.sh,
        intersection.dx,
        intersection.dy,
        intersection.sw,
        intersection.sh,
      )
    }

    const transparent = fillColor === 'transparent'
    return {
      blob: await canvasToBlob(canvas, transparent ? 'image/png' : 'image/webp'),
      cropRect: sourceCrop,
      outputSize: { width: outputWidth, height: outputHeight },
      extension: transparent ? 'png' : 'webp',
    }
  } finally {
    bitmap.close()
  }
}
