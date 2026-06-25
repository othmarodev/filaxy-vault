export interface EntrySummary {
  id: string;
  title: string;
  username: string;
  url: string;
  tags: string[];
  has_totp: boolean;
}
export interface EntrySecret {
  password: string;
  notes: string;
  totp_code: string | null;
}
export interface Settings {
  autolock_secs: number;
  clipboard_clear_secs: number;
}
export interface ImportPreview {
  headers: string[];
  rows: string[][];
  detected_preset: string | null;
}
export interface Mapping {
  title?: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
}
export interface GenOpts {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  exclude_ambiguous: boolean;
}
