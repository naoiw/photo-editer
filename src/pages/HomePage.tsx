import { IconCrop as Crop, IconLayersIntersect as LayersIntersect } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

const tools = [
  {
    to: '/crop',
    title: 'クロップ',
    description: '縦横サイズを指定して、ローカル画像を切り抜き・リサイズします。',
    icon: Crop,
  },
  {
    to: '/compose',
    title: '背景とフレームの合成',
    description: '背景画像の上にフレーム画像を重ねて、1枚の画像として書き出します。',
    icon: LayersIntersect,
  },
] as const

export function HomePage() {
  return (
    <AppShell>
      <div className="grid gap-2">
        <h1 className="page-title">画像加工ツール</h1>
        <p className="text-sm text-muted">
          ローカルの画像をブラウザ上でクロップしたり、背景とフレームを合成したりできます。画像はサーバーへ送信されません。
        </p>
      </div>

      <section className="grid grid-cols-2 gap-5">
        {tools.map((tool) => (
          <Link
            className="grid gap-5 rounded-lg border border-line bg-panel p-6 text-ink no-underline transition-colors hover:bg-soft"
            key={tool.to}
            to={tool.to}
          >
            <span className="grid size-10 place-items-center rounded-md bg-soft text-accent">
              <tool.icon size={20} />
            </span>
            <div className="grid gap-2">
              <h2 className="text-lg font-semibold">{tool.title}</h2>
              <p className="text-sm leading-6 text-muted">{tool.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </AppShell>
  )
}
