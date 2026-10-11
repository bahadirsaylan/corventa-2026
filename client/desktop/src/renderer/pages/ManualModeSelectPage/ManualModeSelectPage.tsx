// Ana ekran "MANUEL BENDING" → Manuel / Yarı Oto seçimi.
//   Manuel   → kayıtlı manuel programlar (operatör pistonları ve rotasyonu kendisi yönetir)
//   Yarı Oto → otomatik büküm ekranları (profil, yön, metot, ölçü), geri esneme düzeltmesi USTAYA
//              (bendingMode='semi' → skipAutoCorrect=true, AI reçete önerisi yok)
// Her kartta "?" → mod açıklaması (ölçü ekranlarındaki bilgi penceresiyle aynı).
// AI (tam otomatik) artık ana ekrandaki OTOMATİK BÜKÜM'den doğrudan başlar.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBendingJobStore } from '@/store/bendingJobStore'
import ManuelHeader from '@/pages/ManuelBendingPage/ManuelHeader'
import InfoModal from '@/pages/RingBendingMeasurementsPage/InfoModal'
import StatusBar from '@/components/StatusBar/StatusBar'
import styles from './ManualModeSelectPage.module.css'

type ModeKey = 'manual' | 'semi'

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
}

export default function ManualModeSelectPage() {
  const navigate = useNavigate()
  const setParams = useBendingJobStore((s) => s.setParams)
  const [info, setInfo] = useState<ModeKey | null>(null)

  function selectManual() {
    navigate('/bending/manual')
  }

  function selectSemi() {
    setParams({ bendingMode: 'semi' })
    navigate('/bending/ai')
  }

  return (
    <div className={styles.page}>
      <ManuelHeader onUp={() => navigate('/dashboard')} onDown={() => navigate('/dashboard')} />

      <h2 className={styles.title}>BÜKÜM TÜRÜ SEÇİNİZ</h2>

      <div className={styles.cardGrid}>
        <ModeCard title="MANUEL BÜKÜM" subtitle="KAYITLI PROGRAMLAR" onSelect={selectManual} onInfo={() => setInfo('manual')} />
        <ModeCard title="YARI OTO BÜKÜM" subtitle="GERİ ESNEME USTADA" onSelect={selectSemi} onInfo={() => setInfo('semi')} />
      </div>

      <StatusBar backTo="/dashboard" confirmDisabled />

      {info && <InfoModal title={INFO[info].title} description={INFO[info].description} onClose={() => setInfo(null)} />}
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
  return (
    <div className={styles.cardWrap}>
      <button type="button" className={styles.card} onClick={onSelect}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.cardSub}>{subtitle}</span>
      </button>
      <button type="button" className={styles.infoBtn} onClick={onInfo} aria-label={`${title} açıklaması`}>
        ?
      </button>
    </div>
  )
}
