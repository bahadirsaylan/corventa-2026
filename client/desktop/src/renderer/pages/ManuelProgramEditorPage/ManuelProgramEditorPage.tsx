// SEKIL-24: Program adımlarını yazma — A/B/S/X/Y komut + mesafe + opsiyonel basınç

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import KeyboardModal from '@/components/KeyboardModal/KeyboardModal'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import { useManuelProgramsStore } from '@/stores/manuelProgramsStore'
import type { ManuelProgramStep, ManuelStepCommand } from '@shared/types'
import ManuelHeader from '../ManuelBendingPage/ManuelHeader'
import ManuelFooter from '../ManuelBendingPage/ManuelFooter'
import StepEditorRow from './StepEditorRow'
import StepFormDialog from './StepFormDialog'
import styles from './ManuelProgramEditorPage.module.css'

export default function ManuelProgramEditorPage() {
  const navigate = useNavigate()
  const { programNo: rawNo } = useParams<{ programNo: string }>()
  const programNo = rawNo ? decodeURIComponent(rawNo) : null

  const program = useManuelProgramsStore((s) =>
    programNo ? s.programs.find((p) => p.programNo === programNo) ?? null : null,
  )
  const upsert = useManuelProgramsStore((s) => s.upsert)
  const upsertStep = useManuelProgramsStore((s) => s.upsertStep)
  const removeStep = useManuelProgramsStore((s) => s.removeStep)

  const [selectedStepNo, setSelectedStepNo] = useState<number | null>(null)
  const [keyboardOpen, setKeyboardOpen] = useState<'name' | null>(null)
  const [numpadOpen, setNumpadOpen] = useState<'diameter' | null>(null)
  const [stepDialog, setStepDialog] = useState<
    | { mode: 'edit'; step: ManuelProgramStep }
    | { mode: 'insert'; atIndex: number }
    | { mode: 'append' }
    | null
  >(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!program) {
    return (
      <div className={styles.page}>
        <ManuelHeader />
        <div className={styles.empty}>Program bulunamadı.</div>
      </div>
    )
  }

  const selectedStep = program.steps.find((s) => s.stepNo === selectedStepNo) ?? null

  function handleSaveStep(step: ManuelProgramStep, atIndex?: number) {
    if (!program) return
    upsertStep(program.programNo, step, atIndex)
    setStepDialog(null)
  }

  function handleDeleteStep() {
    if (!program || selectedStepNo == null) return
    removeStep(program.programNo, selectedStepNo)
    setSelectedStepNo(null)
    setDeleteOpen(false)
  }

  function handleNameSave(value: string) {
    if (!program) return
    upsert({ ...program, name: value, updatedAt: new Date().toISOString() })
    setKeyboardOpen(null)
  }

  function handleDiameterSave(value: string) {
    if (!program) return
    const num = parseFloat(value)
    if (!Number.isFinite(num)) return
    upsert({ ...program, geometricDiameterMm: num, updatedAt: new Date().toISOString() })
    setNumpadOpen(null)
  }

  return (
    <div className={styles.page}>
      <ManuelHeader subtitle={program.programNo} />

      <div className={styles.content}>
        {/* Program meta header */}
        <div className={styles.metaRow} onClick={() => setKeyboardOpen('name')}>
          <span className={styles.metaCode}>{program.programNo}</span>
          <span className={styles.metaName}>{program.name}</span>
        </div>

        {/* Step table */}
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colNo}>SATIR SIRA NO</th>
                <th>PROGRAM ADIMLARI</th>
                <th>DEĞİŞTİREN</th>
                <th>DEĞİŞTİRME TARİHİ</th>
              </tr>
            </thead>
            <tbody>
              {program.steps.map((step) => (
                <StepEditorRow
                  key={step.stepNo}
                  step={step}
                  selected={selectedStepNo === step.stepNo}
                  onSelect={() => setSelectedStepNo(step.stepNo)}
                />
              ))}
              {program.steps.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>
                    Adım yok. "ÖNE SATIR EKLE" ile ilk komutu ekle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            disabled={!selectedStep}
            onClick={() => selectedStep && setStepDialog({ mode: 'edit', step: selectedStep })}
          >
            SATIRI DEĞİŞTİR
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => {
              const idx = selectedStepNo ? selectedStepNo - 1 : 0
              setStepDialog({ mode: 'insert', atIndex: idx })
            }}
          >
            ÖNE SATIR EKLE
          </button>
          <button
            className={styles.actionBtn}
            disabled={!selectedStep}
            onClick={() => setDeleteOpen(true)}
          >
            SATIR SİL
          </button>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => navigate('/bending/manual')}
          >
            KAYDET
          </button>
        </div>
      </div>

      <ManuelFooter
        selectedDiameter={program.geometricDiameterMm}
        diameterLabel="DEĞİŞİKLİKLER SONUCU&#10;OLUŞAN GEOMETRİSEL ÇAP"
        onTouchConfirm={() => setNumpadOpen('diameter')}
      />

      {keyboardOpen === 'name' && (
        <KeyboardModal
          initialValue={program.name}
          label="PROGRAM ADI"
          onConfirm={handleNameSave}
          onClose={() => setKeyboardOpen(null)}
        />
      )}

      {numpadOpen === 'diameter' && (
        <NumpadModal
          fieldLabel="Ø"
          initialValue={String(program.geometricDiameterMm)}
          onConfirm={handleDiameterSave}
          onClose={() => setNumpadOpen(null)}
        />
      )}

      {stepDialog && (
        <StepFormDialog
          mode={stepDialog.mode}
          initialStep={stepDialog.mode === 'edit' ? stepDialog.step : null}
          onSave={(step) => {
            if (stepDialog.mode === 'edit') {
              handleSaveStep(step)
            } else if (stepDialog.mode === 'insert') {
              handleSaveStep({ ...step, stepNo: stepDialog.atIndex + 1 }, stepDialog.atIndex)
            } else {
              handleSaveStep({
                ...step,
                stepNo: program.steps.length + 1,
              })
            }
          }}
          onClose={() => setStepDialog(null)}
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          message={`S.${String(selectedStepNo).padStart(4, '0')} satırını silmek istediğinizden emin misiniz`}
          confirmLabel="SİL"
          variant="danger"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDeleteStep}
        />
      )}
    </div>
  )
}

// Helper export edilen tip — child component kullansın
export type { ManuelStepCommand }
