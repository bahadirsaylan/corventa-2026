import { useNavigate } from 'react-router-dom'
import MachineCodeBar from './MachineCodeBar'
import SettingsHeader from './SettingsHeader'
import SettingsMenuGrid from './SettingsMenuGrid'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <MachineCodeBar />
      <SettingsHeader onBack={() => navigate('/dashboard')} />
      <SettingsMenuGrid />
    </div>
  )
}
