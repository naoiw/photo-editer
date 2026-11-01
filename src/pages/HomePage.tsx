import { IconCrop as Crop, IconLayersIntersect as LayersIntersect } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'

const tools = [
  {
    to: '/crop',
    title: 'トリミング',
    description: '縦横サイズを指定して、ローカル画像を切り抜き・リサイズします。',
    icon: Crop,
  },
  {
    to: '/compose',
    title: '背景とフレームの合成',
    description: 'フレームのサイズに合わせ、背景の位置と大きさを調整して1枚の画像に合成します。',
    icon: LayersIntersect,
  },
] as const

export function HomePage() {
  return (
    <AppShell>
      <div className="page-intro">
        <p className="eyebrow">IMAGE EDITOR</p>
        <h1 className="page-title">画像加工ツール</h1>
        <p className="page-description">
          ローカルの画像をトリミング、または背景とフレームを合成できます。
          画像はブラウザ内で処理し、サーバーには送信しません。
        </p>
      </div>

      <section aria-label="加工機能" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <Link className="tool-card group" key={tool.to} to={tool.to}>
            <span className="tool-card__icon"><tool.icon size={23} strokeWidth={1.8} /></span>
            <div className="grid gap-2">
              <h2 className="text-lg font-semibold text-ink">{tool.title}</h2>
              <p className="text-sm leading-7 text-muted">{tool.description}</p>
            </div>
            <span className="tool-card__action">開く <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </section>
    </AppShell>
  )
}
