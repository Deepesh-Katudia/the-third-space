import { renderHook, act } from '@testing-library/react-native'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { EMPTY_FILTERS } from '../../constants/filters'

describe('useDiscoverFilters', () => {
  afterEach(() => {
    const { result } = renderHook(() => useDiscoverFilters())
    act(() => result.current.reset())
  })

  it('updates query and filters, then resets', () => {
    const { result } = renderHook(() => useDiscoverFilters())

    act(() => result.current.setQuery('wine'))
    expect(result.current.query).toBe('wine')

    act(() => result.current.setFilters({ ...EMPTY_FILTERS, hide21: true }))
    expect(result.current.filters.hide21).toBe(true)

    act(() => result.current.reset())
    expect(result.current.query).toBe('')
    expect(result.current.filters).toEqual(EMPTY_FILTERS)
  })

  it('shares state across separate consumers', () => {
    const a = renderHook(() => useDiscoverFilters())
    const b = renderHook(() => useDiscoverFilters())
    act(() => a.result.current.setQuery('vinyl'))
    expect(b.result.current.query).toBe('vinyl')
  })
})
