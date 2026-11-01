import { FILL_COLORS, type FillColorId } from '../features/image/imageUtils'

const fillOptions = Object.entries(FILL_COLORS) as [FillColorId, (typeof FILL_COLORS)[FillColorId]][]

type Props = {
  value: FillColorId
  onChange: (value: FillColorId) => void
}

export function FillColorPicker({ value, onChange }: Props) {
  return (
    <div className="grid gap-2">
      <span className="field-label">はみ出し部分の背景色</span>
      <div className="flex flex-wrap gap-2">
        {fillOptions.map(([id, option]) => (
          <button
            aria-label={option.label}
            aria-pressed={value === id}
            className={`grid size-9 place-items-center rounded-md border transition-colors ${value === id ? 'border-accent ring-2 ring-accent/20' : 'border-line'}`}
            key={id}
            onClick={() => onChange(id)}
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
      <p className="text-xs text-muted">選択中: {FILL_COLORS[value].label}</p>
    </div>
  )
}
