import { IconPhoto as Photo } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-panel px-8 py-3">
        <div className="flex items-center">
          <Link className="flex items-center gap-3 text-ink no-underline" to="/">
            <span className="grid size-9 place-items-center rounded-md bg-accent text-white">
              <Photo size={18} strokeWidth={1.8} />
            </span>
            <strong className="text-base font-semibold">Photo Editer</strong>
          </Link>
        </div>
      </header>
      <div className="grid place-items-center">
        <main className="grid w-full max-w-[960px] gap-7 px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
