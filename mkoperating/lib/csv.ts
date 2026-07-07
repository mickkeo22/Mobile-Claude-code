// Minimal CSV parsing for outbound imports: handles quoted fields, embedded
// commas/newlines, and flexible header names. No dependency needed.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    // skip fully-empty rows
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) rows.push(row);
    row = [];
  };

  const s = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      pushField();
      pushRow();
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    pushField();
    pushRow();
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'business', 'business name', 'business_name', 'company', 'company name'],
  niche: ['niche', 'category', 'industry', 'trade', 'type', 'service'],
  town: ['town', 'city', 'location', 'area', 'locality'],
  website: ['website', 'site', 'url', 'web', 'domain'],
  email: ['email', 'e-mail', 'email address', 'mail', 'contact email'],
};

export interface ProspectRow {
  name: string;
  niche: string;
  town: string;
  website: string;
  email: string;
}

export function mapProspects(rows: string[][]): { prospects: ProspectRow[]; skipped: number } {
  if (!rows.length) return { prospects: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());

  const findCol = (key: string) =>
    header.findIndex((h) => HEADER_ALIASES[key].includes(h));

  const cols = {
    name: findCol('name'),
    niche: findCol('niche'),
    town: findCol('town'),
    website: findCol('website'),
    email: findCol('email'),
  };

  // If no recognizable header, assume positional: name,niche,town,website,email
  const hasHeader = cols.name !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const get = (r: string[], key: keyof typeof cols, fallbackIdx: number) => {
    const idx = hasHeader ? cols[key] : fallbackIdx;
    return idx >= 0 && idx < r.length ? r[idx].trim() : '';
  };

  const prospects: ProspectRow[] = [];
  let skipped = 0;
  for (const r of dataRows) {
    const p: ProspectRow = {
      name: get(r, 'name', 0),
      niche: get(r, 'niche', 1),
      town: get(r, 'town', 2),
      website: get(r, 'website', 3),
      email: get(r, 'email', 4),
    };
    if (!p.name) {
      skipped++;
      continue;
    }
    prospects.push(p);
  }
  return { prospects, skipped };
}
