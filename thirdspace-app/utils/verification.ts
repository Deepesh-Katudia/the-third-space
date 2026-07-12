// Local capture state for the verify-identity screen. Kept as a pure helper so
// the submit-enabled logic can be unit-tested without rendering the screen.
export type CaptureState = { idUri: string | null; selfieUri: string | null }

export function canSubmitVerification(state: CaptureState): boolean {
  return state.idUri !== null && state.selfieUri !== null
}
