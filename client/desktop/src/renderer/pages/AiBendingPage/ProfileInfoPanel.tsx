import { useT } from '@/i18n'
import styles from './ProfileInfoPanel.module.css'

export default function ProfileInfoPanel() {
  const t = useT()
  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('AÇIKLAMA :')}</h3>
        <p className={styles.sectionText}>
          {t(
            'KIVIRMAK İSTEDİĞİNİZ PROFİLİ SEÇEREK, MAKİNANIN PROFİL KAPASİTESİNE GÖRE DOĞRU KIVRIM KONUMUNA GİTMESİNİ SAĞLAYINIZ.',
          )}
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('UYARI :')}</h3>
        <p className={styles.sectionText}>
          {t(
            'KAPASİTE ÜSTÜ KIVRIMLARDA MAKİNA UYARI VEREREK PİSTON BASINÇLARINI SIFIRLAYACAKTIR. MAKİNA HATAYI SIK ALGILADIĞINDA KENDİNİ KORUMAK İÇİN GÜVENLİ MODA GEÇECEK VE ÜRETİCİ FİRMA TARAFINDAN HATA DÜZELTİLMEDEN AKTİF OLMAYACAKTIR.',
          )}
        </p>
      </div>
    </div>
  )
}
