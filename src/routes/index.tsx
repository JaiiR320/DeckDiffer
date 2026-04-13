import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { CreateFolderModal } from '../components/folders/CreateFolderModal'
import { FolderCard } from '../components/folders/FolderCard'
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
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </section>
      </main>

      {isCreateOpen ? (
        <CreateFolderModal
          folderName={folderName}
          onFolderNameChange={setFolderName}
          onClose={closeModal}
          onSubmit={handleCreateFolder}
        />
      ) : null}
    </>
  )
}
