import { create } from 'zustand'

// ── Bending direction selectable on the direction screen ────────────────────
export type BendingDirectionId = 'left' | 'right' | 'other'

// ── Bending method selectable on the method screen ──────────────────────────
export type BendingMethodId = 'ring' | 'arc' | 'spiral' | 'sivama'

// ── Ring bending measurements ────────────────────────────────────────────────
export interface RingBendingParams {
  /** Profile 1st edge dimension (mm) */
  A: number | null
  /** Profile 2nd edge dimension (mm) */
  B: number | null
  /** Profile wall thickness (mm) */
  S: number | null
  /** Bending diameter (mm) */
  R: number | null
  /** Machine speed (m/min) */
  H: number | null
  /** Step increment value */
  G: number | null
  /** Part length — profile total length (mm) */
  L: number | null
}

// ── Arc bending measurements ──────────────────────────────────────────────────
export interface ArcBendingParams {
  /** Profile 1st edge dimension (mm) */
  A: number | null
  /** Profile 2nd edge dimension (mm) */
  B: number | null
  /** Profile wall thickness (mm) */
  S: number | null
  /** Bending radius (mm) */
  R: number | null
  /** Bending angle α (degrees) — first segment's α; 0 < α < 180 */
  Alpha: number | null
  /** Number of arc bends (count) */
  P: number | null
  /** Flatness to next radius (mm) */
  L: number | null
  /** Total part length (mm) — operatörün fiziksel profil uzunluğu, güvenlik payı kontrolü için */
  LTotal: number | null
  /** Machine speed (m/min) */
  H: number | null
  /** Step increment value */
  G: number | null
}

// ── Spiral bending measurements ───────────────────────────────────────────────
export type SpiralDirection = 'left' | 'right'

export interface SpiralBendingParams {
  /** Profile 1st edge dimension (mm) */
  A: number | null
  /** Profile 2nd edge dimension (mm) */
  B: number | null
  /** Profile wall thickness (mm) */
  S: number | null
  /** Bending radius (mm) */
  R: number | null
  /** Machine speed (m/min) */
  H: number | null
  /** Spiral winding direction */
  Y: SpiralDirection | null
}

// ── Sivama bending measurements ───────────────────────────────────────────────
export interface SivamaBendingParams {
  /** Profile 1st edge dimension (mm) */
  A: number | null
  /** Profile 2nd edge dimension (mm) */
  B: number | null
  /** Profile wall thickness (mm) */
  S: number | null
  /** Bending angle (degrees) */
  X: number | null
  /** Machine speed (m/min) */
  H: number | null
  /** Sivama winding direction */
  Y: SpiralDirection | null
}

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

// ── API payload sent when a bending job is started ──────────────────────────
/**
 * All fields are required – nulls are validated out before sending.
 * Extend this as more screens are added.
 */
export interface StartBendingJobPayload {
  profileId:        BendingProfileId
  bendingDirection: BendingDirectionId
  bendingMethod:    BendingMethodId

  /** Present when bendingMethod === 'ring' */
  ringBending?: RingBendingParams

  /** Present when bendingMethod === 'arc' */
  arcBending?: ArcBendingParams

  /** Present when bendingMethod === 'spiral' */
  spiralBending?: SpiralBendingParams

  /** Present when bendingMethod === 'sivama' */
  sivamaBending?: SivamaBendingParams

  // Future fields (angle, speed, material, dimensions, repeatCount) go here
}

/**
 * Builds the API payload from the current store params.
 * Returns `null` when required fields are still missing (guards against
 * calling the API before the user has completed all screens).
 */
export function prepareBendingJobPayload(
  params: BendingJobParams,
): StartBendingJobPayload | null {
  const { profileId, bendingDirection, bendingMethod, ringBending, arcBending, spiralBending, sivamaBending } = params

  if (!profileId || !bendingDirection || !bendingMethod) return null

  if (bendingMethod === 'ring') {
    if (
      !ringBending ||
      ringBending.A === null ||
      ringBending.B === null ||
      ringBending.S === null ||
      ringBending.R === null ||
      ringBending.H === null ||
      ringBending.G === null ||
      ringBending.L === null
    ) {
      return null
    }
    return { profileId, bendingDirection, bendingMethod, ringBending }
  }

  if (bendingMethod === 'arc') {
    if (
      !arcBending ||
      arcBending.A === null ||
      arcBending.B === null ||
      arcBending.S === null ||
      arcBending.R === null ||
      arcBending.Alpha === null ||
      arcBending.P === null ||
      arcBending.L === null ||
      arcBending.LTotal === null ||
      arcBending.H === null ||
      arcBending.G === null
    ) {
      return null
    }
    return { profileId, bendingDirection, bendingMethod, arcBending }
  }

  if (bendingMethod === 'spiral') {
    if (
      !spiralBending ||
      spiralBending.A === null ||
      spiralBending.B === null ||
      spiralBending.S === null ||
      spiralBending.R === null ||
      spiralBending.H === null ||
      spiralBending.Y === null
    ) {
      return null
    }
    return { profileId, bendingDirection, bendingMethod, spiralBending }
  }

  if (bendingMethod === 'sivama') {
    if (
      !sivamaBending ||
      sivamaBending.A === null ||
      sivamaBending.B === null ||
      sivamaBending.S === null ||
      sivamaBending.X === null ||
      sivamaBending.H === null ||
      sivamaBending.Y === null
    ) {
      return null
    }
    return { profileId, bendingDirection, bendingMethod, sivamaBending }
  }

  // Other methods don't require specific measurements
  return { profileId, bendingDirection, bendingMethod }
}

// ── Parameters that will be collected across multiple screens ────────────────
export interface BendingJobParams {
  /** Profile shape selected on the AI Bending profile screen */
  profileId: BendingProfileId | null

  /** Bending direction selected on the direction screen */
  bendingDirection: BendingDirectionId | null

  /** Bending method selected on the method screen */
  bendingMethod: BendingMethodId | null

  /** Ring bending measurement parameters (set across multi-step screen) */
  ringBending: RingBendingParams | null

  /** Arc bending measurement parameters (set across multi-step screen) */
  arcBending: ArcBendingParams | null

  /** Spiral bending measurement parameters (set across multi-step screen) */
  spiralBending: SpiralBendingParams | null

  /** Sivama bending measurement parameters (set across multi-step screen) */
  sivamaBending: SivamaBendingParams | null

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
  profileId:        null,
  bendingDirection: null,
  bendingMethod:    null,
  ringBending:      null,
  arcBending:       null,
  spiralBending:    null,
  sivamaBending:    null,
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
