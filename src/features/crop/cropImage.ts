import {
  canvasToBlob,
  clampImageScale,
  FILL_COLORS,
  IMAGE_EXPORT_EXTENSION,
  getPixelCropRect,
  getScaledSourceSize,
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
  imageScale = 1,
) {
  const bitmap = await createImageBitmap(file)
  try {
    const outputWidth = Math.max(1, Math.floor(outputSize.width))
    const outputHeight = Math.max(1, Math.floor(outputSize.height))
    const scale = clampImageScale(imageScale)
    const scaled = getScaledSourceSize(bitmap.width, bitmap.height, scale)
    const sourceCrop = softClampCropRect(
      {
        ...(cropRect ?? getPixelCropRect(scaled.width, scaled.height, outputWidth, outputHeight)),
        width: outputWidth,
        height: outputHeight,
      },
      scaled.width,
      scaled.height,
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

    context.imageSmoothingEnabled = scale !== 1
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      0,
      0,
      bitmap.width,
      bitmap.height,
      -sourceCrop.x,
      -sourceCrop.y,
      scaled.width,
      scaled.height,
    )

    return {
      blob: await canvasToBlob(canvas),
      cropRect: sourceCrop,
      outputSize: { width: outputWidth, height: outputHeight },
      extension: IMAGE_EXPORT_EXTENSION,
    }
  } finally {
    bitmap.close()
  }
}
