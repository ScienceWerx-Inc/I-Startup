/** Countries and territories (ISO 3166-1 short names, everyday spellings). */
export const COUNTRIES: string[] = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad',
  'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus',
  'Czechia', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji',
  'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala',
  'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya',
  'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macao', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali',
  'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Puerto Rico', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Türkiye', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
  'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

/** Other names people type, mapped to the listed name. */
const ALIASES: Record<string, string> = {
  usa: 'United States', us: 'United States', america: 'United States', 'united states of america': 'United States',
  uk: 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom', england: 'United Kingdom',
  uae: 'United Arab Emirates', emirates: 'United Arab Emirates', ksa: 'Saudi Arabia', turkey: 'Türkiye',
  'czech republic': 'Czechia', 'ivory coast': "Côte d'Ivoire", drc: 'Democratic Republic of the Congo',
  korea: 'South Korea', burma: 'Myanmar', holland: 'Netherlands', 'east timor': 'Timor-Leste', swaziland: 'Eswatini',
};

/** Lowercase, accents stripped: "Côte" matches "cote". */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const FOLDED = COUNTRIES.map((name) => ({ name, key: fold(name), words: fold(name).split(/[\s-]+/) }));

/**
 * Countries matching what has been typed so far, best first: names that start with it,
 * then names with a word that starts with it, then names containing it, each A→Z.
 * An alias ("UAE", "USA") puts its country first. Nothing typed lists every country A→Z.
 */
export function matchCountries(query: string): string[] {
  const q = fold(query);
  if (!q) return COUNTRIES;
  const ranked = FOLDED.flatMap(({ name, key, words }) => {
    const rank = key.startsWith(q) ? 0 : words.some((w) => w.startsWith(q)) ? 1 : key.includes(q) ? 2 : -1;
    return rank < 0 ? [] : [{ name, rank }];
  }).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  const alias = ALIASES[q];
  const names = ranked.map((r) => r.name);
  return alias ? [alias, ...names.filter((n) => n !== alias)] : names;
}

/** The listed spelling for an exact name or alias typed in any case ("egypt", "UAE"), else null. */
export function canonicalCountry(typed: string): string | null {
  const q = fold(typed);
  return FOLDED.find((c) => c.key === q)?.name ?? ALIASES[q] ?? null;
}
