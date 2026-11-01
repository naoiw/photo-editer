import { IconPhoto as Photo } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <div className="page-container">
        <header className="site-header">
          <Link className="site-brand" to="/" aria-label="Photo Editer トップへ">
            <span className="brand-mark"><Photo size={20} strokeWidth={1.8} /></span>
            <strong>Photo Editer</strong>
          </Link>
          <span className="header-caption">IMAGE TOOLS</span>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <span>Photo Editer</span>
          <a href="https://github.com/naoiw/photo-editer" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}
