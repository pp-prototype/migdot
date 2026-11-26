import type { ComponentPropsWithoutRef } from 'react'
import { Icon } from '../../shared/Icon'
import styles from './actions.module.css'

type ActionIcon = 'plus' | 'check' | 'edit' | 'trash' | 'calendar' | 'play' | 'pause' | 'undo' | 'archive' | 'refresh' | 'moon' | 'close' | 'unlock' | 'bell'

export default function ActionButton({ icon, label, visibleLabel, tone = 'default', type = 'button', ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  icon: ActionIcon
  label: string
  visibleLabel?: string
  tone?: 'default' | 'primary' | 'danger'
}) {
  return <button {...props} type={type} className={styles.action} data-tone={tone} data-labeled={visibleLabel ? true : undefined} aria-label={label} title={label}>
    <Icon name={icon} />
    {visibleLabel && <span>{visibleLabel}</span>}
  </button>
}
