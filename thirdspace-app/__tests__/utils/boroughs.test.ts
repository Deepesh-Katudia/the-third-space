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
    expect(boroughFromPlace({ city: 'New York City' })).toBe('Manhattan')
  })

  it('ignores case and surrounding whitespace', () => {
    expect(boroughFromPlace({ city: '  brooklyn ' })).toBe('Brooklyn')
    expect(boroughFromPlace({ city: 'KINGS COUNTY' })).toBe('Brooklyn')
  })

  it('checks subregion, then city, then district', () => {
    // subregion wins outright when it maps.
    expect(boroughFromPlace({ subregion: 'Kings County', city: 'Manhattan' })).toBe('Brooklyn')
    // an unmappable subregion falls through to city.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Queens' })).toBe('Queens')
    // and then to district.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Hempstead', district: 'Bronx' })).toBe('Bronx')
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
