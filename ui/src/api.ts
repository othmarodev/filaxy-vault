import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { EntrySummary, EntrySecret, SeedSecret, Settings, ImportPreview, Mapping, GenOpts, PassphraseOpts, CustomField, AttachmentInfo, HealthReport } from "./types";

export const vaultExists = (path: string) => invoke<boolean>("vault_exists", { path });

export const createVault = (path: string, password: string, keyfilePath?: string) =>
  invoke<void>("create_vault", { path, password, keyfilePath: keyfilePath ?? null });

export const unlockVault = (path: string, password: string, keyfilePath?: string, totpCode?: string) =>
  invoke<void>("unlock_vault", {
    path, password, keyfilePath: keyfilePath ?? null, totpCode: totpCode ?? null,
  });

export const lockVault = () => invoke<void>("lock_vault");
export const isLocked = () => invoke<boolean>("is_locked");

export const listEntries = () => invoke<EntrySummary[]>("list_entries", undefined);
export const searchEntries = (query: string) => invoke<EntrySummary[]>("search_entries", { query });
export const getEntrySecret = (id: string) => invoke<EntrySecret>("get_entry_secret", { id });

export const addEntry = (
  title: string, username: string, password: string, url: string, notes: string,
  tags: string[], totpSecret: string | undefined, group: string,
  customFields: CustomField[], expiresAt: number | null, icon: string,
  kind?: "login" | "note" | "card" | "identity",
) => invoke<string>("add_entry", { title, username, password, url, notes, tags, totpSecret: totpSecret ?? null, group, customFields, expiresAt, icon, kind: kind ?? null });

export const updateEntry = (
  id: string, title: string, username: string, password: string, url: string, notes: string,
  tags: string[], totpSecret: string | undefined, group: string,
  customFields: CustomField[], expiresAt: number | null, icon: string,
) => invoke<void>("update_entry", { id, title, username, password, url, notes, tags, totpSecret: totpSecret ?? null, group, customFields, expiresAt, icon });

export const deleteEntry = (id: string) => invoke<void>("delete_entry", { id });
export const restoreEntry = (id: string) => invoke<void>("restore_entry", { id });
export const deleteForever = (id: string) => invoke<void>("delete_forever", { id });
export const emptyTrash = () => invoke<number>("empty_trash");
export const toggleFavorite = (id: string) => invoke<boolean>("toggle_favorite", { id });

export const generatePassword = (o: GenOpts) =>
  invoke<string>("generate_password", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
  });

export const passwordEntropy = (o: GenOpts) =>
  invoke<number>("password_entropy", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
  });

export const generatePassphrase = (o: PassphraseOpts) =>
  invoke<string>("generate_passphrase", {
    words: o.words, separator: o.separator, capitalize: o.capitalize, includeNumber: o.include_number,
  });

export const passphraseEntropy = (o: PassphraseOpts) =>
  invoke<number>("passphrase_entropy", {
    words: o.words, separator: o.separator, capitalize: o.capitalize, includeNumber: o.include_number,
  });

export const importPreview = (filePath: string) => invoke<ImportPreview>("import_preview", { filePath });
export const importCommit = (filePath: string, map: Mapping) => invoke<number>("import_commit", { filePath, map });
export const exportBackup = (destPath: string) => invoke<void>("export_backup", { destPath });

export const copySecret = (id: string) => invoke<void>("copy_secret_to_clipboard", { id });
export const touchActivity = () => invoke<void>("touch_activity");
export const checkAutolock = () => invoke<boolean>("check_autolock");

export const getSettings = () => invoke<Settings>("get_settings");
export const setSettings = (autolockSecs: number, clipboardClearSecs: number) =>
  invoke<void>("set_settings", { autolockSecs, clipboardClearSecs });

export const rememberOnDevice = () => invoke<void>("remember_on_device");
export const forgetDevice = () => invoke<void>("forget_device");
export const unlockWithDevice = (path: string) => invoke<void>("unlock_with_device", { path });

export const totpNow = (secret: string) => invoke<string>("totp_now", { secret });

// ── Seed-phrase (crypto wallet) entries ──
export const addSeedEntry = (
  title: string, network: string, words: string[], derivationPath: string,
  passphrase: string, notes: string, tags: string[], icon: string,
) => invoke<string>("add_seed_entry", { title, network, words, derivationPath, passphrase, notes, tags, icon });

export const updateSeedEntry = (
  id: string, title: string, network: string, words: string[], derivationPath: string,
  passphrase: string, notes: string, tags: string[], icon: string,
) => invoke<void>("update_seed_entry", { id, title, network, words, derivationPath, passphrase, notes, tags, icon });

export const getSeedSecret = (id: string) => invoke<SeedSecret>("get_seed_secret", { id });

// ── Authenticator / 2FA (TOTP) entries ──
export const addTotpEntry = (issuer: string, account: string, secret: string, tags: string[], icon: string) =>
  invoke<string>("add_totp_entry", { issuer, account, secret, tags, icon });
export const updateTotpEntry = (id: string, issuer: string, account: string, secret: string, tags: string[], icon: string) =>
  invoke<void>("update_totp_entry", { id, issuer, account, secret, tags, icon });
export const getTotpSecret = (id: string) => invoke<string>("get_totp_secret", { id });
export const totpCodeFor = (id: string) => invoke<string>("totp_code_for", { id });
export const importGoogleAuthenticator = (uri: string) => invoke<number>("import_google_authenticator", { uri });

// ── Attachments (files stored encrypted in the vault) ──
export const listAttachments = (id: string) => invoke<AttachmentInfo[]>("list_attachments", { id });
export const addAttachment = (id: string, name: string, dataB64: string) => invoke<void>("add_attachment", { id, name, dataB64 });
export const removeAttachment = (id: string, index: number) => invoke<void>("remove_attachment", { id, index });
export const getAttachment = (id: string, index: number) => invoke<string>("get_attachment", { id, index });

// ── Offline health report ──
export const healthReport = () => invoke<HealthReport>("health_report");

// ── Native menu ──
export const setMenuLanguage = (lang: string) => invoke<void>("set_menu_language", { lang });
export const onMenu = (cb: (id: string) => void) => listen<string>("fv-menu", (e) => cb(e.payload));

// ── Open an external URL in the system browser (via tauri-plugin-opener) ──
export const openUrl = (url: string) => invoke<void>("plugin:opener|open_url", { url });
