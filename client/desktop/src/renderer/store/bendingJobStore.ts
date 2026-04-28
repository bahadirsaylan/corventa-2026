import { create } from 'zustand'

// ── Profile shapes selectable on the AI Bending profile screen ──────────────
export type BendingProfileId =
  | 'square-out'
  | 'square-in'
  | 'circle'
  | 'l-right'
  | 'i-bar'
  | 'h-bar'
  | 'c-channel'
  | 't-bar'
  | 'square-filled'
  | 'i-single'
  | 'circle-filled'
  | 'l-left'

// ── Parameters that will be collected across multiple screens ────────────────
export interface BendingJobParams {
  /** Profile shape selected on the AI Bending profile screen */
  profileId: BendingProfileId | null

  /**
   * Bending angle in degrees (0–360).
   * Set on the angle selection screen (future).
   */
  angle: number | null

  /**
   * Bending speed in m/min.
   * Set on the speed/force screen (future).
   */
  speedMPerMin: number | null

  /**
   * Material type (e.g. "steel", "aluminium", "stainless").
   * Set on the material screen (future).
   */
  material: string | null

  /**
   * Profile cross-section width in mm.
   * Set on the dimension screen (future).
   */
  widthMm: number | null

  /**
   * Profile cross-section height in mm.
   * Set on the dimension screen (future).
   */
  heightMm: number | null

  /**
   * Wall thickness in mm.
   * Set on the dimension screen (future).
   */
  thicknessMm: number | null

  /**
   * Number of bending repetitions requested.
   * Set on the quantity screen (future).
   */
  repeatCount: number | null
}

// ── Store state + actions ────────────────────────────────────────────────────
interface BendingJobState {
  params: BendingJobParams

  /** Replace a subset of params (keeps other fields intact). */
  setParams: (partial: Partial<BendingJobParams>) => void

  /** Reset all params back to their null/default values. */
  resetJob: () => void
}

const INITIAL_PARAMS: BendingJobParams = {
  profileId:    null,
  angle:        null,
  speedMPerMin: null,
  material:     null,
  widthMm:      null,
  heightMm:     null,
  thicknessMm:  null,
  repeatCount:  null,
}

export const useBendingJobStore = create<BendingJobState>((set) => ({
  params: { ...INITIAL_PARAMS },

  setParams: (partial) =>
    set((state) => ({
      params: { ...state.params, ...partial },
    })),

  resetJob: () =>
    set({ params: { ...INITIAL_PARAMS } }),
}))
