import { useT } from '@/i18n'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const t = useT()
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t('Ana Ekran')}</h1>
      <p className={styles.subtitle}>
        {t("Corventa Desktop'a hoş geldiniz. Ekranlar burada yer alacak.")}
      </p>
    </div>
  )
}
