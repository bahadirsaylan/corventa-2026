// SEKIL-51-SD — servis sonrası 1-10 puanlama + açıklama + kaydet.
// İki ok ile değer artırılır/azaltılır (büyük buton — eldivenli operatör).

import { useState } from 'react'

import type { ServiceRequest } from '@shared/types'

import styles from './ServiceRequestRating.module.css'

interface Props {
  request: ServiceRequest
  onSaved: () => Promise<void>
}

export default function ServiceRequestRating({ request, onSaved }: Props) {
  const [rating, setRating] = useState<number>(request.rating ?? 8)
  const [note, setNote] = useState<string>(request.ratingNote ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function clamp(v: number) {
    if (v < 1) return 1
    if (v > 10) return 10
    return v
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await window.corventa.service.rateRequest(request.id, rating, note || undefined)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        ALDIĞINIZ SERVİSİ 1 İLE 10 ARALIĞINDA DEĞERLENDİREREK SERVİS KALİTESİNİ
        ARTTIRMAMIZA YARDIMCI OLABİLİRSİNİZ.
      </div>

      <div className={styles.ratingBox}>
        <div className={styles.spinner}>
          <button
            className={styles.spinnerBtn}
            onClick={() => setRating(clamp(rating + 1))}
            aria-label="Arttır"
          >
            ▲
          </button>
          <div className={styles.spinnerNumbers}>
            <span className={styles.spinnerSide}>{rating - 1 < 1 ? '' : rating - 1}</span>
            <span className={styles.spinnerMain}>{rating}</span>
            <span className={styles.spinnerSide}>{rating + 1 > 10 ? '' : rating + 1}</span>
            <span className={styles.spinnerOutOf}>/10</span>
          </div>
          <button
            className={styles.spinnerBtn}
            onClick={() => setRating(clamp(rating - 1))}
            aria-label="Azalt"
          >
            ▼
          </button>
        </div>
      </div>

      <div className={styles.noteBox}>
        <label className={styles.noteLabel}>
          AÇIKLAMA :
          <span className={styles.noteHint}>
            ( ALDIĞINIZ HİZMETLE İLGİLİ GÖRÜŞLERİNİZİ PAYLAŞABİLİRSİNİZ. )
          </span>
        </label>
        <textarea
          className={styles.noteInput}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          placeholder="..."
        />
      </div>

      {error && <div className={styles.errorBox}>Hata: {error}</div>}

      <button
        className={styles.saveBtn}
        onClick={handleSave}
        disabled={saving}
      >
        DEĞERLENDİRMEYİ KAYDET
      </button>
    </div>
  )
}
