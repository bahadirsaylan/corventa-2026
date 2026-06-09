// SEKIL-31 'KURULUM' kategorisi.
// Servis modülünün Kurulum varyantı — ServiceRequest filter=Kurulum.
// Şimdilik sade liste; ileride özel kurulum check-list'i ile zenginleştirilebilir.

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { ServicePurpose } from '@shared/types'

import { useServiceRequests } from '@/hooks/useService'

import ServicePageShell from './ServicePageShell'
import styles from './InstallationPage.module.css'

export default function InstallationPage() {
  const navigate = useNavigate()
  const { requests, loading } = useServiceRequests()

  const installs = useMemo(
    () => requests.filter((r) => r.purpose === ServicePurpose.Kurulum),
    [requests],
  )

  return (
    <ServicePageShell title="KURULUM HİZMETLERİ" onBack={() => navigate('/service')}>
      <div className={styles.intro}>
        Makinanın ilk kurulumu, operatör eğitimi ve devreye alma süreçleri burada listelenir.
        Yeni bir kurulum talep etmek için "Yeni Talep Oluştur" butonunu kullanın.
      </div>

      <div className={styles.list}>
        {loading && <div className={styles.empty}>Yükleniyor...</div>}
        {!loading && installs.length === 0 && (
          <div className={styles.empty}>Henüz kurulum kaydı yok</div>
        )}
        {installs.map((r) => (
          <button
            key={r.id}
            className={styles.row}
            onClick={() => navigate(`/service/requests/${r.id}`)}
          >
            <span className={styles.code}>{r.code}</span>
            <span className={styles.sep}>-</span>
            <span className={styles.label}>{r.problemDescription?.split('\n')[0] ?? 'KURULUM'}</span>
            <span className={styles.status}>{statusLabel(r.status)}</span>
          </button>
        ))}
      </div>

      <button
        className={styles.newBtn}
        onClick={() => navigate('/service/requests/new')}
      >
        YENİ KURULUM TALEBİ OLUŞTUR
      </button>
    </ServicePageShell>
  )
}

function statusLabel(s: number): string {
  return ['PLANLANDI', 'GÖNDERİLDİ', 'DEVAM EDİYOR', 'TAMAMLANDI', 'İPTAL'][s] ?? '?'
}
