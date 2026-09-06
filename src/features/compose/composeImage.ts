import {
  canvasToBlob,
  clampImageScale,
  FILL_COLORS,
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
  const [background, frame] = await Promise.all([
    createImageBitmap(backgroundFile),
    createImageBitmap(frameFile),
  ])

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

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('画像合成を開始できませんでした。')

    context.clearRect(0, 0, width, height)
    const fill = FILL_COLORS[fillColor].canvas
    if (fill) {
      context.fillStyle = fill
      context.fillRect(0, 0, width, height)
    }
    context.imageSmoothingEnabled = scale !== 1
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      background,
      0,
      0,
      background.width,
      background.height,
      -crop.x,
      -crop.y,
      scaled.width,
      scaled.height,
    )
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
