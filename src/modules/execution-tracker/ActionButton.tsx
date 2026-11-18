import type { ComponentPropsWithoutRef } from 'react'
import { Icon } from '../../shared/Icon'
import styles from './actions.module.css'

type ActionIcon = 'plus' | 'check' | 'edit' | 'trash' | 'calendar' | 'play' | 'pause' | 'undo' | 'archive' | 'refresh' | 'moon' | 'close' | 'unlock'

export default function ActionButton({ icon, label, tone = 'default', type = 'button', ...props }: Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
  icon: ActionIcon
  label: string
  tone?: 'default' | 'primary' | 'danger'
}) {
  return <button {...props} type={type} className={styles.action} data-tone={tone} aria-label={label} title={label}>
    <Icon name={icon} />
  </button>
}
