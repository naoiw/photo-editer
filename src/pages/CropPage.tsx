import { IconDownload as Download } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { FillColorPicker } from '../components/FillColorPicker'
import { ImageScaleControls } from '../components/ImageScaleControls'
import { ToolPageHeader } from '../components/ToolPageHeader'
import { cropImageToSize } from '../features/crop/cropImage'
import {
  CROP_MAX_OVERHANG_RATIO,
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
import { useImageMetadata } from '../hooks/useImageMetadata'
import { useBlobPreview } from '../hooks/useBlobPreview'

export function CropPage() {
  const [file, setFile] = useState<File | null>(null)
  const [width, setWidth] = useState(828)
  const [height, setHeight] = useState(1154)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [fillColor, setFillColor] = useState<FillColorId>('black')
  const { previewUrl, clearPreview, showPreview } = useBlobPreview()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [imageScale, setImageScale] = useState(1)
  const sourceUrl = useObjectUrl(file)
  const { meta, loadFailed } = useImageMetadata(file)
  const dragState = useRef<{ startX: number; startY: number; origin: CropRect } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imageScaleRef = useRef(imageScale)
  imageScaleRef.current = imageScale

  useEffect(() => {
    imageScaleRef.current = 1
    setImageScale(1)
    setCropRect(null)
  }, [file])

  useEffect(() => {
    if (!meta) return
    const scaled = getScaledSourceSize(meta.width, meta.height, imageScaleRef.current)
    setCropRect(getPixelCropRect(scaled.width, scaled.height, width, height))
  }, [width, height, meta])

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
    clearPreview()
  }

  async function handleProcess() {
    if (!file || !cropRect) return
    setProcessing(true)
    setError('')
    try {
      const result = await cropImageToSize(file, { width, height }, cropRect, fillColor, imageScale)
      showPreview(result.blob)
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
      showPreview(result.blob)
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
      <ToolPageHeader title="トリミング" description="出力サイズをピクセルで指定し、切り抜き位置を調整できます。枠は画像からはみ出しても構いません。" />

      {error || loadFailed ? <Notice>{error || '画像を読み込めませんでした。'}</Notice> : null}

      <section className="grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6">
        <div className="grid content-start gap-5 min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <ImageFilePicker
            fileName={file?.name}
            label="元画像"
            onClear={() => {
              setError('')
              setFile(null)
              clearPreview()
            }}
            onSelect={handleSelect}
            previewUrl={sourceUrl}
          />

          <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
            <label className="grid min-w-0 gap-2">
              <span className="field-label">幅 (px)</span>
              <input
                className="field-input min-w-0"
                min={1}
                onChange={(event) => setWidth(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                value={width}
              />
            </label>
            <label className="grid min-w-0 gap-2">
              <span className="field-label">高さ (px)</span>
              <input
                className="field-input min-w-0"
                min={1}
                onChange={(event) => setHeight(Math.max(1, Number(event.target.value) || 1))}
                type="number"
                value={height}
              />
            </label>
          </div>

          <FillColorPicker value={fillColor} onChange={setFillColor} />

          {meta ? (
            <p className="text-xs text-muted">
              元画像: {meta.width} × {meta.height} px ／ 拡大後: {Math.round(scaled?.width ?? 0)} × {Math.round(scaled?.height ?? 0)} px ／ 切り抜き: {width} × {height} px
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-5">
          <div className="grid gap-3 min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">切り抜き位置</h2>
              {sourceUrl && meta && cropRect ? (
                <ImageScaleControls label="画像" value={imageScale} onChange={applyImageScale} />
              ) : null}
            </div>
            {sourceUrl && meta && cropRect ? (
              <div
                className="relative mx-auto min-w-0 max-w-full overflow-hidden rounded-md select-none"
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
                  // Match the compose preview: constrain tall images without widening the page.
                  maxHeight: '28rem',
                  width: `min(100%, calc(28rem * ${stageWidth} / ${stageHeight}))`,
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
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-line bg-soft p-4 text-center text-sm text-muted">
                画像を選択すると、ここで切り抜き範囲をドラッグ調整できます。
              </div>
            )}
            <p className="text-xs text-muted">
              枠の大きさは指定したピクセルサイズです。画像を拡大すると枠に入る範囲が狭くなり、縮小すると広くなります。ホイールでも操作できます。
            </p>
          </div>

          <div className="grid gap-4 min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">出力プレビュー</h2>
              <div className="flex flex-wrap gap-2">
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
              <div className="grid min-h-40 place-items-center rounded-md border border-dashed border-line bg-soft p-4 text-center text-sm text-muted">
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
