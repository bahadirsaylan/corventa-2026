// Check list GEÇMİŞİ (2026-11-16) — GET /api/checklist/results, salt okunur.
// Liste: onay tarihi/saati (sunucu kayıt zamanı), kontrolcü, işaretli/toplam, SERİ DIŞI madde sayısı.
// Dokununca detay: her maddede kim / ne zaman onayladı, not, seri dışı özel üretim notu + kod numaraları.

import { useEffect, useState } from 'react'
import type { ChecklistResultRecord, CloudChecklistTemplate } from '@shared/types'
import { Icon, IconLabel } from '@/components/Icon'
import { useLang, useT, tp } from '@/i18n'
import { formatStamp, LOCAL_TEMPLATE_ID } from './checklistShared'
import cs from './ChecklistForm.module.css'

export default function ChecklistHistory({ templates }: { templates: CloudChecklistTemplate[] }) {
  const t = useT()
  const locale = useLang() === 'en' ? 'en-GB' : 'tr-TR'
  const [rows, setRows] = useState<ChecklistResultRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ChecklistResultRecord | null>(null)

  useEffect(() => {
    let alive = true
    window.corventa.cloud
      .listChecklistResults(100)
      .then((r) => {
        if (!alive) return
        if (r.ok) setRows(Array.isArray(r.data) ? r.data : [])
        else setError(r.status === 0 ? t('DataApi yanıt vermiyor — bağlantıyı kontrol edin') : tp(r.error))
      })
      .catch((e: unknown) => alive && setError(tp(e instanceof Error ? e.message : String(e))))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece açılışta bir kez
  }, [])

  const templateOf = (r: ChecklistResultRecord) => templates.find((tpl) => tpl.id === r.templateId) ?? null
  const templateName = (r: ChecklistResultRecord) => {
    const tpl = templateOf(r)
    if (tpl) return t(tpl.name)
    return r.templateId === LOCAL_TEMPLATE_ID ? t('GÜNLÜK CHECK LIST') : t('KALİTE KONTROL')
  }
  const nonSerialOf = (r: ChecklistResultRecord) => (r.items ?? []).filter((i) => i?.nonSerial).length

  if (error) return <div className={cs.historyEmpty}>{error}</div>
  if (!rows) return <div className={cs.historyEmpty}>{t('Yükleniyor…')}</div>

  if (selected) {
    const tpl = templateOf(selected)
    const textOf = (id: string) => {
      const it = tpl?.items.find((i) => i.id === id)
      return it ? t(it.text) : id
    }
    return (
      <div className={cs.list}>
        <div className={cs.detailHead}>
          <button type="button" className={cs.historyBtn} onClick={() => setSelected(null)}>
            <IconLabel icon="back">{t('LİSTEYE DÖN')}</IconLabel>
          </button>
          <div className={cs.detailInfo}>
            <span className={cs.itemText}>{templateName(selected)}{selected.templateVersion ? ` · v${selected.templateVersion}` : ''}</span>
            <span className={cs.category}>
              {t('ONAY TARİHİ')}: {formatStamp(selected.createdAt, locale)} · {t('KONTROLCÜ')}: {selected.inspectorName} ·{' '}
              {selected.checkedCount} / {selected.totalCount}
            </span>
          </div>
          {nonSerialOf(selected) > 0 && (
            <span className={cs.nonSerialBadge}>{t('SERİ DIŞI: {n}', { n: nonSerialOf(selected) })}</span>
          )}
        </div>
        {(selected.items ?? []).map((it, idx) => (
          <div key={it.id} className={`${cs.histItem} ${it.checked ? cs.histItemOn : ''} ${it.nonSerial ? cs.rowNonSerial : ''}`}>
            <span className={cs.histMark}>
              {it.checked ? <Icon name="check" size="md" strokeWidth={3} /> : <Icon name="close" size="md" />}
            </span>
            <span className={cs.no}>{idx + 1}</span>
            <span className={cs.text}>
              <span className={cs.itemText}>
                {it.nonSerial && <span className={cs.nonSerialTag}>{t('SERİ DIŞI')}</span>}
                {textOf(it.id)}
              </span>
              {it.checked ? (
                <span className={cs.approval}>
                  {t('ONAYLAYAN')}: {it.checkedBy || selected.inspectorName}
                  {it.checkedAt ? ` · ${formatStamp(it.checkedAt, locale)}` : ''}
                </span>
              ) : (
                <span className={cs.notChecked}>{t('İŞARETLENMEDİ')}</span>
              )}
              {it.note && <span className={cs.noteWrap}>{t('NOT')}: {it.note}</span>}
              {it.nonSerial && (
                <span className={cs.nonSerialBlock}>
                  {it.specialNote && <span>{t('ÖZEL ÜRETİM NOTU')}: {it.specialNote}</span>}
                  {it.partCode && <span>{t('KOD NO')}: <b>{it.partCode}</b></span>}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) return <div className={cs.historyEmpty}>{t('Henüz kayıtlı check list sonucu yok')}</div>

  return (
    <div className={cs.list}>
      {rows.map((r) => {
        const ns = nonSerialOf(r)
        const done = r.checkedCount === r.totalCount
        return (
          <button key={r.id} type="button" className={cs.histRow} onClick={() => setSelected(r)}>
            <span className={cs.histDate}>{formatStamp(r.createdAt, locale)}</span>
            <span className={cs.text}>
              <span className={cs.itemText}>{r.inspectorName}</span>
              <span className={cs.category}>{templateName(r)}</span>
            </span>
            {ns > 0 && <span className={cs.nonSerialBadge}>{t('SERİ DIŞI: {n}', { n: ns })}</span>}
            <span className={`${cs.histCount} ${done ? cs.histCountDone : ''}`}>
              {r.checkedCount} / {r.totalCount}
            </span>
            <Icon name="chevronRight" size="md" />
          </button>
        )
      })}
    </div>
  )
}
