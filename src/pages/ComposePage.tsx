import { IconDownload as Download, IconMinus as Minus, IconPlus as Plus } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { composeBackgroundAndFrame } from '../features/compose/composeImage'
import {
  FILL_COLORS,
  IMAGE_EXPORT_EXTENSION,
  IMAGE_SCALE_MAX,
  IMAGE_SCALE_MIN,
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

type ImageMeta = {
  width: number
  height: number
}

const FILL_OPTIONS = Object.entries(FILL_COLORS) as [FillColorId, (typeof FILL_COLORS)[FillColorId]][]

export function ComposePage() {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [frameFile, setFrameFile] = useState<File | null>(null)
  const [backgroundMeta, setBackgroundMeta] = useState<ImageMeta | null>(null)
  const [frameMeta, setFrameMeta] = useState<ImageMeta | null>(null)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [imageScale, setImageScale] = useState(1)
  const [fillColor, setFillColor] = useState<FillColorId>('black')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const backgroundUrl = useObjectUrl(backgroundFile)
  const frameUrl = useObjectUrl(frameFile)
  const dragState = useRef<{ startX: number; startY: number; origin: CropRect } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const imageScaleRef = useRef(imageScale)
  imageScaleRef.current = imageScale

  useEffect(() => {
    if (!backgroundFile) {
      setBackgroundMeta(null)
      return
    }
    let cancelled = false
    void createImageBitmap(backgroundFile).then((bitmap) => {
      if (cancelled) {
        bitmap.close()
        return
      }
      setBackgroundMeta({ width: bitmap.width, height: bitmap.height })
      bitmap.close()
    }).catch(() => {
      if (!cancelled) setError('背景画像を読み込めませんでした。')
    })
    return () => {
      cancelled = true
    }
  }, [backgroundFile])

  useEffect(() => {
    if (!frameFile) {
      setFrameMeta(null)
      return
    }
    let cancelled = false
    void createImageBitmap(frameFile).then((bitmap) => {
      if (cancelled) {
        bitmap.close()
        return
      }
      setFrameMeta({ width: bitmap.width, height: bitmap.height })
      bitmap.close()
    }).catch(() => {
      if (!cancelled) setError('フレーム画像を読み込めませんでした。')
    })
    return () => {
      cancelled = true
    }
  }, [frameFile])

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

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

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
      clearPreview()
      const url = URL.createObjectURL(result.blob)
      setPreviewUrl(url)
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
      <div className="flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <h1 className="page-title">背景とフレームの合成</h1>
          <p className="text-sm text-muted">
            出力サイズはフレーム画像に合わせます。プレビュー上で背景の位置と大きさを調整できます。
          </p>
        </div>
        <Link className="button-secondary no-underline" to="/">ホームへ戻る</Link>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <section className="grid grid-cols-[1fr_1.2fr] gap-6">
        <div className="grid content-start gap-5 rounded-lg border border-line bg-panel p-6">
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
            onClear={() => {
              setError('')
              setFrameFile(null)
              clearPreview()
            }}
            onSelect={(file) => {
              setError('')
              setFrameFile(file)
              clearPreview()
            }}
            previewUrl={frameUrl}
          />

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

          {backgroundMeta || frameMeta ? (
            <p className="text-xs text-muted">
              {backgroundMeta ? `背景画像: ${backgroundMeta.width} × ${backgroundMeta.height} px` : null}
              {backgroundMeta && frameMeta ? ' ／ ' : null}
              {frameMeta ? `フレーム（出力）: ${frameMeta.width} × ${frameMeta.height} px` : null}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 rounded-lg border border-line bg-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">合成プレビュー</h2>
            {canAdjust ? (
              <div className="flex items-center gap-1">
                <button
                  aria-label="背景を縮小"
                  className="icon-button"
                  disabled={imageScale <= IMAGE_SCALE_MIN}
                  onClick={() => applyImageScale(imageScale - IMAGE_SCALE_STEP)}
                  type="button"
                >
                  <Minus size={16} />
                </button>
                <input
                  aria-label="背景の拡大率"
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
                  aria-label="背景を拡大"
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
              <img
                alt=""
                className="pointer-events-none absolute inset-0 size-full object-fill"
                draggable={false}
                src={frameUrl}
              />
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-line bg-soft text-sm text-muted">
              背景とフレームを選択すると、ここにフレームサイズのプレビューが表示されます。
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {canAdjust ? (
              <p className="text-xs text-muted">
                プレビューの大きさはフレーム画像と同じ比率です。背景をドラッグして位置を変え、スライダーやホイールで大きさを合わせられます。
              </p>
            ) : null}
            <div className="ml-auto flex gap-3">
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
