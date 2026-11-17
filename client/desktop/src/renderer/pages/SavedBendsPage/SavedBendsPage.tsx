// STANDART SÜRÜM (2026-11-17) — KAYITLI BÜKÜMLER (STANDART_SURUM.md §2.4 / §3.3).
// Profil seçim ekranından (KAYITLI BÜKÜMLER) açılır. Sayfalı liste (kaydırma çubuğu yok):
//   ÇALIŞTIR → paramsJson mağazaya + elle hedef (kayıttaki itme derinliği / stage) → vals dizilimi → parça yükleme
//              (iş manualTargetLocked=true ile başlar, bitince BÜKÜM SONUCU — kayıt GÜNCELLE seçeneğiyle)
//   DETAY    → kayıt bilgileri + düzeltme geçmişi
//   SİL      → SUPERVISOR+ (DataApi DELETE [RequireRole])

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { IconLabel } from '@/components/Icon'
import PageHeader from '@/components/PageHeader/PageHeader'
import { LockIcon } from '@/components/RoleNotice/LockIcon'
import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import StatusBar from '@/components/StatusBar/StatusBar'
import { PERMISSIONS } from '@/constants/permissions'
import { useT } from '@/i18n'
import { useBendingModeLabel } from '@/hooks/useBendingModeLabel'
import {
  cleanIpcError,
  fmtNum,
  isRingSavedBend,
  loadSavedBendIntoStore,
  parseCorrections,
  savedBendMethodLabel,
} from '@/services/savedBends'
import { useCan } from '@/stores/sessionStore'
import type { SavedBend, SavedBendSummary } from '@shared/types'
import artificialIntelligenceIcon from '@/assets/images/artificial.png'
import styles from './SavedBendsPage.module.css'

const PAGE_SIZE = 6
/** Detay penceresinde gösterilen son düzeltme sayısı */
const DETAIL_CORRECTIONS = 6 // 2026-11-17: METOT satırı eklendi — pencere üst alana sığsın

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return iso
  }
}

export default function SavedBendsPage() {
  const t = useT()
  // 2026-11-17 (QA): üst şerit akış modunu gösterir (diğer otomatik büküm ekranları gibi) — sayfa başlığıyla aynı yazı tekrarlanmasın
  const modeLabel = useBendingModeLabel()
  const navigate = useNavigate()
  const canDelete = useCan('saved-bend-delete')

  const [items, setItems] = useState<SavedBendSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [detail, setDetail] = useState<SavedBend | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.corventa.bending.listSavedBends()
      // En son güncellenen önce
      setItems([...(list ?? [])].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))))
    } catch (err) {
      setError(cleanIpcError(err) || 'KAYITLI BÜKÜMLER YÜKLENEMEDİ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const visible = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const selected = items.find((i) => i.id === selectedId) ?? null

  async function run() {
    if (!selected || busy) return
    setBusy(true)
    setError(null)
    try {
      const full = await window.corventa.bending.getSavedBend(selected.id)
      if (!loadSavedBendIntoStore(full)) {
        setError('KAYIT PARAMETRELERİ OKUNAMADI')
        return
      }
      // Çalıştırma sayacı — başarısızsa akışı engellemez
      void window.corventa.bending.markSavedBendRan(full.id).catch(() => undefined)
      navigate('/bending/ai/roll-arrangement')
    } catch (err) {
      setError(cleanIpcError(err) || 'KAYIT YÜKLENEMEDİ')
    } finally {
      setBusy(false)
    }
  }

  async function openDetail() {
    if (!selected || busy) return
    setBusy(true)
    try {
      setDetail(await window.corventa.bending.getSavedBend(selected.id))
    } catch (err) {
      setError(cleanIpcError(err) || 'KAYIT YÜKLENEMEDİ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleteOpen(false)
    try {
      await window.corventa.bending.deleteSavedBend(selected.id)
      setSelectedId(null)
      await load()
    } catch (err) {
      setError(cleanIpcError(err) || 'KAYIT SİLİNEMEDİ')
    }
  }

  const corrections = detail ? parseCorrections(detail.correctionsJson) : []

  return (
    <div className={styles.page}>
      <PageHeader icon={artificialIntelligenceIcon} iconAlt="Saved bends" label={modeLabel} />

      <div className={styles.content}>
        <h2 className={styles.title}>{t('KAYITLI BÜKÜMLER')}</h2>

        {error && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <IconLabel icon="error">{t(error)}</IconLabel>
          </div>
        )}

        <div className={styles.table}>
          <div className={`${styles.row} ${styles.head}`}>
            <span>{t('KAYIT ADI')}</span>
            <span>{t('METOT')}</span>
            <span className={styles.num}>Ø</span>
            <span className={styles.num}>A</span>
            <span className={styles.num}>{t('HEDEF')}</span>
            <span className={styles.num}>G</span>
            <span className={styles.num}>{t('ÇALIŞMA')}</span>
            <span>{t('GÜNCELLENME')}</span>
          </div>
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.row}
              data-selected={selectedId === s.id || undefined}
              onClick={() => setSelectedId(s.id)}
            >
              <span className={styles.name}>{s.name}</span>
              <span className={styles.method}>{t(savedBendMethodLabel(s.method))}</span>
              {/* ÇEMBER dışı: tek hedef konum yok (parametreler kayıtta) — 0 değerler "—" */}
              <span className={styles.num}>{fmtNum(posOrNull(s.targetDiameterMm))}</span>
              <span className={styles.num}>{fmtNum(s.profileA)}</span>
              <span className={styles.num}>{isRingSavedBend(s.method) ? fmtNum(s.pushDepthMm) : '—'}</span>
              <span className={styles.num}>{fmtNum(posOrNull(s.stepDistanceMm))}</span>
              <span className={styles.num}>{s.runCount}</span>
              <span className={styles.date}>{fmtDate(s.updatedAt)}</span>
            </button>
          ))}
          {!loading && items.length === 0 && (
            <div className={styles.empty}>
              {t('Henüz kayıtlı büküm yok. Büküm sonucu ekranında KAYDET ile eklenir.')}
            </div>
          )}
          {loading && <div className={styles.empty}>{t('YÜKLENİYOR...')}</div>}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btn}
            disabled={safePage <= 0}
            onClick={() => setPage(safePage - 1)}
          >
            <IconLabel icon="chevronLeft">{t('ÖNCEKİ')}</IconLabel>
          </button>
          <span className={styles.pageInfo}>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            <IconLabel icon="chevronRight" trailing>
              {t('SONRAKİ')}
            </IconLabel>
          </button>
          <button type="button" className={styles.btn} disabled={!selected || busy} onClick={() => void openDetail()}>
            <IconLabel icon="info">{t('DETAY')}</IconLabel>
          </button>
          <button
            type="button"
            className={`${styles.btn} ${canDelete ? '' : styles.locked}`}
            disabled={!selected || busy}
            aria-disabled={!canDelete || undefined}
            onClick={() => (canDelete ? setDeleteOpen(true) : showRoleNotice(PERMISSIONS['saved-bend-delete']))}
          >
            {/* 2026-11-17 (QA): kardeş butonlar gibi ikonlu */}
            <IconLabel icon="trash">{t('SİL')}</IconLabel>
            {!canDelete && <LockIcon className={styles.lockIcon} />}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!selected || busy}
            onClick={() => void run()}
          >
            <IconLabel icon="play">{t('ÇALIŞTIR')}</IconLabel>
          </button>
        </div>
      </div>

      <StatusBar backTo="/bending/ai" confirmDisabled={!selected || busy} onConfirm={() => void run()} />

      {deleteOpen && selected && (
        <ConfirmModal
          message={t('"{name}" kaydını silmek istediğinizden emin misiniz', { name: selected.name })}
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      )}

      {detail && (
        <div className={styles.overlay} onClick={() => setDetail(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogTitle}>{detail.name}</div>
            <div className={styles.kvGrid}>
              <KV label={t('METOT')} value={t(savedBendMethodLabel(detail.method))} />
              <KV
                label={t('HEDEF ÇAP')}
                value={detail.targetDiameterMm > 0 ? `Ø ${fmtNum(detail.targetDiameterMm)} mm` : '—'}
              />
              <KV label={t('PROFİL A')} value={`${fmtNum(detail.profileA)} mm`} />
              <KV
                label={t('HEDEF KONUM')}
                value={isRingSavedBend(detail.method) ? `${fmtNum(detail.pushDepthMm)} mm` : '—'}
              />
              <KV label={t('ADIM (G)')} value={detail.stepDistanceMm > 0 ? `${fmtNum(detail.stepDistanceMm)} mm` : '—'} />
              <KV label={t('STAGE')} value={detail.stageNumber != null ? String(detail.stageNumber) : '—'} />
              <KV label={t('ÇALIŞMA')} value={String(detail.runCount)} />
              <KV label={t('OLUŞTURAN')} value={detail.createdBy ?? '—'} />
              <KV label={t('GÜNCELLENME')} value={fmtDate(detail.updatedAt)} />
            </div>
            <div className={styles.corrHead}>
              {t('DÜZELTME GEÇMİŞİ')}
              {corrections.length > DETAIL_CORRECTIONS && (
                <span className={styles.corrMore}>
                  {t('+{n} ÖNCEKİ', { n: corrections.length - DETAIL_CORRECTIONS })}
                </span>
              )}
            </div>
            <div className={styles.corrList}>
              {corrections.length === 0 && <div className={styles.empty}>{t('HENÜZ DÜZELTME YOK')}</div>}
              {corrections.slice(-DETAIL_CORRECTIONS).map((c, i) => (
                <div key={`${c.at}-${i}`} className={styles.corrRow}>
                  <span className={styles.corrMode}>{c.mode === 'part' ? t('PARÇA') : t('YENİ PARÇA')}</span>
                  <span className={styles.num}>
                    {c.field ? `${c.field} ` : ''}
                    {fmtNum(c.fromMm)} → {fmtNum(c.toMm)} {c.field === 'X' ? '°' : 'mm'}
                  </span>
                  <span className={styles.num}>
                    {c.measuredDiameterMm != null
                      ? `Ø ${fmtNum(c.measuredDiameterMm)}`
                      : c.measuredValue != null
                        ? `${t('ÖLÇÜLEN')} ${fmtNum(c.measuredValue)}`
                        : ''}
                  </span>
                  <span className={styles.date}>{fmtDate(c.at)}</span>
                </div>
              ))}
            </div>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setDetail(null)}>
              {t('KAPAT')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** ÇEMBER dışı kayıtlarda 0 saklanan alanlar (hedef çap / adım) "—" gösterilsin */
function posOrNull(v: number | null | undefined): number | null {
  return v != null && v > 0 ? v : null
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{value}</span>
    </div>
  )
}
