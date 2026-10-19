import { describe, expect, it } from 'vitest';

import { COUNTRIES, matchCountries } from './countries';

describe('matchCountries', () => {
  it('lists every country A→Z when nothing is typed', () => {
    expect(matchCountries('')).toEqual(COUNTRIES);
    expect([...COUNTRIES].sort((a, b) => a.localeCompare(b))).toEqual(COUNTRIES);
  });

  it('narrows and re-sorts on every letter, prefix matches first', () => {
    expect(matchCountries('e').slice(0, 3)).toEqual(['Ecuador', 'Egypt', 'El Salvador']);
    // Prefix match first, then the rest that contain it, A→Z.
    expect(matchCountries('eg')).toEqual(['Egypt', 'Bosnia and Herzegovina', 'Montenegro', 'Senegal']);
    expect(matchCountries('eg')[0]).toBe('Egypt');
    expect(matchCountries('egy')).toEqual(['Egypt']);
    expect(matchCountries('sa')[0]).toBe('Saint Kitts and Nevis');
    // "Saudi Arabia" starts with "sa"; "El Salvador" only has a word starting with it.
    const sa = matchCountries('sa');
    expect(sa.indexOf('Saudi Arabia')).toBeLessThan(sa.indexOf('El Salvador'));
  });

  it('ranks word-start matches above mid-word matches', () => {
    const r = matchCountries('ara');
    expect(r.indexOf('United Arab Emirates')).toBeLessThan(r.indexOf('Nicaragua'));
  });

  it('ignores case and accents, and knows common aliases', () => {
    expect(matchCountries('COTE')).toEqual(["Côte d'Ivoire"]);
    expect(matchCountries('uae')[0]).toBe('United Arab Emirates');
    expect(matchCountries('usa')[0]).toBe('United States');
    expect(matchCountries('turkey')[0]).toBe('Türkiye');
  });

  it('returns nothing for text that matches no country', () => {
    expect(matchCountries('zzz')).toEqual([]);
  });
});
