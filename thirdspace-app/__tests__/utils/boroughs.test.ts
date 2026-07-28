import { boroughFromPlace } from '../../utils/boroughs'

describe('boroughFromPlace', () => {
  it('maps each borough from its plain name', () => {
    expect(boroughFromPlace({ subregion: 'Brooklyn' })).toBe('Brooklyn')
    expect(boroughFromPlace({ subregion: 'Manhattan' })).toBe('Manhattan')
    expect(boroughFromPlace({ subregion: 'Queens' })).toBe('Queens')
    expect(boroughFromPlace({ subregion: 'Bronx' })).toBe('Bronx')
    expect(boroughFromPlace({ subregion: 'Staten Island' })).toBe('Staten Island')
  })

  it('maps the county names reverse geocoding actually returns', () => {
    // These are what the OS returns far more often than the borough name.
    expect(boroughFromPlace({ subregion: 'Kings County' })).toBe('Brooklyn')
    expect(boroughFromPlace({ subregion: 'New York County' })).toBe('Manhattan')
    expect(boroughFromPlace({ subregion: 'Queens County' })).toBe('Queens')
    expect(boroughFromPlace({ subregion: 'Bronx County' })).toBe('Bronx')
    expect(boroughFromPlace({ subregion: 'Richmond County' })).toBe('Staten Island')
  })

  it('maps the definite-article and short forms', () => {
    expect(boroughFromPlace({ city: 'The Bronx' })).toBe('Bronx')
  })

  it('ignores case and surrounding whitespace', () => {
    expect(boroughFromPlace({ city: '  brooklyn ' })).toBe('Brooklyn')
    expect(boroughFromPlace({ city: 'KINGS COUNTY' })).toBe('Brooklyn')
  })

  it('checks subregion, then district, then city', () => {
    // subregion wins outright when it maps.
    expect(boroughFromPlace({ subregion: 'Kings County', city: 'Manhattan' })).toBe('Brooklyn')
    // an unmappable subregion falls through to district.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Hempstead', district: 'Bronx' })).toBe('Bronx')
    // and then, with no usable district, to city.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Queens' })).toBe('Queens')
  })

  it('does not let a NYC-wide city name outrank the real borough in district', () => {
    // Both Apple and Google routinely return city: "New York" for points outside
    // Manhattan, carrying the real borough in district (subLocality). city must
    // never win that race.
    expect(boroughFromPlace({ city: 'New York', district: 'Brooklyn' })).toBe('Brooklyn')
  })

  it('returns null for a place outside NYC rather than guessing', () => {
    // Not an error state — the caller falls through to the next source.
    expect(boroughFromPlace({ subregion: 'Suffolk County', city: 'Boston' })).toBeNull()
  })

  it('returns null for empty, null and undefined input', () => {
    expect(boroughFromPlace({})).toBeNull()
    expect(boroughFromPlace({ subregion: null, city: null, district: null })).toBeNull()
    expect(boroughFromPlace({ city: '' })).toBeNull()
    expect(boroughFromPlace(null)).toBeNull()
    expect(boroughFromPlace(undefined)).toBeNull()
  })
})
