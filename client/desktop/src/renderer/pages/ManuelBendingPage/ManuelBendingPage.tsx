// Manuel Bending — kayıtlı program listesi (SEKIL-22)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { useManuelProgramsStore } from '@/stores/manuelProgramsStore'
import ManuelHeader from './ManuelHeader'
import ProgramTable from './ProgramTable'
import ManuelFooter from './ManuelFooter'
import styles from './ManuelBendingPage.module.css'

export default function ManuelBendingPage() {
  const navigate = useNavigate()
  const programs = useManuelProgramsStore((s) => s.programs)
  const selectedNo = useManuelProgramsStore((s) => s.selectedProgramNo)
  const select = useManuelProgramsStore((s) => s.select)
  const remove = useManuelProgramsStore((s) => s.remove)

  const [deleteOpen, setDeleteOpen] = useState(false)

  const selected = programs.find((p) => p.programNo === selectedNo) ?? null

  function handleNew() {
    // Yeni program yaratıp doğrudan editöre gönder
    const programNo = generateProgramNo()
    useManuelProgramsStore.getState().upsert({
      programNo,
      name: 'YENİ KIVRIM',
      geometricDiameterMm: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
    })
    select(programNo)
    navigate(`/bending/manual/edit/${encodeURIComponent(programNo)}`)
  }

  function handleEdit() {
    if (!selected) return
    navigate(`/bending/manual/edit/${encodeURIComponent(selected.programNo)}`)
  }

  function handleStart() {
    if (!selected) return
    navigate(`/bending/manual/run/${encodeURIComponent(selected.programNo)}`)
  }

  function handleDeleteConfirmed() {
    if (!selected) return
    remove(selected.programNo)
    setDeleteOpen(false)
  }

  return (
    <div className={styles.page}>
      <ManuelHeader />

      <div className={styles.content}>
        <ProgramTable programs={programs} selected={selectedNo} onSelect={select} />

        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            disabled={!selected}
            onClick={handleEdit}
          >
            PROGRAMI DEĞİŞTİR
          </button>
          <button
            className={styles.actionBtn}
            disabled={!selected}
            onClick={() => setDeleteOpen(true)}
          >
            PROGRAMI SİL
          </button>
          <button
            className={styles.actionBtn}
            disabled={!selected}
            onClick={handleStart}
          >
            PROGRAMI BAŞLAT
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={handleNew}
          >
            YENİ KIVRIM
          </button>
        </div>
      </div>

      <ManuelFooter
        selectedDiameter={selected?.geometricDiameterMm ?? null}
        diameterLabel="SEÇİLİ PROGRAMIN&#10;GEOMETRİSEL ÇAPI"
      />

      {deleteOpen && selected && (
        <ConfirmModal
          message="SEÇİLİ PROGRAMI SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ"
          cancelLabel="VAZGEÇ"
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  )
}

function generateProgramNo(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  // Saat-dakika ile basit unique seq — tam tarihçe sequence backend'e bırakılır
  const seq = String(now.getHours() * 60 + now.getMinutes()).padStart(4, '0')
  return `M.${yy}.${mm}.${seq}`
}
