import { IconDownload as Download } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ImageFilePicker } from '../components/ImageFilePicker'
import { composeBackgroundAndFrame } from '../features/compose/composeImage'
import { downloadBlob, filenameWithoutExtension, IMAGE_EXPORT_EXTENSION } from '../features/image/imageUtils'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function ComposePage() {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [frameFile, setFrameFile] = useState<File | null>(null)
  const [width, setWidth] = useState<number | ''>('')
  const [height, setHeight] = useState<number | ''>('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [backgroundMeta, setBackgroundMeta] = useState<{ width: number; height: number } | null>(null)

  const backgroundUrl = useObjectUrl(backgroundFile)
  const frameUrl = useObjectUrl(frameFile)

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
      setWidth((current) => (current === '' ? bitmap.width : current))
      setHeight((current) => (current === '' ? bitmap.height : current))
      bitmap.close()
    }).catch(() => {
      if (!cancelled) setError('背景画像を読み込めませんでした。')
    })
    return () => {
      cancelled = true
    }
  }, [backgroundFile])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function runCompose(download: boolean) {
    if (!backgroundFile || !frameFile) return
    setProcessing(true)
    setError('')
    try {
      const result = await composeBackgroundAndFrame(backgroundFile, frameFile, {
        width: width === '' ? undefined : width,
        height: height === '' ? undefined : height,
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

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-6">
        <div className="grid gap-2">
          <h1 className="page-title">背景とフレームの合成</h1>
          <p className="text-sm text-muted">
            背景の上にフレーム（透過PNG推奨）を重ねて書き出します。出力サイズは任意で指定できます。
          </p>
        </div>
        <Link className="button-secondary no-underline" to="/">ホームへ戻る</Link>
      </div>

      {error ? <Notice>{error}</Notice> : null}

      <section className="grid grid-cols-[1fr_1.1fr] gap-6">
        <div className="grid content-start gap-5 rounded-lg border border-line bg-panel p-6">
          <ImageFilePicker
            fileName={backgroundFile?.name}
            label="背景画像"
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
            onSelect={(file) => {
              setError('')
              setFrameFile(file)
              clearPreview()
            }}
            previewUrl={frameUrl}
          />

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2">
              <span className="field-label">出力幅 (px)</span>
              <input
                className="field-input"
                min={1}
                onChange={(event) => {
                  const value = event.target.value
                  setWidth(value === '' ? '' : Math.max(1, Number(value) || 1))
                }}
                placeholder={backgroundMeta ? String(backgroundMeta.width) : '自動'}
                type="number"
                value={width}
              />
            </label>
            <label className="grid gap-2">
              <span className="field-label">出力高さ (px)</span>
              <input
                className="field-input"
                min={1}
                onChange={(event) => {
                  const value = event.target.value
                  setHeight(value === '' ? '' : Math.max(1, Number(value) || 1))
                }}
                placeholder={backgroundMeta ? String(backgroundMeta.height) : '自動'}
                type="number"
                value={height}
              />
            </label>
          </div>

          {backgroundMeta ? (
            <p className="text-xs text-muted">
              背景画像: {backgroundMeta.width} × {backgroundMeta.height} px
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 rounded-lg border border-line bg-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">合成プレビュー</h2>
            <div className="flex gap-3">
              <button
                className="button-secondary"
                disabled={!backgroundFile || !frameFile || processing}
                onClick={() => void runCompose(false)}
                type="button"
              >
                プレビュー
              </button>
              <button
                className="button-primary"
                disabled={!backgroundFile || !frameFile || processing}
                onClick={() => void runCompose(true)}
                type="button"
              >
                <Download size={16} />
                PNGで保存
              </button>
            </div>
          </div>
          {previewUrl ? (
            <div className="grid place-items-center overflow-hidden rounded-md bg-soft p-4">
              <img alt="合成結果" className="max-h-[28rem] max-w-full object-contain" src={previewUrl} />
            </div>
          ) : backgroundUrl && frameUrl ? (
            <div className="relative grid place-items-center overflow-hidden rounded-md bg-soft p-4">
              <div className="relative inline-grid max-h-[28rem] max-w-full">
                <img alt="" className="col-start-1 row-start-1 max-h-[28rem] max-w-full object-contain" src={backgroundUrl} />
                <img alt="" className="col-start-1 row-start-1 max-h-[28rem] max-w-full object-contain" src={frameUrl} />
              </div>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-md border border-dashed border-line bg-soft text-sm text-muted">
              背景とフレームを選択すると、ここに重ね合わせの目安が表示されます。
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
