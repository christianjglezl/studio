// The sickw API returns services without a category, so we derive the same groups
// shown in the sickw.com panel from the service name.
export const SICKW_CATEGORIES = [
  'Apple Check Services',
  'Premium Tools & Services',
  'Status Check Services',
  'Generic Services',
  'iPhone Unlock Services',
  'Generic Unlock Services',
] as const;

export type SickwCategory = typeof SICKW_CATEGORIES[number];

export const getSickwCategory = (serviceName: string): SickwCategory => {
  const n = serviceName.toUpperCase();
  if (/BYPASS|ACCOUNT REMOVE/.test(n)) return 'Premium Tools & Services';
  if (/ICLOUD/.test(n)) return 'Apple Check Services';
  if (/ - (CLEAN|PREMIUM|OUT OF CONTRACT|LIMITED)|CLEAN\/|CLEAN &|SOLD DATE|HTC INTERNATIONAL|VIDEOTRON|EMEA SERVICE/.test(n)) {
    return /SAMSUNG|HTC|XIAOMI|ROMANIA/.test(n) ? 'Generic Unlock Services' : 'iPhone Unlock Services';
  }
  if (/BLACKLIST STATUS|USA STATUS/.test(n)) return 'Status Check Services';
  if (/APPLE|IPHONE|MACBOOK|IMAC/.test(n)) return 'Apple Check Services';
  return 'Generic Services';
};

export const groupByCategory = <T extends { name: string }>(items: T[]) =>
  SICKW_CATEGORIES
    .map(category => ({ category, items: items.filter(i => getSickwCategory(i.name) === category) }))
    .filter(group => group.items.length > 0);
