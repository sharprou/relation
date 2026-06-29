import type { ReactNode } from 'react'

interface PageShellProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export default function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  return (
    <section className="space-y-4">
      <header className="px-0 pb-1 pt-2">
        <p className="sr-only">{eyebrow}</p>
        <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#151321]">{title}</h1>
        <p className="sr-only">{description}</p>
      </header>
      {children}
    </section>
  )
}
