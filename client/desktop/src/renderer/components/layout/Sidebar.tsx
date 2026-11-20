import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'
import { Icon, type IconName } from '@/components/Icon'

interface NavItem {
  label: string
  to: string
  icon: IconName
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  // Add more screens here as they are implemented
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoText}>CORVENTA</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].join(' ').trim()
            }
          >
            <span className={styles.navIcon}><Icon name={item.icon} size="md" /></span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.version}>v0.1.0</span>
      </div>
    </aside>
  )
}
