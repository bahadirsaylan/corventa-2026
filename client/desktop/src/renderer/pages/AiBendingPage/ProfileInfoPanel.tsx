import styles from './ProfileInfoPanel.module.css'

export default function ProfileInfoPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>AÇIKLAMA :</h3>
        <p className={styles.sectionText}>
          KIVIRMAK İSTEDİĞİNİZ PROFİLİ SEÇEREK, MAKİNANIN PROFİL
          KAPASİTESİNE GÖRE DOĞRU KIVIRIM KONUMUNA GİTMESİNİ
          SAĞLAYINIZ.
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>UYARI :</h3>
        <p className={styles.sectionText}>
          KAPASİTE ÜSTÜ KIVIRIM LARDA MAKİNA UYARI VEREREK PİSTON
          BASINÇLARINI SIFIRLAYACAKTIR. MAKİNA HATAY I SIK ALGILADIĞINDA
          KENDİNİ KORUMAK İÇİN GÜVENLİ MODA GEÇECEK VE ÜRETİCİ FİRMA
          TARAFINDAN HATA DÜZELTİLMEDEN AKTİF OLMAYACAKTIR.
        </p>
      </div>
    </div>
  )
}
