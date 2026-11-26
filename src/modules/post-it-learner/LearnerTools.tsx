import { useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../../shared/Icon'
import styles from './learner-shell.module.css'

function focusSearch(input: HTMLInputElement | null) {
  input?.focus({ preventScroll: true })
}

export default function LearnerTools({ label, query, onSearch, create, management }: {
  label: string
  query: string
  onSearch: (value: string) => void
  create?: ReactNode
  management?: { label: string; actions: ReactNode }
}) {
  const [panel, setPanel] = useState<'search' | 'management' | null>(() => query ? 'search' : null)
  const searchButton = useRef<HTMLButtonElement>(null)
  const manageButton = useRef<HTMLButtonElement>(null)
  const searchId = useId()
  const manageId = useId()

  return <div className={styles.tools} onKeyDown={event => {
    if (event.key !== 'Escape' || !panel) return
    event.preventDefault()
    setPanel(null)
    const trigger = panel === 'search' ? searchButton : manageButton
    trigger.current?.focus()
  }}>
    <div className={styles.toolRow}>
      {create}
      <button ref={searchButton} type="button" className={styles.toolToggle}
        aria-label={query.trim() ? '검색 (필터 적용 중)' : '검색'}
        aria-controls={searchId} aria-expanded={panel === 'search'} data-filtered={Boolean(query.trim())}
        title={label} onClick={() => setPanel(panel === 'search' ? null : 'search')}>
        <Icon name="search" />
      </button>
      {management && <button ref={manageButton} type="button" className={styles.toolToggle}
        aria-label={management.label} title={management.label} aria-controls={manageId}
        aria-expanded={panel === 'management'} onClick={() => setPanel(panel === 'management' ? null : 'management')}>
        <Icon name="more" />
      </button>}
    </div>
    <div id={searchId} className={styles.toolPanel} hidden={panel !== 'search'}>
      {panel === 'search' && <div className={styles.searchField}>
        <Icon name="search" />
        <input ref={focusSearch} type="search" aria-label={label}
          placeholder={label} value={query} onChange={event => onSearch(event.target.value)} />
      </div>}
    </div>
    {management && <div id={manageId} className={styles.toolPanel} hidden={panel !== 'management'}>
      <div className={styles.manageActions}>{management.actions}</div>
    </div>}
  </div>
}
