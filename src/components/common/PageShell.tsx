import type { ReactNode } from 'react'

interface PageShellProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export default function PageShell({ eyebrow, title, description, children }: PageShellProps) {
  return (
    <section className="space-y-5">
      <header className="rounded-[1.5rem] bg-white/72 p-5 shadow-soft ring-1 ring-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink/68">{description}</p>
      </header>
      {children}
    </section>
  )
}
