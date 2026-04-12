import { Link, createFileRoute } from '@tanstack/react-router'
import { Folder, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { initialFolders } from '../lib/folders'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [folders, setFolders] = useState(initialFolders)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [folderName, setFolderName] = useState('')

  function closeModal() {
    setIsCreateOpen(false)
    setFolderName('')
  }

  function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const name = folderName.trim()
    if (!name) {
      return
    }

    setFolders((currentFolders) => [
      ...currentFolders,
      {
        id: crypto.randomUUID(),
        name,
        deckCount: 0,
      },
    ])
    closeModal()
  }

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-7xl px-8 py-8">
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 text-zinc-400 transition hover:border-cyan-500/50 hover:text-cyan-300"
          >
            <Plus className="h-9 w-9" strokeWidth={1.75} />
            <span className="mt-5 text-xl font-medium text-zinc-300">New Folder</span>
          </button>

          {folders.map((folder) => (
            <Link
              key={folder.id}
              to="/folders/$folderId"
              params={{ folderId: folder.id }}
              className="flex min-h-48 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 px-7 py-6 text-left shadow-[0_24px_60px_rgba(0,0,0,0.25)] transition hover:border-zinc-700"
            >
              <Folder className="h-8 w-8 text-cyan-300" strokeWidth={1.75} />
              <span className="mt-8 text-3xl font-semibold tracking-tight text-zinc-100">
                {folder.name}
              </span>
              <span className="mt-2 text-lg text-zinc-500">
                {folder.deckCount} deck{folder.deckCount === 1 ? '' : 's'}
              </span>
            </Link>
          ))}
        </section>
      </main>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <button
            type="button"
            aria-label="Close create folder modal"
            className="absolute inset-0"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
            <h1 className="text-xl font-semibold text-zinc-100">New Folder</h1>
            <form className="mt-5" onSubmit={handleCreateFolder}>
              <label className="block text-sm font-medium text-zinc-400" htmlFor="folder-name">
                Folder name
              </label>
              <input
                id="folder-name"
                autoFocus
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Enter a folder name"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
