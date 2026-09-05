import { IconDownload as Download } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { cropImageToSize } from '../features/crop/cropImage'
import {
  CROP_MAX_OVERHANG_RATIO,
  downloadBlob,
  FILL_COLORS,
  filenameWithoutExtension,
  getPixelCropRect,
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
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [fillColor, setFillColor] = useState<FillColorId>('black')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const sourceUrl = useObjectUrl(file)
  const dragState = useRef<{ startX: number; startY: number; origin: CropRect } | null>(null)

  useEffect(() => {
    if (!file) {
      setMeta(null)
      setCropRect(null)
      return
    }

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
    setCropRect(getPixelCropRect(meta.width, meta.height, width, height))
  }, [width, height, meta])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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
      const result = await cropImageToSize(file, { width, height }, cropRect, fillColor)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(result.blob))
    } catch (cause) {
      console.error(cause)
      setError('クロップに失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  async function handleDownload() {
    if (!file || !cropRect) return
    setProcessing(true)
    setError('')
    try {
      const result = await cropImageToSize(file, { width, height }, cropRect, fillColor)
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

  const padX = cropRect ? cropRect.width * CROP_MAX_OVERHANG_RATIO : 0
  const padY = cropRect ? cropRect.height * CROP_MAX_OVERHANG_RATIO : 0
  const stageWidth = meta ? meta.width + padX * 2 : 0
  const stageHeight = meta ? meta.height + padY * 2 : 0

  function updateCropFromPointer(clientX: number, clientY: number, display: HTMLElement) {
    if (!dragState.current || !meta || stageWidth <= 0 || stageHeight <= 0) return
    const bounds = display.getBoundingClientRect()
    const scaleX = stageWidth / bounds.width
    const scaleY = stageHeight / bounds.height
    const deltaX = (clientX - dragState.current.startX) * scaleX
    const deltaY = (clientY - dragState.current.startY) * scaleY
    setCropRect(softClampCropRect({
      ...dragState.current.origin,
      x: dragState.current.origin.x + deltaX,
      y: dragState.current.origin.y + deltaY,
    }, meta.width, meta.height))
  }

  const cropStyle = meta && cropRect && stageWidth > 0
    ? {
        left: `${((cropRect.x + padX) / stageWidth) * 100}%`,
        top: `${((cropRect.y + padY) / stageHeight) * 100}%`,
        width: `${(cropRect.width / stageWidth) * 100}%`,
        height: `${(cropRect.height / stageHeight) * 100}%`,
      }
    : undefined

  const imageStyle = meta && stageWidth > 0
    ? {
        left: `${(padX / stageWidth) * 100}%`,
        top: `${(padY / stageHeight) * 100}%`,
        width: `${(meta.width / stageWidth) * 100}%`,
        height: `${(meta.height / stageHeight) * 100}%`,
      }
    : undefined

  const fillPreview = FILL_COLORS[fillColor]
  const saveLabel = fillColor === 'transparent' ? 'PNGで保存' : 'WebPで保存'

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <h1 className="page-title">クロップ</h1>
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
              元画像: {meta.width} × {meta.height} px ／ 切り抜き: {width} × {height} px
            </p>
          ) : null}
        </div>

        <div className="grid gap-5">
          <div className="grid gap-3 rounded-lg border border-line bg-panel p-6">
            <h2 className="text-sm font-semibold">切り抜き位置</h2>
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
            <p className="text-xs text-muted">枠の大きさは指定したピクセルサイズです。画像外へ少しはみ出せます。</p>
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
                  alt="クロップ結果"
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
