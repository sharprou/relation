import clsx from 'clsx'

interface PersonAvatarProps {
  name: string
  avatar?: string
  seed?: string
  className?: string
  imageClassName?: string
}

const avatarPalettes = [
  'bg-gradient-to-br from-[#ffe2ea] to-white text-[#d95f82]',
  'bg-gradient-to-br from-[#ffdeda] to-white text-[#d86b5c]',
  'bg-gradient-to-br from-[#fff0d8] to-white text-[#b9781e]',
  'bg-gradient-to-br from-[#dff6eb] to-white text-[#4aa77a]',
  'bg-gradient-to-br from-[#e5f0ff] to-white text-[#5f8ee8]',
  'bg-gradient-to-br from-[#fff5f7] to-white text-rose',
]

function pickPalette(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash)
  }

  return avatarPalettes[Math.abs(hash) % avatarPalettes.length]
}

export default function PersonAvatar({ name, avatar, seed, className, imageClassName }: PersonAvatarProps) {
  const initial = name.trim().slice(0, 1) || '人'

  return (
    <div
      className={clsx(
        'grid shrink-0 place-items-center overflow-hidden rounded-full text-sm font-extrabold shadow-avatar ring-2 ring-white',
        avatar ? 'bg-white' : pickPalette(`${seed ?? ''}${name}`),
        className,
      )}
      aria-label={`${name} 的头像`}
    >
      {avatar ? (
        <img src={avatar} alt="" className={clsx('h-full w-full object-cover', imageClassName)} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  )
}
