import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useUserLocation, resolveLocation, setBorough } from '../../hooks/useUserLocation'
import { detectBorough } from '../../services/location'
import { getLocationOverride, setLocationOverride } from '../../services/preferences'

jest.mock('../../services/location', () => ({ detectBorough: jest.fn() }))
jest.mock('../../services/preferences', () => ({
  getLocationOverride: jest.fn(),
  setLocationOverride: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(getLocationOverride as jest.Mock).mockResolvedValue(null)
  ;(detectBorough as jest.Mock).mockResolvedValue(null)
  ;(setLocationOverride as jest.Mock).mockResolvedValue(undefined)
})

describe('useUserLocation', () => {
  it('uses the GPS borough when there is no manual override', async () => {
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBe('Brooklyn')
    expect(result.current.source).toBe('gps')
  })

  it('prefers a manual override over GPS, and does not even ask for a fix', async () => {
    ;(getLocationOverride as jest.Mock).mockResolvedValue({ borough: 'Manhattan' })
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBe('Manhattan')
    expect(result.current.source).toBe('manual')
    expect(detectBorough).not.toHaveBeenCalled()
  })

  it('treats a stored All of NYC as a manual choice that suppresses GPS', async () => {
    ;(getLocationOverride as jest.Mock).mockResolvedValue({ borough: null })
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBeNull()
    expect(result.current.source).toBe('manual')
    expect(detectBorough).not.toHaveBeenCalled()
  })

  it('falls back to the signup borough when GPS yields nothing', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Bronx') })
    expect(result.current.borough).toBe('Bronx')
    expect(result.current.source).toBe('profile')
  })

  it('falls back to all of NYC when there is no profile borough either', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    expect(result.current.borough).toBeNull()
    expect(result.current.source).toBe('default')
  })

  it('clears loading once resolution finishes', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('shares state across separate hook instances so the picker updates the feed', async () => {
    // The picker is a different route from Discover — this is the whole reason
    // this is a module store rather than useState.
    const feed = renderHook(() => useUserLocation())
    const picker = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    act(() => { picker.result.current.setBorough('Staten Island') })
    expect(feed.result.current.borough).toBe('Staten Island')
    expect(feed.result.current.source).toBe('manual')
  })

  it('persists a manual pick', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    act(() => { result.current.setBorough('Queens') })
    expect(setLocationOverride).toHaveBeenCalledWith('Queens')
  })
})
