import { useTree } from '../store/TreeStore'

export function Toast() {
  const { toast } = useTree()
  if (!toast) return null
  return (
    <div className={`toast${toast.tone === 'error' ? ' is-error' : ''}`} role="status" key={toast.id}>
      {toast.message}
    </div>
  )
}
