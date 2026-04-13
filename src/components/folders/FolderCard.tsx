import { Link } from '@tanstack/react-router'
import { Folder } from 'lucide-react'
import type { FolderItem } from '../../lib/folders'

type FolderCardProps = {
  folder: FolderItem
}

export function FolderCard({ folder }: FolderCardProps) {
  return (
    <Link
      to="/folders/$folderId"
      params={{ folderId: folder.id }}
      className="flex min-h-48 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 px-7 py-6 text-left shadow-[0_24px_60px_rgba(0,0,0,0.25)] transition hover:border-zinc-700"
    >
      <Folder className="h-8 w-8 text-cyan-300" strokeWidth={1.75} />
      <span className="mt-8 text-3xl font-semibold tracking-tight text-zinc-100">{folder.name}</span>
      <span className="mt-2 text-lg text-zinc-500">
        {folder.deckCount} deck{folder.deckCount === 1 ? '' : 's'}
      </span>
    </Link>
  )
}
