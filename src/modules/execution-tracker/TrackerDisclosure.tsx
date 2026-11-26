import { useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../../shared/Icon'
import styles from './workspace.module.css'

export default function TrackerDisclosure({ label, compact = false, children }: {
  label: string
  compact?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  return <div className={styles.disclosure} data-compact={compact || undefined} onKeyDown={event => {
    if (event.key !== 'Escape' || !open) return
    event.stopPropagation()
    setOpen(false)
    trigger.current?.focus()
  }}>
    <button ref={trigger} type="button" aria-label={compact ? label : undefined} title={compact ? label : undefined} aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(value => !value)}>
      {!compact && label}<Icon name={compact ? 'more' : 'chevron'} />
    </button>
    <div id={panelId} className={styles.disclosurePanel} hidden={!open}>{children}</div>
  </div>
}
