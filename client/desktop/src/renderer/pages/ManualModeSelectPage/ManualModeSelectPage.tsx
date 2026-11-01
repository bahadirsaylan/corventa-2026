// Ana ekran "MANUEL BENDING" → Manuel / Yarı Oto seçimi.
//   Manuel   → kayıtlı manuel programlar (operatör pistonları ve rotasyonu kendisi yönetir)
//   Yarı Oto → otomatik büküm ekranları (profil, yön, metot, ölçü), geri esneme düzeltmesi USTAYA
//              (bendingMode='semi' → skipAutoCorrect=true, AI reçete önerisi yok)
// Her kartta "?" → mod açıklaması (ölçü ekranlarındaki bilgi penceresiyle aynı).
// AI (tam otomatik) artık ana ekrandaki OTOMATİK BÜKÜM'den doğrudan başlar.
//   Makro    → usta öğrenme programları (EXCEL 28): manuel hareketleri kaydet, düzenle, oynat

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import ManuelHeader from '@/pages/ManuelBendingPage/ManuelHeader'
import InfoModal from '@/pages/RingBendingMeasurementsPage/InfoModal'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './ManualModeSelectPage.module.css'

type ModeKey = 'manual' | 'semi' | 'macro'

const INFO: Record<ModeKey, { title: string; description: string }> = {
  manual: {
    title: 'MANUEL BÜKÜM',
    description:
      'BÜKÜMÜ TAMAMEN OPERATÖR YÖNETİR. KAYITLI MANUEL PROGRAMLARDAN BİRİNİ SEÇEREK VEYA YENİ PROGRAM OLUŞTURARAK ÇALIŞIRSINIZ. PİSTONLARI, ROTASYONU VE YAN DAYAMALARI EKRANDAKİ TUŞLARLA KENDİNİZ HAREKET ETTİRİRSİNİZ. MAKİNE OTOMATİK HESAPLAMA, GERİ ESNEME ÖLÇÜMÜ VE DÜZELTMESİ YAPMAZ.',
  },
  semi: {
    title: 'YARI OTOMATİK BÜKÜM',
    description:
      'PROFİL, KIVRIM YÖNÜ, BÜKÜM METODU VE ÖLÇÜLERİ SİZ GİRERSİNİZ; MAKİNE BÜKÜMÜ OTOMATİK OLARAK YAPAR. BÜKÜM SONUNDA GERİ ESNEME ÖLÇÜMÜ VE DÜZELTMESİ YAPILMAZ — PARÇANIN SON KONTROLÜ VE GEREKİRSE DÜZELTMESİ USTAYA AİTTİR. YAPAY ZEKA REÇETE ÖNERİSİ KULLANILMAZ.',
  },
  macro: {
    title: 'USTA ÖĞRENME (MAKRO)',
    description:
      'USTA MANUEL EKRANDA MAKRO KAYDINI BAŞLATIR VE TUŞLARLA HAREKET EDER. FARKLI BİR EKSEN HAREKET ETMEYE BAŞLADIĞINDA ÖNCEKİ EKSENİN SON GERÇEK DEĞERİ OTOMATİK OLARAK ADIM OLARAK KAYDEDİLİR. KAYIT BİTİNCE MAKROYA İSİM VE AÇIKLAMA VERİLİR. ADIMLAR SONRADAN DÜZENLENEBİLİR (DEĞER, HIZ, EKLE, SİL, SIRALA) VE MAKRO SÜREKLİ VEYA ADIM ADIM OYNATILABİLİR. DURDUR TUŞU TÜM HAREKETİ HEMEN DURDURUR.',
  },
}

export default function ManualModeSelectPage() {
  const navigate = useNavigate()
  const t = useT()
  const resetJob = useBendingJobStore((s) => s.resetJob)
  const setParams = useBendingJobStore((s) => s.setParams)
  const [info, setInfo] = useState<ModeKey | null>(null)

  function selectManual() {
    navigate('/bending/manual')
  }

  // Dashboard AI yolundaki desen: önceki işin parametreleri temizlenir, sonra mod yazılır
  function selectSemi() {
    resetJob()
    setParams({ bendingMode: 'semi' })
    navigate('/bending/ai')
  }

  return (
    <div className={styles.page}>
      <ManuelHeader onUp={() => navigate('/dashboard')} onDown={() => navigate('/dashboard')} />

      <h2 className={styles.title}>{t('BÜKÜM TÜRÜ SEÇİNİZ')}</h2>

      <div className={styles.cardGrid}>
        <ModeCard title={t('MANUEL BÜKÜM')} subtitle={t('KAYITLI PROGRAMLAR')} onSelect={selectManual} onInfo={() => setInfo('manual')} />
        <ModeCard title={t('YARI OTO BÜKÜM')} subtitle={t('GERİ ESNEME USTADA')} onSelect={selectSemi} onInfo={() => setInfo('semi')} />
        <ModeCard title={t('MAKRO')} subtitle={t('USTA ÖĞRENME PROGRAMI')} onSelect={() => navigate('/bending/macros')} onInfo={() => setInfo('macro')} />
      </div>

      <StatusBar backTo="/dashboard" confirmDisabled />

      {info && <InfoModal title={t(INFO[info].title)} description={t(INFO[info].description)} onClose={() => setInfo(null)} />}
    </div>
  )
}

function ModeCard({
  title,
  subtitle,
  onSelect,
  onInfo,
}: {
  title: string
  subtitle: string
  onSelect: () => void
  onInfo: () => void
}) {
  const t = useT()
  return (
    <div className={styles.cardWrap}>
      <button type="button" className={styles.card} onClick={onSelect}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardSub}>{subtitle}</span>
      </button>
      <button type="button" className={styles.infoBtn} onClick={onInfo} aria-label={t('{title} açıklaması', { title })}>
        <Icon name="help" size={40} />
      </button>
    </div>
  )
}
