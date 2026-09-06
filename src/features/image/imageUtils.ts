export const IMAGE_EXPORT_TYPE = 'image/png'
export const IMAGE_EXPORT_EXTENSION = 'png'
export const IMAGE_WEBP_QUALITY = 0.92
export const CROP_MAX_OVERHANG_RATIO = 0.25
export const IMAGE_SCALE_MIN = 0.25
export const IMAGE_SCALE_MAX = 8
export const IMAGE_SCALE_STEP = 0.05

export type CropRect = {
  x: number
  y: number
  width: number
  height: number
}

export type Size = {
  width: number
  height: number
}

export type FillColorId = 'black' | 'red' | 'blue' | 'green' | 'transparent'

export const FILL_COLORS: Record<FillColorId, { label: string; css: string; canvas: string | null }> = {
  black: { label: '黒', css: '#000000', canvas: '#000000' },
  red: { label: '赤', css: '#e03131', canvas: '#e03131' },
  blue: { label: '青', css: '#1c7ed6', canvas: '#1c7ed6' },
  green: { label: '緑', css: '#2f9e44', canvas: '#2f9e44' },
  transparent: { label: '透明', css: 'transparent', canvas: null },
}

/** 指定ピクセルサイズの切り抜き枠を画像中央に置く（はみ出し可） */
export function getPixelCropRect(
  sourceWidth: number,
  sourceHeight: number,
  cropWidth: number,
  cropHeight: number,
): CropRect {
  const width = Math.max(1, Math.floor(cropWidth))
  const height = Math.max(1, Math.floor(cropHeight))
  return {
    x: (sourceWidth - width) / 2,
    y: (sourceHeight - height) / 2,
    width,
    height,
  }
}

/** 多少のはみ出しを許しつつ、切り抜き枠の位置を制限する */
export function softClampCropRect(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number,
  maxOverhangRatio = CROP_MAX_OVERHANG_RATIO,
): CropRect {
  const width = Math.max(1, crop.width)
  const height = Math.max(1, crop.height)
  const ratio = Math.min(1, Math.max(0, maxOverhangRatio))
  const minVisibleX = Math.min(Math.max(0, sourceWidth), width) * (1 - ratio)
  const minVisibleY = Math.min(Math.max(0, sourceHeight), height) * (1 - ratio)
  return {
    x: Math.min(Math.max(minVisibleX - width, crop.x), sourceWidth - minVisibleX),
    y: Math.min(Math.max(minVisibleY - height, crop.y), sourceHeight - minVisibleY),
    width,
    height,
  }
}

export function clampImageScale(value: number) {
  if (!Number.isFinite(value)) return 1
  const stepped = Math.round(value / IMAGE_SCALE_STEP) * IMAGE_SCALE_STEP
  const rounded = Math.round(stepped * 100) / 100
  return Math.min(IMAGE_SCALE_MAX, Math.max(IMAGE_SCALE_MIN, rounded))
}

export function getScaledSourceSize(sourceWidth: number, sourceHeight: number, scale: number) {
  const clamped = clampImageScale(scale)
  return {
    width: sourceWidth * clamped,
    height: sourceHeight * clamped,
  }
}

/** 出力矩形を覆う（cover）最小の拡大率 */
export function getCoverScale(
  sourceWidth: number,
  sourceHeight: number,
  destWidth: number,
  destHeight: number,
) {
  if (sourceWidth <= 0 || sourceHeight <= 0 || destWidth <= 0 || destHeight <= 0) return 1
  return clampImageScale(Math.max(destWidth / sourceWidth, destHeight / sourceHeight))
}

/** 拡大縮小後も、枠の中心が同じ元画像上の点を指すように位置を付け替える */
export function rescaleCropRect(
  crop: CropRect,
  previousScale: number,
  nextScale: number,
  sourceWidth: number,
  sourceHeight: number,
): CropRect {
  const from = previousScale === 0 ? 1 : previousScale
  const to = clampImageScale(nextScale)
  const focusX = (crop.x + crop.width / 2) / from
  const focusY = (crop.y + crop.height / 2) / from
  const scaled = getScaledSourceSize(sourceWidth, sourceHeight, to)
  return softClampCropRect({
    ...crop,
    x: focusX * to - crop.width / 2,
    y: focusY * to - crop.height / 2,
  }, scaled.width, scaled.height)
}

export function getSourceIntersection(crop: CropRect, sourceWidth: number, sourceHeight: number) {
  const left = Math.max(0, crop.x)
  const top = Math.max(0, crop.y)
  const right = Math.min(sourceWidth, crop.x + crop.width)
  const bottom = Math.min(sourceHeight, crop.y + crop.height)
  const width = right - left
  const height = bottom - top
  if (width <= 0 || height <= 0) return null
  return {
    sx: left,
    sy: top,
    sw: width,
    sh: height,
    dx: left - crop.x,
    dy: top - crop.y,
  }
}

export function filenameWithoutExtension(filename: string) {
  return filename.replace(/\.[^/.]+$/, '')
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = IMAGE_EXPORT_TYPE, quality = IMAGE_WEBP_QUALITY) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の書き出しに失敗しました。'))),
      type,
      quality,
    )
  })
}

export async function loadImageBitmap(file: File) {
  return createImageBitmap(file)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url)
}
