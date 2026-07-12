import { canSubmitVerification } from '../../utils/verification'

describe('canSubmitVerification', () => {
  it('is false when neither image is captured', () => {
    expect(canSubmitVerification({ idUri: null, selfieUri: null })).toBe(false)
  })
  it('is false when only the ID is captured', () => {
    expect(canSubmitVerification({ idUri: 'file://id', selfieUri: null })).toBe(false)
  })
  it('is false when only the selfie is captured', () => {
    expect(canSubmitVerification({ idUri: null, selfieUri: 'file://selfie' })).toBe(false)
  })
  it('is true when both images are captured', () => {
    expect(canSubmitVerification({ idUri: 'file://id', selfieUri: 'file://selfie' })).toBe(true)
  })
})
