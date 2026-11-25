import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { db } from '@/db'
import { toCsv } from './csv'
import { todayIso } from './dates'

const TABLES = ['accounts', 'items', 'cards', 'installments', 'card_statements', 'payments']

// `id` first, then every other key any row has, sorted, so the output is deterministic.
function columnsOf(rows) {
  const keys = new Set()
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k)
  keys.delete('id')
  return ['id', ...[...keys].sort()]
}

async function buildFiles() {
  const files = []
  for (const t of TABLES) {
    const rows = await db[t].toArray() // soft-deleted rows included: the export is a full backup
    files.push({ name: `${t}.csv`, text: toCsv(rows, columnsOf(rows)) })
  }
  return files
}

function download({ name, text }) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Writes one CSV per table. Resolves when done; rejects on failure, or when the share sheet is cancelled. */
export async function exportAll() {
  const files = await buildFiles()
  if (Capacitor.isNativePlatform()) {
    const dir = `payapa-export-${todayIso()}`
    const uris = []
    for (const f of files) {
      const res = await Filesystem.writeFile({
        path: `${dir}/${f.name}`, data: f.text, directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true,
      })
      uris.push(res.uri)
    }
    await Share.share({ files: uris, title: 'Payapa export' })
  } else {
    for (const f of files) download(f)
  }
}
