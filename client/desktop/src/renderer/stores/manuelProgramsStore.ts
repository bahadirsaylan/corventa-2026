// Manuel Bending programları — şimdilik client-side store + localStorage persist.
// Backend'de Programs entity'i eklendiğinde bu store DataApi'ye geçer (hooks aynı kalır).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ManuelProgram, ManuelProgramStep } from '@shared/types'

interface ManuelProgramsState {
  programs: ManuelProgram[]
  selectedProgramNo: string | null

  select: (programNo: string | null) => void
  upsert: (program: ManuelProgram) => void
  remove: (programNo: string) => void
  upsertStep: (programNo: string, step: ManuelProgramStep, atIndex?: number) => void
  removeStep: (programNo: string, stepNo: number) => void
}

// İlk açılışta listede SEKIL-22'deki örnek program kayıtları
const INITIAL_PROGRAMS: ManuelProgram[] = [
  {
    programNo: 'M.22.01.0001',
    name: '60×60×6 KÖŞEBENT Ø500 DIŞ KIVRIM',
    geometricDiameterMm: 500,
    createdAt: '2022-01-12T14:45:33Z',
    updatedAt: '2022-01-14T17:42:01Z',
    steps: [],
  },
  {
    programNo: 'M.22.05.0001',
    name: '30×10 LAMA Ø680 KILIÇINA KIVRIM',
    geometricDiameterMm: 680,
    createdAt: '2022-05-26T11:14:25Z',
    updatedAt: '2022-06-29T15:01:08Z',
    steps: [],
  },
  {
    programNo: 'M.22.08.0001',
    name: 'ÖZEL B PROFİL Ø900 KIVRIM',
    geometricDiameterMm: 2847,
    createdAt: '2022-08-23T16:39:49Z',
    updatedAt: '2022-11-30T17:00:26Z',
    steps: [
      { stepNo: 1, command: 'A', distanceMm: 150 },
      { stepNo: 2, command: 'A', distanceMm: 160, pressureBar: 2 },
      { stepNo: 3, command: 'S', distanceMm: -500 },
      { stepNo: 4, command: 'S', distanceMm: 300 },
      { stepNo: 5, command: 'Y', distanceMm: 200, pressureBar: 40 },
      { stepNo: 6, command: 'S', distanceMm: 2700 },
      { stepNo: 7, command: 'X', distanceMm: 200, pressureBar: 35 },
      { stepNo: 8, command: 'S', distanceMm: -3000 },
      { stepNo: 9, command: 'Y', distanceMm: 220, pressureBar: 60 },
      { stepNo: 10, command: 'S', distanceMm: 3000 },
    ],
  },
  {
    programNo: 'M.22.08.0002',
    name: '15.2983 RESİM NO PROJE KIVRIM',
    geometricDiameterMm: 0,
    createdAt: '2022-08-28T09:32:21Z',
    updatedAt: '2022-12-01T11:35:50Z',
    steps: [],
  },
  {
    programNo: 'M.22.08.0003',
    name: '22.5369 RESİM NO PROJE KIVRIM',
    geometricDiameterMm: 0,
    createdAt: '2022-08-31T10:12:08Z',
    updatedAt: '2022-12-31T16:03:57Z',
    steps: [],
  },
]

export const useManuelProgramsStore = create<ManuelProgramsState>()(
  persist(
    (set) => ({
      programs: INITIAL_PROGRAMS,
      selectedProgramNo: null,

      select: (programNo) => set({ selectedProgramNo: programNo }),

      upsert: (program) =>
        set((s) => {
          const idx = s.programs.findIndex((p) => p.programNo === program.programNo)
          const next = [...s.programs]
          if (idx >= 0) next[idx] = program
          else next.unshift(program)
          return { programs: next }
        }),

      remove: (programNo) =>
        set((s) => ({
          programs: s.programs.filter((p) => p.programNo !== programNo),
          selectedProgramNo:
            s.selectedProgramNo === programNo ? null : s.selectedProgramNo,
        })),

      upsertStep: (programNo, step, atIndex) =>
        set((s) => ({
          programs: s.programs.map((p) => {
            if (p.programNo !== programNo) return p
            const steps = [...p.steps]
            const existingIdx = steps.findIndex((x) => x.stepNo === step.stepNo)
            if (existingIdx >= 0) {
              steps[existingIdx] = step
            } else if (atIndex != null) {
              steps.splice(atIndex, 0, step)
            } else {
              steps.push(step)
            }
            // step numaralarını yeniden sırala
            steps.forEach((st, i) => (st.stepNo = i + 1))
            return { ...p, steps, updatedAt: new Date().toISOString() }
          }),
        })),

      removeStep: (programNo, stepNo) =>
        set((s) => ({
          programs: s.programs.map((p) => {
            if (p.programNo !== programNo) return p
            const steps = p.steps.filter((x) => x.stepNo !== stepNo)
            steps.forEach((st, i) => (st.stepNo = i + 1))
            return { ...p, steps, updatedAt: new Date().toISOString() }
          }),
        })),
    }),
    { name: 'corventa.manuel-programs' },
  ),
)

// Selector helpers
export function selectProgram(no: string | null) {
  return (s: ManuelProgramsState): ManuelProgram | null =>
    no == null ? null : s.programs.find((p) => p.programNo === no) ?? null
}
