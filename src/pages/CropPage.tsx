import { IconDownload as Download, IconMinus as Minus, IconPlus as Plus } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { cropImageToSize } from '../features/crop/cropImage'
import {
  CROP_MAX_OVERHANG_RATIO,
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
  IMAGE_SCALE_STEP,
  clampImageScale,
  downloadBlob,
  FILL_COLORS,
  filenameWithoutExtension,
  getPixelCropRect,
  getScaledSourceSize,
  rescaleCropRect,
  softClampCropRect,
  type CropRect,
  type FillColorId,
} from '../features/image/imageUtils'
import { useObjectUrl } from '../hooks/useObjectUrl'

type ImageMeta = {
  width: number
  height: number
}

const FILL_OPTIONS = Object.entries(FILL_COLORS) as [FillColorId, (typeof FILL_COLORS)[FillColorId]][]

export function CropPage() {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState<ImageMeta | null>(null)
  const [width, setWidth] = useState(828)
  const [height, setHeight] = useState(1154)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [fillColor, setFillColor] = useState<FillColorId>('black')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [imageScale, setImageScale] = useState(1)
  const sourceUrl = useObjectUrl(file)
  const dragState = useRef<{ startX: number; startY: number; origin: CropRect } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imageScaleRef = useRef(imageScale)
  imageScaleRef.current = imageScale

  useEffect(() => {
    setImageScale(1)
    setMeta(null)
    setCropRect(null)
    if (!file) return

    let cancelled = false
    void createImageBitmap(file).then((bitmap) => {
      if (cancelled) {
        bitmap.close()
        return
      }
      setMeta({ width: bitmap.width, height: bitmap.height })
      bitmap.close()
    }).catch(() => {
      if (!cancelled) setError('画像を読み込めませんでした。')
    })

    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    if (!meta) return
    const scaled = getScaledSourceSize(meta.width, meta.height, imageScaleRef.current)
    setCropRect(getPixelCropRect(scaled.width, scaled.height, width, height))
  }, [width, height, meta])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const applyImageScale = useCallback((nextScale: number) => {
    const current = imageScaleRef.current
    const clamped = clampImageScale(nextScale)
    if (clamped === current) return
    imageScaleRef.current = clamped
    setImageScale(clamped)
    setCropRect((currentRect) => {
      if (!currentRect || !meta) return currentRect
      return rescaleCropRect(currentRect, current, clamped, meta.width, meta.height)
    })
  }, [meta])

  const canAdjustCrop = Boolean(sourceUrl && meta && cropRect)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !canAdjustCrop) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      applyImageScale(imageScaleRef.current + (event.deltaY < 0 ? IMAGE_SCALE_STEP : -IMAGE_SCALE_STEP))
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [applyImageScale, canAdjustCrop])

  async function handleSelect(nextFile: File) {
    setError('')
    setFile(nextFile)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function handleProcess() {
    if (!file || !cropRect) return
    setProcessing(true)
    setError('')
    try {
      const result = await cropImageToSize(file, { width, height }, cropRect, fillColor, imageScale)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(result.blob))
    } catch (cause) {
      console.error(cause)
      setError('トリミングに失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDownload() {
    if (!file || !cropRect) return
    setProcessing(true)
    setError('')
    try {
      const result = await cropImageToSize(file, { width, height }, cropRect, fillColor, imageScale)
      downloadBlob(result.blob, `${filenameWithoutExtension(file.name)}-cropped.${result.extension}`)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(result.blob))
    } catch (cause) {
      console.error(cause)
      setError('ダウンロード用の画像を作成できませんでした。')
    } finally {
      setProcessing(false)
    }
  }

  const scaled = meta ? getScaledSourceSize(meta.width, meta.height, imageScale) : null
  const padX = cropRect ? cropRect.width * CROP_MAX_OVERHANG_RATIO : 0
  const padY = cropRect ? cropRect.height * CROP_MAX_OVERHANG_RATIO : 0
  const stageWidth = scaled ? scaled.width + padX * 2 : 0
  const stageHeight = scaled ? scaled.height + padY * 2 : 0

  function updateCropFromPointer(clientX: number, clientY: number, display: HTMLElement) {
    if (!dragState.current || !scaled || stageWidth <= 0 || stageHeight <= 0) return
    const bounds = display.getBoundingClientRect()
    const scaleX = stageWidth / bounds.width
    const scaleY = stageHeight / bounds.height
    const deltaX = (clientX - dragState.current.startX) * scaleX
    const deltaY = (clientY - dragState.current.startY) * scaleY
    setCropRect(softClampCropRect({
      ...dragState.current.origin,
      x: dragState.current.origin.x + deltaX,
      y: dragState.current.origin.y + deltaY,
    }, scaled.width, scaled.height))
  }

  const cropStyle = scaled && cropRect && stageWidth > 0
    ? {
        left: `${((cropRect.x + padX) / stageWidth) * 100}%`,
        top: `${((cropRect.y + padY) / stageHeight) * 100}%`,
        width: `${(cropRect.width / stageWidth) * 100}%`,
        height: `${(cropRect.height / stageHeight) * 100}%`,
      }
    : undefined

  const imageStyle = scaled && stageWidth > 0
    ? {
        left: `${(padX / stageWidth) * 100}%`,
        top: `${(padY / stageHeight) * 100}%`,
        width: `${(scaled.width / stageWidth) * 100}%`,
        height: `${(scaled.height / stageHeight) * 100}%`,
      }
    : undefined

  const fillPreview = FILL_COLORS[fillColor]
  const saveLabel = 'PNGで保存'

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <h1 className="page-title">トリミング</h1>
          <p className="text-sm text-muted">
            出力サイズをピクセルで指定し、切り抜き位置を調整できます。枠は画像からはみ出しても構いません。
          </p>
        </div>
        <Link className="button-secondary no-underline" to="/">ホームへ戻る</Link>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <section className="grid grid-cols-[1fr_1.2fr] gap-6">
        <div className="grid content-start gap-5 rounded-lg border border-line bg-panel p-6">
          <ImageFilePicker
            fileName={file?.name}
            label="元画像"
            onSelect={handleSelect}
            previewUrl={sourceUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2">
              <span className="field-label">幅 (px)</span>
              <input
                className="field-input"
                min={1}
                onChange={(event) => setWidth(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                value={width}
              />
            </label>
            <label className="grid gap-2">
              <span className="field-label">高さ (px)</span>
              <input
                className="field-input"
                min={1}
                onChange={(event) => setHeight(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                value={height}
              />
            </label>
          </div>

          <div className="grid gap-2">
            <span className="field-label">はみ出し部分の背景色</span>
            <div className="flex flex-wrap gap-2">
              {FILL_OPTIONS.map(([id, option]) => (
                <button
                  aria-label={option.label}
                  aria-pressed={fillColor === id}
                  className={`grid size-9 place-items-center rounded-md border transition-colors ${fillColor === id ? 'border-accent ring-2 ring-accent/20' : 'border-line'}`}
                  key={id}
                  onClick={() => setFillColor(id)}
                  style={{
                    background: id === 'transparent'
                      ? 'repeating-conic-gradient(#d8dde3 0% 25%, #ffffff 0% 50%) 50% / 10px 10px'
                      : option.css,
                  }}
                  title={option.label}
                  type="button"
                />
              ))}
            </div>
            <p className="text-xs text-muted">選択中: {fillPreview.label}</p>
          </div>

          {meta ? (
            <p className="text-xs text-muted">
              元画像: {meta.width} × {meta.height} px ／ 拡大後: {Math.round(scaled?.width ?? 0)} × {Math.round(scaled?.height ?? 0)} px ／ 切り抜き: {width} × {height} px
            </p>
          ) : null}
        </div>

        <div className="grid gap-5">
          <div className="grid gap-3 rounded-lg border border-line bg-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">切り抜き位置</h2>
              {sourceUrl && meta && cropRect ? (
                <div className="flex items-center gap-1">
                  <button
                    aria-label="画像を縮小"
                    className="icon-button"
                    disabled={imageScale <= IMAGE_SCALE_MIN}
                    onClick={() => applyImageScale(imageScale - IMAGE_SCALE_STEP)}
                    type="button"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    aria-label="画像の拡大率"
                    className="w-24 accent-accent"
                    max={IMAGE_SCALE_MAX}
                    min={IMAGE_SCALE_MIN}
                    onChange={(event) => applyImageScale(Number(event.target.value))}
                    step={IMAGE_SCALE_STEP}
                    type="range"
                    value={imageScale}
                  />
                  <button
                    className="min-w-14 rounded-md px-1 py-1.5 text-xs font-medium text-ink hover:bg-soft"
                    onClick={() => applyImageScale(1)}
                    title="100%に戻す"
                    type="button"
                  >
                    {Math.round(imageScale * 100)}%
                  </button>
                  <button
                    aria-label="画像を拡大"
                    className="icon-button"
                    disabled={imageScale >= IMAGE_SCALE_MAX}
                    onClick={() => applyImageScale(imageScale + IMAGE_SCALE_STEP)}
                    type="button"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : null}
            </div>
            {sourceUrl && meta && cropRect ? (
              <div
                className="relative overflow-hidden rounded-md select-none"
                onPointerCancel={() => {
                  dragState.current = null
                }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId)
                  dragState.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    origin: cropRect,
                  }
                }}
                onPointerMove={(event) => {
                  updateCropFromPointer(event.clientX, event.clientY, event.currentTarget)
                }}
                onPointerUp={() => {
                  dragState.current = null
                }}
                ref={stageRef}
                style={{
                  aspectRatio: `${stageWidth} / ${stageHeight}`,
                  background: fillColor === 'transparent'
                    ? 'repeating-conic-gradient(#d8dde3 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                    : fillPreview.css,
                }}
              >
                <img
                  alt=""
                  className="absolute block object-fill"
                  draggable={false}
                  src={sourceUrl}
                  style={imageStyle}
                />
                <div
                  className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(32,37,43,0.45)]"
                  style={cropStyle}
                />
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-line bg-soft text-sm text-muted">
                画像を選択すると、ここで切り抜き範囲をドラッグ調整できます。
              </div>
            )}
            <p className="text-xs text-muted">
              枠の大きさは指定したピクセルサイズです。画像を拡大すると枠に入る範囲が狭くなり、縮小すると広くなります。ホイールでも操作できます。
            </p>
          </div>

          <div className="grid gap-4 rounded-lg border border-line bg-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">出力プレビュー</h2>
              <div className="flex gap-3">
                <button className="button-secondary" disabled={!file || processing} onClick={() => void handleProcess()} type="button">
                  プレビュー
                </button>
                <button className="button-primary" disabled={!file || processing} onClick={() => void handleDownload()} type="button">
                  <Download size={16} />
                  {saveLabel}
                </button>
              </div>
            </div>
            {previewUrl ? (
              <div
                className="grid place-items-center overflow-hidden rounded-md p-4"
                style={{
                  background: fillColor === 'transparent'
                    ? 'repeating-conic-gradient(#d8dde3 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                    : '#eef1f4',
                }}
              >
                <img
                  alt="トリミング結果"
                  className="max-h-80 max-w-full object-contain"
                  src={previewUrl}
                  style={{ width: 'auto', height: 'auto' }}
                />
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-line bg-soft text-sm text-muted">
                プレビューまたは保存を実行すると結果が表示されます。
              </div>
            )}
            <p className="text-xs text-muted">出力サイズ: {width} × {height} px</p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
