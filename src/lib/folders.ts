export type FolderItem = {
  id: string
  name: string
  deckCount: number
}

export const initialFolders: FolderItem[] = [
  { id: 'indoraptor', name: 'Indoraptor', deckCount: 3 },
  { id: 'junk', name: 'Junk', deckCount: 5 },
  { id: 'exiled', name: 'Exiled', deckCount: 2 },
]

export function getFolderById(folderId: string) {
  return initialFolders.find((folder) => folder.id === folderId)
}

export function formatFolderName(folderId: string) {
  return folderId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
