import { IconDownload as Download, IconEye as Eye, IconEyeOff as EyeOff } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { FillColorPicker } from '../components/FillColorPicker'
import { ImageScaleControls } from '../components/ImageScaleControls'
import { ToolPageHeader } from '../components/ToolPageHeader'
import { composeBackgroundAndFrame } from '../features/compose/composeImage'
import {
  FILL_COLORS,
  IMAGE_EXPORT_EXTENSION,
  IMAGE_SCALE_STEP,
  clampImageScale,
  downloadBlob,
  filenameWithoutExtension,
  getCoverScale,
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

export function ComposePage() {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [frameFile, setFrameFile] = useState<File | null>(null)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [fillColor, setFillColor] = useState<FillColorId>('black')
  const [frameHidden, setFrameHidden] = useState(false)
  const { previewUrl, clearPreview, showPreview } = useBlobPreview()
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const backgroundUrl = useObjectUrl(backgroundFile)
  const frameUrl = useObjectUrl(frameFile)
  const { meta: backgroundMeta, loadFailed: backgroundLoadFailed } = useImageMetadata(backgroundFile)
  const { meta: frameMeta, loadFailed: frameLoadFailed } = useImageMetadata(frameFile)
  const dragState = useRef<{ startX: number; startY: number; origin: CropRect } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imageScaleRef = useRef(imageScale)
  imageScaleRef.current = imageScale

  useEffect(() => {
    if (!backgroundMeta || !frameMeta) {
      setCropRect(null)
      imageScaleRef.current = 1
      setImageScale(1)
      return
    }
    const cover = getCoverScale(backgroundMeta.width, backgroundMeta.height, frameMeta.width, frameMeta.height)
    imageScaleRef.current = cover
    setImageScale(cover)
    const scaled = getScaledSourceSize(backgroundMeta.width, backgroundMeta.height, cover)
    setCropRect(getPixelCropRect(scaled.width, scaled.height, frameMeta.width, frameMeta.height))
  }, [backgroundMeta, frameMeta])

  const applyImageScale = useCallback((nextScale: number) => {
    const current = imageScaleRef.current
    const clamped = clampImageScale(nextScale)
    if (clamped === current) return
    imageScaleRef.current = clamped
    setImageScale(clamped)
    setCropRect((currentRect) => {
      if (!currentRect || !backgroundMeta) return currentRect
      return rescaleCropRect(currentRect, current, clamped, backgroundMeta.width, backgroundMeta.height)
    })
  }, [backgroundMeta])

  const canAdjust = Boolean(backgroundUrl && frameUrl && backgroundMeta && frameMeta && cropRect)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !canAdjust) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      applyImageScale(imageScaleRef.current + (event.deltaY < 0 ? IMAGE_SCALE_STEP : -IMAGE_SCALE_STEP))
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [applyImageScale, canAdjust])

  async function runCompose(download: boolean) {
    if (!backgroundFile || !frameFile || !cropRect) return
    setProcessing(true)
    setError('')
    try {
      const result = await composeBackgroundAndFrame(backgroundFile, frameFile, {
        scale: imageScale,
        cropRect,
        fillColor,
      })
      showPreview(result.blob)
      if (download) {
        const base = filenameWithoutExtension(backgroundFile.name)
        downloadBlob(result.blob, `${base}-composed.${IMAGE_EXPORT_EXTENSION}`)
      }
    } catch (cause) {
      console.error(cause)
      setError(download ? 'ダウンロード用の画像を作成できませんでした。' : '合成に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  const scaled = backgroundMeta ? getScaledSourceSize(backgroundMeta.width, backgroundMeta.height, imageScale) : null

  function updateBackgroundFromPointer(clientX: number, clientY: number, display: HTMLElement) {
    if (!dragState.current || !scaled || !frameMeta) return
    const bounds = display.getBoundingClientRect()
    const scaleX = frameMeta.width / bounds.width
    const scaleY = frameMeta.height / bounds.height
    const deltaX = (clientX - dragState.current.startX) * scaleX
    const deltaY = (clientY - dragState.current.startY) * scaleY
    setCropRect(softClampCropRect({
      ...dragState.current.origin,
      x: dragState.current.origin.x - deltaX,
      y: dragState.current.origin.y - deltaY,
    }, scaled.width, scaled.height))
  }

  const backgroundStyle = scaled && cropRect && frameMeta
    ? {
        left: `${(-cropRect.x / frameMeta.width) * 100}%`,
        top: `${(-cropRect.y / frameMeta.height) * 100}%`,
        width: `${(scaled.width / frameMeta.width) * 100}%`,
        height: `${(scaled.height / frameMeta.height) * 100}%`,
        maxWidth: 'none',
        maxHeight: 'none',
      }
    : undefined

  const fillPreview = FILL_COLORS[fillColor]

  return (
    <AppShell>
      <ToolPageHeader title="背景とフレームの合成" description="出力サイズはフレーム画像に合わせます。プレビュー上で背景の位置と大きさを調整できます。" />

      {error || backgroundLoadFailed || frameLoadFailed ? (
        <Notice>{error || (backgroundLoadFailed ? '背景画像を読み込めませんでした。' : 'フレーム画像を読み込めませんでした。')}</Notice>
      ) : null}

      <section className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-6">
        <div className="grid content-start gap-5 min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <ImageFilePicker
            fileName={backgroundFile?.name}
            label="背景画像"
            onClear={() => {
              setError('')
              setBackgroundFile(null)
              clearPreview()
            }}
            onSelect={(file) => {
              setError('')
              setBackgroundFile(file)
              clearPreview()
            }}
            previewUrl={backgroundUrl}
          />

          <ImageFilePicker
            fileName={frameFile?.name}
            hint="透過PNG / WebP 推奨"
            label="フレーム画像"
            actions={frameFile ? (
              <button
                aria-label={frameHidden ? 'フレームを表示' : 'フレームを非表示'}
                aria-pressed={frameHidden}
                className={`inline-flex size-9 items-center justify-center rounded-md transition-colors ${frameHidden ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-soft hover:text-ink'}`}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setFrameHidden((current) => !current)
                }}
                title={frameHidden ? 'フレームを表示' : 'フレームを非表示'}
                type="button"
              >
                {frameHidden ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            ) : undefined}
            onClear={() => {
              setError('')
              setFrameFile(null)
              setFrameHidden(false)
              clearPreview()
            }}
            onSelect={(file) => {
              setError('')
              setFrameFile(file)
              setFrameHidden(false)
              clearPreview()
            }}
            previewUrl={frameUrl}
          />

          <FillColorPicker value={fillColor} onChange={setFillColor} />

          {backgroundMeta || frameMeta ? (
            <p className="text-xs text-muted">
              {backgroundMeta ? `背景画像: ${backgroundMeta.width} × ${backgroundMeta.height} px` : null}
              {backgroundMeta && frameMeta ? ' ／ ' : null}
              {frameMeta ? `フレーム（出力）: ${frameMeta.width} × ${frameMeta.height} px` : null}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 min-w-0 rounded-2xl border border-line bg-panel p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">合成プレビュー</h2>
            {canAdjust ? (
              <ImageScaleControls label="背景" value={imageScale} onChange={applyImageScale} />
            ) : null}
          </div>

          {canAdjust && backgroundUrl && frameUrl && frameMeta && cropRect ? (
            <div
              className="relative mx-auto overflow-hidden rounded-md select-none"
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
                updateBackgroundFromPointer(event.clientX, event.clientY, event.currentTarget)
              }}
              onPointerUp={() => {
                dragState.current = null
              }}
              ref={stageRef}
              style={{
                aspectRatio: `${frameMeta.width} / ${frameMeta.height}`,
                background: fillColor === 'transparent'
                  ? 'repeating-conic-gradient(#d8dde3 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                  : fillPreview.css,
                cursor: 'move',
                maxHeight: '28rem',
                width: `min(100%, calc(28rem * ${frameMeta.width} / ${frameMeta.height}))`,
              }}
            >
              <img
                alt=""
                className="absolute block max-h-none max-w-none object-fill"
                draggable={false}
                src={backgroundUrl}
                style={backgroundStyle}
              />
              {frameHidden ? null : (
                <img
                  alt=""
                  className="pointer-events-none absolute inset-0 size-full object-fill"
                  draggable={false}
                  src={frameUrl}
                />
              )}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-line bg-soft p-4 text-center text-sm text-muted">
              背景とフレームを選択すると、ここにフレームサイズのプレビューが表示されます。
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {canAdjust ? (
              <p className="text-xs text-muted">
                プレビューの大きさはフレーム画像と同じ比率です。背景をドラッグして位置を変え、スライダーやホイールで大きさを合わせられます。
              </p>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                className="button-secondary"
                disabled={!backgroundFile || !frameFile || !cropRect || processing}
                onClick={() => void runCompose(false)}
                type="button"
              >
                プレビュー
              </button>
              <button
                className="button-primary"
                disabled={!backgroundFile || !frameFile || !cropRect || processing}
                onClick={() => void runCompose(true)}
                type="button"
              >
                <Download size={16} />
                PNGで保存
              </button>
            </div>
          </div>

          {previewUrl ? (
            <div className="grid gap-2">
              <h3 className="text-xs font-medium text-muted">書き出し結果</h3>
              <div
                className="grid place-items-center overflow-hidden rounded-md p-4"
                style={{
                  background: fillColor === 'transparent'
                    ? 'repeating-conic-gradient(#d8dde3 0% 25%, #ffffff 0% 50%) 50% / 16px 16px'
                    : '#eef1f4',
                }}
              >
                <img
                  alt="合成結果"
                  className="max-h-80 max-w-full object-contain"
                  src={previewUrl}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  )
}
