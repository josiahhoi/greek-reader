import type { SyncStatus } from '../hooks/useSyncedProfile'

const LABEL: Record<SyncStatus, string> = {
  local: 'loading…',
  syncing: 'syncing…',
  synced: 'synced',
  offline: 'offline — saved locally',
  error: 'sync error — saved locally',
}

const DOT: Record<SyncStatus, string> = {
  local: 'bg-stone-300 dark:bg-stone-600',
  syncing: 'bg-amber-400 animate-pulse',
  synced: 'bg-emerald-500',
  offline: 'bg-stone-400',
  error: 'bg-red-500',
}

export function SyncIndicator({ status }: { status: SyncStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone-400" title={LABEL[status]}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
      {LABEL[status]}
    </span>
  )
}
