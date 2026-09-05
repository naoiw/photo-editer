import { canvasToBlob } from '../image/imageUtils'

export type ComposeOptions = {
  /** 出力キャンバスの幅。未指定時は背景画像の幅を使用 */
  width?: number
  /** 出力キャンバスの高さ。未指定時は背景画像の高さを使用 */
  height?: number
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
    const width = Math.max(1, Math.floor(options.width ?? background.width))
    const height = Math.max(1, Math.floor(options.height ?? background.height))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('画像合成を開始できませんでした。')

    context.drawImage(background, 0, 0, width, height)
    context.drawImage(frame, 0, 0, width, height)

    return {
      blob: await canvasToBlob(canvas),
      outputSize: { width, height },
    }
  } finally {
    background.close()
    frame.close()
  }
}
