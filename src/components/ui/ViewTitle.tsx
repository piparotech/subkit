import { PUIText } from '@piparo/cn-web'

export function ViewTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-[6px]">
      <PUIText as="h1" className="m-0 text-[22px] font-bold tracking-[-0.01em]" variant="title2">
        {title}
      </PUIText>
      <p className="mt-[5px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">{description}</p>
    </div>
  )
}
