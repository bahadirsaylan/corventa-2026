// Kalite kontrol check list formu — bulut şablonu (BULUT_API_V2.md §1 madde 47) VE yerleşik yerel şablon aynı ekran.
// 2026-11-16 (test raporu "CHECK LIST DETAYLI OLMALI"):
//   • Madde işaretlenince KİM onayladı (oturumdaki kullanıcı; yoksa kontrolcü adı) ve NE ZAMAN kaydedilir,
//     maddenin altında "ONAYLAYAN: X · 16.11.2026 14:32" görünür; işaret kaldırılınca silinir.
//   • Madde başına SERİ DIŞI bayrağı: ÖZEL ÜRETİM NOTU (ör. seride kullanılan sarı bronz daha kalın kullanıldı)
//     + KOD NO (parça / malzeme kod numaraları). Sarı "SERİ DIŞI" rozeti.
//   • Yerel şablon da DataApi'ye kaydedilir (POST /api/checklist/results, templateId 'local-daily') → GEÇMİŞ;
//     DataApi bu sonuçları buluta GÖNDERMEZ. Bulut şablonu eskisi gibi kayıt + bulut push.
//   • GEÇMİŞ: kayıtlı sonuçlar (ChecklistHistory, salt okunur).
// Taslak bu cihazda saklanır (şablon id + sürüm anahtarıyla), başarılı kayıtta silinir.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChecklistResultItem, CloudChecklistTemplate } from '@shared/types'
import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { Icon, IconLabel } from '@/components/Icon'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import { useLang, useT, tp } from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'
import ChecklistHistory from './ChecklistHistory'
import { formatStamp, LOCAL_TEMPLATE } from './checklistShared'
import styles from './ChecklistPage.module.css'
import cs from './ChecklistForm.module.css'

interface ItemMeta {
  /** Onaylayan (görünen ad) */
  by: string
  /** ISO */
  at: string
}

interface NonSerialInfo {
  note: string
  code: string
}

interface Draft {
  checked: Record<string, boolean>
  notes: Record<string, string>
  inspector: string
  meta: Record<string, ItemMeta>
  nonSerial: Record<string, NonSerialInfo>
}

const EMPTY: Draft = { checked: {}, notes: {}, inspector: '', meta: {}, nonSerial: {} }

/** Eski yerel check list'in gün anahtarı (corventa.checklist.YYYY-MM-DD) — ilk açılışta taslağa aktarılır */
const LEGACY_LOCAL_KEY = 'corventa.checklist'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function draftKey(tpl: CloudChecklistTemplate): string {
  return `corventa.qcChecklist.${tpl.id}.v${tpl.version}`
}

function readDraft(tpl: CloudChecklistTemplate): Draft {
  try {
    const v = JSON.parse(localStorage.getItem(draftKey(tpl)) ?? 'null') as Partial<Draft> | null
    if (v && typeof v === 'object') {
      return {
        checked: v.checked ?? {},
        notes: v.notes ?? {},
        inspector: typeof v.inspector === 'string' ? v.inspector : '',
        meta: v.meta ?? {},
        nonSerial: v.nonSerial ?? {},
      }
    }
    if (tpl.id === LOCAL_TEMPLATE.id) {
      // Eski yerel listenin bugünkü kaydı (sadece işaretler + operatör adı) — kim/ne zaman bilinmiyor
      const old = JSON.parse(localStorage.getItem(`${LEGACY_LOCAL_KEY}.${todayKey()}`) ?? 'null') as
        | { checked?: Record<string, boolean>; operator?: string }
        | null
      if (old && typeof old === 'object') {
        return { ...EMPTY, checked: old.checked ?? {}, inspector: typeof old.operator === 'string' ? old.operator : '' }
      }
    }
  } catch {
    /* bozuk / depolama kapalı */
  }
  return { ...EMPTY }
}

export default function ChecklistForm({ template }: { template: CloudChecklistTemplate }) {
  const navigate = useNavigate()
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const sessionName = useSessionStore((s) => s.displayName?.trim() || s.username?.trim() || '')
  const isLocal = template.id === LOCAL_TEMPLATE.id
  const [draft, setDraft] = useState<Draft>(() => {
    const d = readDraft(template)
    return d.inspector ? d : { ...d, inspector: sessionName }
  })
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [nonSerialFor, setNonSerialFor] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [view, setView] = useState<'form' | 'history'>('form')

  useEffect(() => {
    try {
      localStorage.setItem(draftKey(template), JSON.stringify(draft))
    } catch {
      /* depolama kapalı — bu oturumda geçerli */
    }
  }, [draft, template])

  const total = template.items.length
  const checkedCount = template.items.filter((i) => draft.checked[i.id]).length
  const nonSerialCount = template.items.filter((i) => draft.nonSerial[i.id]).length
  const allDone = checkedCount === total
  const canSubmit = !!draft.inspector.trim() && !busy

  const toggle = (id: string) => {
    setMessage(null)
    setDraft((d) => {
      const on = !d.checked[id]
      const meta = { ...d.meta }
      if (on) meta[id] = { by: sessionName || d.inspector.trim(), at: new Date().toISOString() }
      else delete meta[id]
      return { ...d, checked: { ...d.checked, [id]: on }, meta }
    })
  }

  async function submit() {
    setConfirm(false)
    setBusy(true)
    setMessage(null)
    const inspector = draft.inspector.trim()
    const now = new Date().toISOString()
    try {
      const items: ChecklistResultItem[] = template.items.map((i) => {
        const checked = !!draft.checked[i.id]
        const meta = draft.meta[i.id]
        const ns = draft.nonSerial[i.id]
        return {
          id: i.id,
          checked,
          note: draft.notes[i.id]?.trim() || null,
          checkedBy: checked ? meta?.by || inspector : null,
          checkedAt: checked ? meta?.at || now : null,
          nonSerial: !!ns,
          specialNote: ns?.note.trim() || null,
          partCode: ns?.code.trim() || null,
        }
      })
      const r = await window.corventa.cloud.submitChecklistResult({
        templateId: template.id,
        templateVersion: template.version,
        inspectorName: inspector,
        items,
      })
      if (r.ok) {
        setMessage({ kind: 'ok', text: t('Kontrol sonucu kaydedildi ({at})', { at: new Date().toLocaleString(locale) }) })
        setDraft({ ...EMPTY, inspector: draft.inspector })
        try {
          localStorage.removeItem(draftKey(template))
          if (isLocal) localStorage.removeItem(`${LEGACY_LOCAL_KEY}.${todayKey()}`)
        } catch {
          /* yok */
        }
      } else {
        setMessage({ kind: 'error', text: r.status === 0 ? t('DataApi yanıt vermiyor — bağlantıyı kontrol edin') : tp(r.error) })
      }
    } catch (e) {
      setMessage({ kind: 'error', text: tp(e instanceof Error ? e.message : String(e)) })
    } finally {
      setBusy(false)
    }
  }

  const header = (
    <div className={styles.header}>
      <button
        className={styles.backBtn}
        onClick={() => (view === 'history' ? setView('form') : navigate('/settings'))}
        aria-label={t('Geri')}
      >
        <Icon name="back" size="lg" />
      </button>
      <h1 className={styles.title}>{view === 'history' ? t('CHECK LIST GEÇMİŞİ') : t(template.name)}</h1>
      {view === 'form' && (
        <span className={isLocal ? cs.localBadge : cs.cloudBadge}>
          {isLocal ? t('YEREL') : `${t('BULUT')} · v${template.version}`}
        </span>
      )}
      <button
        type="button"
        className={`${cs.historyBtn} ${view === 'history' ? cs.historyBtnOn : ''}`}
        onClick={() => setView((v) => (v === 'history' ? 'form' : 'history'))}
      >
        <IconLabel icon={view === 'history' ? 'edit' : 'clipboard'}>{view === 'history' ? t('FORM') : t('GEÇMİŞ')}</IconLabel>
      </button>
      <span className={styles.dateBadge}>{new Date().toLocaleDateString(locale)}</span>
    </div>
  )

  if (view === 'history') {
    return (
      <div className={styles.page}>
        {header}
        <ChecklistHistory templates={[template, LOCAL_TEMPLATE]} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {header}

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
        {message ? (
          <div className={`${cs.message} ${message.kind === 'ok' ? cs.messageOk : cs.messageErr}`}>{message.text}</div>
        ) : nonSerialCount > 0 ? (
          <span className={cs.nonSerialBadge}>{t('SERİ DIŞI: {n}', { n: nonSerialCount })}</span>
        ) : null}
      </div>

      <div className={cs.list}>
        {template.items.map((item, idx) => {
          const on = !!draft.checked[item.id]
          const note = draft.notes[item.id]
          const meta = on ? draft.meta[item.id] : undefined
          const ns = draft.nonSerial[item.id]
          return (
            <div key={item.id} className={`${cs.row} ${on ? cs.rowOn : ''} ${ns ? cs.rowNonSerial : ''}`}>
              <button type="button" className={cs.checkArea} onClick={() => toggle(item.id)}>
                <span className={styles.checkBox} style={on ? { background: 'var(--color-success)', borderColor: 'var(--color-success)' } : undefined}>
                  {on && <Icon name="check" size="md" strokeWidth={3} className={styles.checkMark} />}
                </span>
                <span className={cs.no}>{idx + 1}</span>
                <span className={cs.text}>
                  <span className={cs.itemText}>
                    {ns && <span className={cs.nonSerialTag}>{t('SERİ DIŞI')}</span>}
                    {t(item.text)}
                  </span>
                  {item.category && !note && <span className={cs.category}>{t(item.category)}</span>}
                  {note && <span className={cs.note}>{t('NOT')}: {note}</span>}
                  {meta && (
                    <span className={cs.approval}>
                      {t('ONAYLAYAN')}: {meta.by || '—'} · {formatStamp(meta.at, locale)}
                    </span>
                  )}
                  {ns && (
                    <span className={cs.nonSerialLine}>
                      {ns.code && <>{t('KOD NO')}: <b>{ns.code}</b>{ns.note ? ' · ' : ''}</>}
                      {ns.note}
                    </span>
                  )}
                </span>
              </button>
              <button type="button" className={`${cs.sideBtn} ${note ? cs.sideBtnOn : ''}`} onClick={() => setNoteFor(item.id)}>
                <IconLabel icon="edit">{t('NOT')}</IconLabel>
              </button>
              <button
                type="button"
                className={`${cs.sideBtn} ${ns ? cs.sideBtnWarn : ''}`}
                onClick={() => setNonSerialFor(item.id)}
              >
                {t('SERİ DIŞI')}
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
          {busy ? t('GÖNDERİLİYOR…') : isLocal ? t('KAYDET') : t('KAYDET VE GÖNDER')}
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

      {nonSerialFor && (
        <NonSerialModal
          itemText={t(template.items.find((i) => i.id === nonSerialFor)?.text ?? '')}
          initial={draft.nonSerial[nonSerialFor] ?? null}
          onSave={(info) => {
            const id = nonSerialFor
            setDraft((d) => {
              const nonSerial = { ...d.nonSerial }
              if (info) nonSerial[id] = info
              else delete nonSerial[id]
              return { ...d, nonSerial }
            })
            setNonSerialFor(null)
          }}
          onClose={() => setNonSerialFor(null)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={
            isLocal
              ? t('{n} MADDE İŞARETLENMEDİ. KONTROL SONUCU YİNE DE KAYDEDİLSİN Mİ', { n: total - checkedCount })
              : t('{n} MADDE İŞARETLENMEDİ. KONTROL SONUCU YİNE DE GÖNDERİLSİN Mİ', { n: total - checkedCount })
          }
          variant="primary"
          confirmLabel={isLocal ? 'KAYDET' : 'GÖNDER'}
          onCancel={() => setConfirm(false)}
          onConfirm={() => void submit()}
        />
      )}
    </div>
  )
}

/**
 * SERİ DIŞI penceresi — özel üretim notu + kod no (dokunmatik klavye ile). En az biri dolu olmalı.
 * onSave(null) = seri dışı işaretini kaldır.
 */
function NonSerialModal({
  itemText,
  initial,
  onSave,
  onClose,
}: {
  itemText: string
  initial: NonSerialInfo | null
  onSave: (info: NonSerialInfo | null) => void
  onClose: () => void
}) {
  const t = useT()
  const [note, setNote] = useState(initial?.note ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [edit, setEdit] = useState<'note' | 'code' | null>(null)
  const canSave = !!(note.trim() || code.trim())

  return (
    <div className={cs.overlay} onClick={onClose}>
      <div className={cs.modal} onClick={(e) => e.stopPropagation()}>
        <div className={cs.modalTitle}>
          <span className={cs.nonSerialTag}>{t('SERİ DIŞI')}</span>
          {t('ÖZEL ÜRETİM')}
        </div>
        <div className={cs.modalItem}>{itemText}</div>
        <div className={cs.modalHint}>
          {t('Seri üretimden farklı bir durum varsa (ör. seride kullanılan sarı bronz daha kalın kullanıldıysa) açıklayın ve kod numaralarını yazın.')}
        </div>

        <span className={cs.fieldLabel}>{t('ÖZEL ÜRETİM NOTU')}</span>
        <button type="button" className={cs.field} onClick={() => setEdit('note')}>
          {note || <span className={cs.placeholder}>{t('Dokunarak yazın')}</span>}
        </button>

        <span className={cs.fieldLabel}>{t('KOD NO')}</span>
        <button type="button" className={cs.field} onClick={() => setEdit('code')}>
          {code || <span className={cs.placeholder}>{t('Parça / malzeme kod numaraları')}</span>}
        </button>

        <div className={cs.modalActions}>
          {initial && (
            <button type="button" className={`${cs.modalBtn} ${cs.modalBtnDanger}`} onClick={() => onSave(null)}>
              {t('SERİ DIŞI KALDIR')}
            </button>
          )}
          <button type="button" className={`${cs.modalBtn} ${cs.modalBtnCancel}`} onClick={onClose}>
            {t('VAZGEÇ')}
          </button>
          <button
            type="button"
            className={`${cs.modalBtn} ${cs.modalBtnSave}`}
            disabled={!canSave}
            onClick={() => onSave({ note: note.trim(), code: code.trim() })}
          >
            {t('KAYDET')}
          </button>
        </div>
      </div>

      {edit && (
        <div onClick={(e) => e.stopPropagation()}>
          <KeyboardModal
            initialValue={edit === 'note' ? note : code}
            label={edit === 'note' ? t('ÖZEL ÜRETİM NOTU') : t('KOD NO')}
            maxLength={edit === 'note' ? 1000 : 200}
            onConfirm={(v) => {
              if (edit === 'note') setNote(v)
              else setCode(v)
              setEdit(null)
            }}
            onClose={() => setEdit(null)}
          />
        </div>
      )}
    </div>
  )
}
