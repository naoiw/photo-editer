import { IconMinus as Minus, IconPlus as Plus } from '@tabler/icons-react'
import { IMAGE_SCALE_MAX, IMAGE_SCALE_MIN, IMAGE_SCALE_STEP } from '../features/image/imageUtils'

type Props = {
  label: string
  value: number
  onChange: (value: number) => void
}

export function ImageScaleControls({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label={`${label}を縮小`}
        className="icon-button"
        disabled={value <= IMAGE_SCALE_MIN}
        onClick={() => onChange(value - IMAGE_SCALE_STEP)}
        type="button"
      >
        <Minus size={16} />
      </button>
      <input
        aria-label={`${label}の拡大率`}
        className="w-24 accent-accent"
        max={IMAGE_SCALE_MAX}
        min={IMAGE_SCALE_MIN}
        onChange={(event) => onChange(Number(event.target.value))}
        step={IMAGE_SCALE_STEP}
        type="range"
        value={value}
      />
      <button
        className="min-w-14 rounded-md px-1 py-1.5 text-xs font-medium text-ink hover:bg-soft"
        onClick={() => onChange(1)}
        title="100%に戻す"
        type="button"
      >
        {Math.round(value * 100)}%
      </button>
      <button
        aria-label={`${label}を拡大`}
        className="icon-button"
        disabled={value >= IMAGE_SCALE_MAX}
        onClick={() => onChange(value + IMAGE_SCALE_STEP)}
        type="button"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
