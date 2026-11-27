// STAGE SEÇİMİ (2026-11-26, kullanıcı) — ölçü ekranlarında (çember / çok açılı / serpantin / sıvama) giriş ızgarasının
// bir satırı. Profil A girilince uygun stage'ler okunur; varsayılan EN UYGUN (önerilen) stage. Birden çok uygun stage
// varsa dokununca liste açılır, operatör başka birini seçebilir. Seçim store'a (params.stageChoice) yazılır; stage
// geçişi (vals dizilimi ekranı) ve büküm akışı bu seçimi kullanır. Elle hedef (kayıtlı büküm) stage'i varsa o
// gösterilir ve değiştirilemez (hedef o stage'de ölçülmüştü).

import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import { useBendingJobStore } from '@/store/bendingJobStore'
import { loadStageOptions, setStageChoice, type StageOption } from '@/services/stageChoice'
import modalStyles from './StageChoiceField.module.css'

/** Ölçü formunun satır stilleri — alan, formdaki diğer alanlarla aynı görünür */
export interface StageFieldStyles {
  inputRow?: string
  fieldLabel?: string
  fieldInput?: string
  fieldInputFilled?: string
  placeholder?: string
  infoBtn?: string
}

interface Props {
  /** Formdaki profil A (mm) — boş / geçersizse alan "—" */
  profileA: number
  styles: StageFieldStyles
  /** Kilitli stage (elle hedef / kayıtlı büküm) — verilirse gösterilir, seçim kapalı */
  lockedStage?: number | null
}

/** Profil A için seçenekler + seçili stage (operatör seçimi veya önerilen) */
export function useStageOptions(profileA: number) {
  const [options, setOptions] = useState<StageOption[] | null>(null)
  const choice = useBendingJobStore((s) => s.params.stageChoice)

  useEffect(() => {
    let alive = true
    if (!(profileA > 0)) {
      setOptions(null)
      return
    }
    const timer = setTimeout(() => {
      loadStageOptions(profileA)
        .then((o) => { if (alive) setOptions(o) })
        .catch(() => { if (alive) setOptions([]) })
    }, 150)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [profileA])

  const recommended = options?.find((o) => o.recommended) ?? null
  const chosen =
    choice && Math.abs(choice.profileA - profileA) < 1e-6
      ? options?.find((o) => o.stageNumber === choice.stageNumber) ?? null
      : null
  return { options, selected: chosen ?? recommended, recommended }
}

export default function StageChoiceField({ profileA, styles, lockedStage }: Props) {
  const t = useT()
  const { options, selected } = useStageOptions(profileA)
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState(false)

  const locked = lockedStage != null && lockedStage > 0
  const shownStage = locked ? lockedStage : selected?.stageNumber ?? null
  const canChoose = !locked && (options?.length ?? 0) > 1

  return (
    <div className={styles.inputRow}>
      <span className={styles.fieldLabel}>ST:</span>
      <div
        className={`${styles.fieldInput ?? ''} ${shownStage != null ? styles.fieldInputFilled ?? '' : ''}`}
        role="button"
        tabIndex={0}
        aria-disabled={!canChoose || undefined}
        aria-label={t('STAGE SEÇ')}
        onClick={() => { if (canChoose) setOpen(true) }}
        onKeyDown={(e) => { if (canChoose && e.key === 'Enter') setOpen(true) }}
      >
        {shownStage != null ? (
          <span className={modalStyles.value}>
            {t('STAGE {n}', { n: shownStage })}
            {!locked && selected?.recommended && (options?.length ?? 0) > 1 && (
              <small className={modalStyles.tag}>{t('ÖNERİLEN')}</small>
            )}
            {locked && <Icon name="lock" size={16} />}
            {canChoose && <Icon name="chevronDown" size={18} />}
          </span>
        ) : (
          <span className={styles.placeholder}>{options && options.length === 0 && profileA > 0 ? t('UYGUN YOK') : '—'}</span>
        )}
      </div>
      <button className={styles.infoBtn} onClick={() => setInfo(true)} aria-label={t('STAGE bilgisi')}>
        <Icon name="help" size={28} />
      </button>

      {open && options && (
        <div className={modalStyles.overlay} onClick={() => setOpen(false)}>
          <div className={modalStyles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className={modalStyles.title}>{t('STAGE SEÇİN')}</h2>
            <p className={modalStyles.sub}>{t('PROFİL A = {a} MM İÇİN UYGUN STAGE\'LER', { a: profileA })}</p>
            <div className={modalStyles.list}>
              {options.map((o) => (
                <button
                  key={o.stageNumber}
                  className={modalStyles.option}
                  data-selected={o.stageNumber === selected?.stageNumber || undefined}
                  onClick={() => {
                    setStageChoice(profileA, o.stageNumber, o.recommended)
                    setOpen(false)
                  }}
                >
                  <span className={modalStyles.optName}>{t('STAGE {n}', { n: o.stageNumber })}</span>
                  <span className={modalStyles.optMeta}>{t('A ≤ {m} MM', { m: o.maxProfileAMm })}</span>
                  {o.recommended && <span className={modalStyles.optTag}>{t('ÖNERİLEN')}</span>}
                </button>
              ))}
            </div>
            <button className={modalStyles.close} onClick={() => setOpen(false)}>{t('KAPAT')}</button>
          </div>
        </div>
      )}

      {info && (
        <div className={modalStyles.overlay} onClick={() => setInfo(false)}>
          <div className={modalStyles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2 className={modalStyles.title}>{t('STAGE')}</h2>
            <p className={modalStyles.infoText}>
              {t('PROFİL A ÖLÇÜSÜNE GÖRE BÜKÜMÜN YAPILABİLECEĞİ STAGE. VARSAYILAN EN UYGUN (ÖNERİLEN) STAGE\'DİR; BİRDEN ÇOK STAGE UYGUNSA DOKUNARAK BAŞKA BİRİNİ SEÇEBİLİRSİNİZ. MAKİNE ONAYDAN SONRA SEÇİLEN STAGE\'E GEÇER.')}
            </p>
            <button className={modalStyles.close} onClick={() => setInfo(false)}>{t('KAPAT')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
