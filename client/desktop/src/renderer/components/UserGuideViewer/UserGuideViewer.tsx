// PDF kullanım kılavuzu — uygulama İÇİNDE tam ekran görüntüleyici (kiosk'tan çıkmadan).
// Main dosyayı okur, burada blob URL'e çevrilip Chromium'un yerleşik PDF görüntüleyicisinde açılır
// (sayfa geçişi, yakınlaştırma, arama görüntüleyicinin kendi araç çubuğunda).

import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import styles from './UserGuideViewer.module.css'

export default function UserGuideViewer({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    window.corventa.system
      .readUserGuide()
      .then((r) => {
        if (!r.ok || !r.data) throw new Error(r.error ?? t('PDF açılamadı'))
        objectUrl = URL.createObjectURL(new Blob([r.data as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }))
        setUrl(objectUrl)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <span className={styles.title}>{t('PDF KULLANIM KİTABI')}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          {t('KAPAT')} ✕
        </button>
      </div>
      <div className={styles.body}>
        {error ? (
          <p className={styles.message}>
            {t('PDF açılamadı')}: {error}
          </p>
        ) : url ? (
          <iframe className={styles.frame} src={`${url}#toolbar=1&view=FitH`} title={t('PDF KULLANIM KİTABI')} />
        ) : (
          <p className={styles.message}>{t('Yükleniyor…')}</p>
        )}
      </div>
    </div>
  )
}
