// EXCEL 28 — Usta öğrenme programı: kayıtlı makro listesi.
// YENİ KAYIT → manuel ekranda makro kaydı · DÜZENLE → adımlar · ÇALIŞTIR → oynatma · SİL (ADMIN+).

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { IconLabel } from '@/components/Icon'
import { LockIcon } from '@/components/RoleNotice/LockIcon'
import { showRoleNotice } from '@/components/RoleNotice/RoleNotice'
import { PERMISSIONS } from '@/constants/permissions'
import { useT } from '@/i18n'
import { macroErrorMessage } from '@/services/macroAxes'
import { useCan } from '@/stores/sessionStore'
import type { MacroSummary } from '@shared/types'
import ManuelHeader from '../ManuelBendingPage/ManuelHeader'
import styles from './Macro.module.css'

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function fmt(iso: string): string {
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return iso
  }
}

export default function MacroListPage() {
  const navigate = useNavigate()
  const t = useT()
  const canDelete = useCan('macro-delete')

  const [macros, setMacros] = useState<MacroSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMacros(await window.corventa.macro.list())
    } catch (err) {
      setError(macroErrorMessage(err) || 'MAKROLAR YÜKLENEMEDİ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selected = macros.find((m) => m.id === selectedId) ?? null

  async function handleDelete() {
    if (!selected) return
    setDeleteOpen(false)
    try {
      await window.corventa.macro.remove(selected.id)
      setSelectedId(null)
      await load()
    } catch (err) {
      setError(macroErrorMessage(err) || 'MAKRO SİLİNEMEDİ')
    }
  }

  return (
    <div className={styles.page}>
      <ManuelHeader onDown={() => navigate('/bending/manual-mode')} subtitle={t('MAKROLAR')} />

      <div className={styles.content}>
        <h2 className={styles.pageTitle}>
          <IconLabel icon="macro">{t('USTA ÖĞRENME PROGRAMLARI (MAKRO)')}</IconLabel>
        </h2>

        {error && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <IconLabel icon="error">{t(error)}</IconLabel>
          </div>
        )}

        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('NO')}</th>
                <th>{t('MAKRO ADI')}</th>
                <th>{t('ADIM')}</th>
                <th>{t('DEĞİŞTİREN')}</th>
                <th>{t('DEĞİŞTİRME TARİHİ')}</th>
              </tr>
            </thead>
            <tbody>
              {macros.map((m) => (
                <tr
                  key={m.id}
                  className={selectedId === m.id ? styles.selected : ''}
                  onClick={() => setSelectedId(m.id)}
                  onDoubleClick={() => navigate(`/bending/macros/${m.id}/edit`)}
                >
                  <td className={styles.mono}>#{m.id}</td>
                  <td>
                    <span className={styles.name}>{m.name}</span>
                    {m.description && <span className={styles.desc}>{m.description}</span>}
                  </td>
                  <td className={styles.num}>{m.stepCount}</td>
                  <td>{m.updatedBy ?? m.createdBy ?? '—'}</td>
                  <td className={styles.mono}>{fmt(m.updatedAt)}</td>
                </tr>
              ))}
              {!loading && macros.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    {t('Henüz kayıtlı makro yok. "YENİ KAYIT" ile manuel ekranda kayda başla.')}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    {t('YÜKLENİYOR...')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            disabled={!selected}
            onClick={() => selected && navigate(`/bending/macros/${selected.id}/edit`)}
          >
            <IconLabel icon="edit">{t('DÜZENLE')}</IconLabel>
          </button>
          <button
            className={`${styles.actionBtn} ${canDelete ? '' : styles.locked}`}
            disabled={!selected}
            aria-disabled={!canDelete || undefined}
            onClick={() => (canDelete ? setDeleteOpen(true) : showRoleNotice(PERMISSIONS['macro-delete']))}
          >
            {t('SİL')}
            {!canDelete && <LockIcon className={styles.lockIcon} />}
          </button>
          <button
            className={styles.actionBtn}
            disabled={!selected || selected.stepCount === 0}
            onClick={() => selected && navigate(`/bending/macros/${selected.id}/run`)}
          >
            <IconLabel icon="play">{t('ÇALIŞTIR')}</IconLabel>
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => navigate('/bending/macros/record')}
          >
            <IconLabel icon="record">{t('YENİ KAYIT')}</IconLabel>
          </button>
        </div>
      </div>

      {deleteOpen && selected && (
        <ConfirmModal
          message={t('"{name}" makrosunu silmek istediğinizden emin misiniz', { name: selected.name })}
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  )
}
