export interface EntrySummary {
  id: string;
  title: string;
  username: string;
  url: string;
  tags: string[];
  has_totp: boolean;
  kind: "login" | "seed" | "totp";
  word_count: number;
  totp_digits: number;
  totp_period: number;
  favorite: boolean;
  trashed: boolean;
  group: string;
  icon: string;
  expires_at: number | null;
  attachment_count: number;
}
export interface AttachmentInfo {
  name: string;
  size: number;
}
export interface CustomField {
  label: string;
  value: string;
  protected: boolean;
}
export interface EntrySecret {
  password: string;
  notes: string;
  totp_code: string | null;
  custom_fields: CustomField[];
}
export interface SeedSecret {
  words: string[];
  network: string;
  derivation_path: string;
  passphrase: string;
  notes: string;
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
