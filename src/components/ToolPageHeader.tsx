import { Link } from 'react-router-dom'

type Props = {
  title: string
  description: string
}

export function ToolPageHeader({ title, description }: Props) {
  return (
    <div className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div className="grid min-w-0 gap-2">
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <Link className="button-secondary no-underline" to="/">ホームへ戻る</Link>
    </div>
  )
}
