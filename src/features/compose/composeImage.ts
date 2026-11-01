import { createImageCanvas, drawImageAtCrop } from '../image/canvas'
import {
  canvasToBlob,
  clampImageScale,
  getPixelCropRect,
  getScaledSourceSize,
  softClampCropRect,
  type CropRect,
  type FillColorId,
} from '../image/imageUtils'

export type ComposeOptions = {
  /** 背景の拡大率。未指定時は 1 */
  scale?: number
  /** 拡大後背景上の、フレームに写す矩形。未指定時は中央配置 */
  cropRect?: CropRect
  /** 背景がフレームを覆わない部分の塗り。未指定時は黒 */
  fillColor?: FillColorId
}

export async function composeBackgroundAndFrame(
  backgroundFile: File,
  frameFile: File,
  options: ComposeOptions = {},
) {
  const [backgroundResult, frameResult] = await Promise.allSettled([
    createImageBitmap(backgroundFile),
    createImageBitmap(frameFile),
  ])
  if (backgroundResult.status === 'rejected' || frameResult.status === 'rejected') {
    if (backgroundResult.status === 'fulfilled') backgroundResult.value.close()
    if (frameResult.status === 'fulfilled') frameResult.value.close()
    throw new Error('画像の読み込みに失敗しました。')
  }
  const background = backgroundResult.value
  const frame = frameResult.value

  try {
    const width = Math.max(1, frame.width)
    const height = Math.max(1, frame.height)
    const scale = clampImageScale(options.scale ?? 1)
    const fillColor = options.fillColor ?? 'black'
    const scaled = getScaledSourceSize(background.width, background.height, scale)
    const crop = softClampCropRect(
      {
        ...(options.cropRect ?? getPixelCropRect(scaled.width, scaled.height, width, height)),
        width,
        height,
      },
      scaled.width,
      scaled.height,
    )

    const { canvas, context } = createImageCanvas(width, height, fillColor)
    drawImageAtCrop(context, background, crop, scale)
    context.drawImage(frame, 0, 0)

    return {
      blob: await canvasToBlob(canvas),
      outputSize: { width, height },
      cropRect: crop,
    }
  } finally {
    background.close()
    frame.close()
  }
}
