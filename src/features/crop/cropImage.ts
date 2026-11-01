import { createImageCanvas, drawImageAtCrop } from '../image/canvas'
import {
  canvasToBlob,
  clampImageScale,
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

    const { canvas, context } = createImageCanvas(outputWidth, outputHeight, fillColor)
    drawImageAtCrop(context, bitmap, sourceCrop, scale)

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
