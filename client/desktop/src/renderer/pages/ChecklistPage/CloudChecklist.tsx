// Bulut v2 (BULUT_API_V2.md §1 madde 47) — buluttan gelen checklist şablonu: sevkiyat öncesi kalite kontrol.
// Kalite kontrolcü adını yazar, her maddeyi işaretler (isteğe bağlı madde notu), GÖNDER →
// POST /api/checklist/results (DataApi yerel kayıt + bulut push `checklist_result`).
// Taslak bu cihazda saklanır (şablon id + sürüm anahtarıyla), başarılı gönderimde silinir.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CloudChecklistTemplate } from '@shared/types'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { Icon, IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import { useLang, useT } from '@/i18n'
import styles from './ChecklistPage.module.css'
import cs from './CloudChecklist.module.css'

interface Draft {
  checked: Record<string, boolean>
  notes: Record<string, string>
  inspector: string
}

const EMPTY: Draft = { checked: {}, notes: {}, inspector: '' }

function draftKey(tpl: CloudChecklistTemplate): string {
  return `corventa.qcChecklist.${tpl.id}.v${tpl.version}`
}

function readDraft(tpl: CloudChecklistTemplate): Draft {
  try {
    const v = JSON.parse(localStorage.getItem(draftKey(tpl)) ?? 'null') as Partial<Draft> | null
    if (v && typeof v === 'object') {
      return { checked: v.checked ?? {}, notes: v.notes ?? {}, inspector: typeof v.inspector === 'string' ? v.inspector : '' }
    }
  } catch {
    /* bozuk / depolama kapalı */
  }
  return { ...EMPTY }
}

export default function CloudChecklist({ template }: { template: CloudChecklistTemplate }) {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [draft, setDraft] = useState<Draft>(() => readDraft(template))
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(template), JSON.stringify(draft))
    } catch {
      /* depolama kapalı — bu oturumda geçerli */
    }
  }, [draft, template])

  const total = template.items.length
  const checkedCount = template.items.filter((i) => draft.checked[i.id]).length
  const allDone = checkedCount === total
  const canSubmit = !!draft.inspector.trim() && !busy

  const toggle = (id: string) => {
    setMessage(null)
    setDraft((d) => ({ ...d, checked: { ...d.checked, [id]: !d.checked[id] } }))
  }

  async function submit() {
    setConfirm(false)
    setBusy(true)
    setMessage(null)
    try {
      const r = await window.corventa.cloud.submitChecklistResult({
        templateId: template.id,
        templateVersion: template.version,
        inspectorName: draft.inspector.trim(),
        items: template.items.map((i) => ({ id: i.id, checked: !!draft.checked[i.id], note: draft.notes[i.id]?.trim() || null })),
      })
      if (r.ok) {
        setMessage({ kind: 'ok', text: t('Kontrol sonucu kaydedildi ({at})', { at: new Date().toLocaleString(locale) }) })
        setDraft({ ...EMPTY, inspector: draft.inspector })
        try { localStorage.removeItem(draftKey(template)) } catch { /* yok */ }
      } else {
        setMessage({ kind: 'error', text: r.status === 0 ? t('DataApi yanıt vermiyor — bağlantıyı kontrol edin') : r.error })
      }
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t(template.name)}</h1>
        <span className={cs.cloudBadge}>{t('BULUT')} · v{template.version}</span>
        <span className={styles.dateBadge}>{new Date().toLocaleDateString(locale)}</span>
      </div>

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{t('İLERLEME')}</span>
          <span className={`${styles.summaryValue} ${allDone ? styles.allDone : ''}`}>
            {checkedCount} / {total}
          </span>
        </div>
        <div className={styles.summaryProgress}>
          <div className={`${styles.summaryFill} ${allDone ? styles.allDone : ''}`} style={{ width: `${total ? (checkedCount / total) * 100 : 0}%` }} />
        </div>
        {message && (
          <div className={`${cs.message} ${message.kind === 'ok' ? cs.messageOk : cs.messageErr}`}>{message.text}</div>
        )}
      </div>

      <div className={cs.list}>
        {template.items.map((item, idx) => {
          const on = !!draft.checked[item.id]
          const note = draft.notes[item.id]
          return (
            <div key={item.id} className={`${cs.row} ${on ? cs.rowOn : ''}`}>
              <button type="button" className={cs.checkArea} onClick={() => toggle(item.id)}>
                <span className={styles.checkBox} style={on ? { background: 'var(--color-success)', borderColor: 'var(--color-success)' } : undefined}>
                  {on && <Icon name="check" size="md" strokeWidth={3} className={styles.checkMark} />}
                </span>
                <span className={cs.no}>{idx + 1}</span>
                <span className={cs.text}>
                  <span className={cs.itemText}>{t(item.text)}</span>
                  {note
                    ? <span className={cs.note}>{t('NOT')}: {note}</span>
                    : item.category && <span className={cs.category}>{t(item.category)}</span>}
                </span>
              </button>
              <button type="button" className={`${cs.noteBtn} ${note ? cs.noteBtnOn : ''}`} onClick={() => setNoteFor(item.id)}>
                <IconLabel icon="edit">{t('NOT')}</IconLabel>
              </button>
            </div>
          )
        })}
      </div>

      <div className={styles.footer}>
        <input
          className={styles.operatorInput}
          type="text"
          placeholder={t('Kalite kontrolcü adı')}
          aria-label={t('Kalite kontrolcü adı')}
          maxLength={120}
          value={draft.inspector}
          onChange={(e) => setDraft((d) => ({ ...d, inspector: e.target.value }))}
        />
        <button
          className={`${styles.actionBtn} ${styles.resetBtn}`}
          onClick={() => { setMessage(null); setDraft({ ...EMPTY, inspector: draft.inspector }) }}
        >
          {t('SIFIRLA')}
        </button>
        <button
          className={`${styles.actionBtn} ${styles.saveBtn}`}
          disabled={!canSubmit}
          style={{ minWidth: 220, ...(!canSubmit ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}
          onClick={() => (allDone ? void submit() : setConfirm(true))}
        >
          {busy ? t('GÖNDERİLİYOR…') : t('KAYDET VE GÖNDER')}
        </button>
      </div>

      {noteFor && (
        <KeyboardModal
          initialValue={draft.notes[noteFor] ?? ''}
          label={t('MADDE NOTU')}
          maxLength={500}
          onConfirm={(v) => {
            const id = noteFor
            setDraft((d) => ({ ...d, notes: { ...d.notes, [id]: v } }))
            setNoteFor(null)
          }}
          onClose={() => setNoteFor(null)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={t('{n} MADDE İŞARETLENMEDİ. KONTROL SONUCU YİNE DE GÖNDERİLSİN Mİ', { n: total - checkedCount })}
          variant="primary"
          confirmLabel="GÖNDER"
          onCancel={() => setConfirm(false)}
          onConfirm={() => void submit()}
        />
      )}
    </div>
  )
}
