import { IconTrash as Trash, IconUpload as Upload } from '@tabler/icons-react'
import { useId, useRef, useState } from 'react'

type ImageFilePickerProps = {
  label: string
  hint?: string
  accept?: string
  fileName?: string
  previewUrl?: string | null
  onSelect: (file: File) => void
  onClear?: () => void
}

export function ImageFilePicker({
  label,
  hint = 'PNG / JPEG / WebP',
  accept = 'image/png,image/jpeg,image/webp',
  fileName,
  previewUrl,
  onSelect,
  onClear,
}: ImageFilePickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const canClear = Boolean(onClear && (fileName || previewUrl))

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    onSelect(file)
  }

  return (
    <div className="grid gap-2">
      <label className="field-label" htmlFor={inputId}>{label}</label>
      <div className="relative">
        <button
          className={`grid w-full gap-4 rounded-lg border border-dashed px-5 py-6 text-left transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-line bg-panel hover:bg-soft'}`}
          onClick={() => inputRef.current?.click()}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragging(false)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            handleFiles(event.dataTransfer.files)
          }}
          type="button"
        >
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-soft text-accent">
              <Upload size={18} />
            </span>
            <div className="grid gap-1 pr-10">
              <strong className="text-sm font-medium text-ink">
                {fileName ?? '画像を選択、またはドロップ'}
              </strong>
              <span className="text-xs text-muted">{hint}</span>
            </div>
          </div>
          {previewUrl ? (
            <div className="grid max-h-48 place-items-center overflow-hidden rounded-md bg-soft">
              <img alt="" className="max-h-48 max-w-full object-contain" src={previewUrl} />
            </div>
          ) : null}
        </button>
        {canClear ? (
          <button
            aria-label={`${label}を削除`}
            className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onClear?.()
            }}
            title={`${label}を削除`}
            type="button"
          >
            <Trash size={18} />
          </button>
        ) : null}
      </div>
      <input
        accept={accept}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ''
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  )
}
