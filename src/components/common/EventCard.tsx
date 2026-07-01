import { useState } from 'react'
import { getEventImages } from '../../features/events/eventService'
import type { InteractionEvent, Person } from '../../types'
import PersonAvatar from './PersonAvatar'

interface EventCardProps {
  event: InteractionEvent
  person?: Person
  onEdit: (event: InteractionEvent) => void
  onDelete: (event: InteractionEvent) => void
}

function formatSignedChange(value: number): string {
  if (!Number.isFinite(value)) return '+0'
  const nextValue = Math.trunc(value)
  return nextValue > 0 ? `+${nextValue}` : String(nextValue)
}

export default function EventCard({ event, person, onEdit, onDelete }: EventCardProps) {
  const note = event.note ?? ''
  const images = getEventImages(event)
  const visibleImages = images.slice(0, 3)
  const imageGridClass = visibleImages.length === 1 ? 'grid-cols-1' : visibleImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const previewImage = previewIndex === null ? null : images[previewIndex]
  const showPreviousImage = () => setPreviewIndex((current) => current === null ? null : (current - 1 + images.length) % images.length)
  const showNextImage = () => setPreviewIndex((current) => current === null ? null : (current + 1) % images.length)

  return (
    <article className="rounded-[1.35rem] bg-white/76 p-4 shadow-soft ring-1 ring-violet/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          {person ? <PersonAvatar name={person.name} avatar={person.avatar} seed={person.circle} className="h-11 w-11 text-base" /> : null}
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold text-ink">{event.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
              {person?.name ?? '未知人物'} · {event.eventType} · {event.eventDate}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-sage/15 px-2.5 py-1 text-[11px] font-bold text-sage">{event.emotionalTone}</span>
      </div>

      {note ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">{note}</p> : null}

      {visibleImages.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${imageGridClass}`}>
          {visibleImages.map((image, index) => (
            <button
              key={`${image.slice(0, 28)}-${index}`}
              type="button"
              className="group relative min-w-0 overflow-hidden rounded-[1.1rem] bg-paper shadow-[0_12px_26px_rgba(218,116,139,0.10)] ring-1 ring-violet/10"
              onClick={() => setPreviewIndex(index)}
            >
              <img src={image} alt="" className={`${visibleImages.length === 1 ? 'h-40' : 'aspect-square'} w-full object-cover transition duration-200 group-hover:scale-[1.02]`} />
              {index === 2 && images.length > 3 ? (
                <span className="absolute inset-0 grid place-items-center bg-ink/42 text-lg font-black text-white">
                  +{images.length - 3}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
        {event.affectRelationship ? (
          <>
            <span className="rounded-full bg-rose/10 px-2.5 py-1 text-rose">❤️ 亲密度 {formatSignedChange(event.intimacyChange)}</span>
            <span className="rounded-full bg-lake/10 px-2.5 py-1 text-lake">🛡 信任度 {formatSignedChange(event.trustChange)}</span>
          </>
        ) : (
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/55">不影响关系数值</span>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button type="button" className="flex-1 rounded-2xl bg-paper/90 px-4 py-2 text-sm font-bold text-ink/70" onClick={() => onEdit(event)}>
          编辑
        </button>
        <button type="button" className="flex-1 rounded-2xl bg-violetMist px-4 py-2 text-sm font-bold text-violet" onClick={() => onDelete(event)}>
          删除
        </button>
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/68 p-4" role="dialog" aria-modal="true" onClick={() => setPreviewIndex(null)}>
          <div className="relative w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <img src={previewImage} alt="" className="max-h-[78vh] w-full rounded-[1.35rem] object-contain bg-white shadow-soft ring-1 ring-white/40" />
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-white/92 px-3 py-1.5 text-xs font-black text-ink shadow-soft"
              onClick={() => setPreviewIndex(null)}
            >
              关闭
            </button>
            {images.length > 1 ? (
              <div className="mt-3 flex justify-center gap-3">
                <button type="button" className="rounded-full bg-white/92 px-4 py-2 text-xs font-black text-violet shadow-soft" onClick={showPreviousImage}>
                  上一张
                </button>
                <button type="button" className="rounded-full bg-white/92 px-4 py-2 text-xs font-black text-violet shadow-soft" onClick={showNextImage}>
                  下一张
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}
