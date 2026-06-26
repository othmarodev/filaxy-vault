import { invoke } from "@tauri-apps/api/core";
import type { EntrySummary, EntrySecret, SeedSecret, Settings, ImportPreview, Mapping, GenOpts } from "./types";

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
  tags: string[], totpSecret?: string,
) => invoke<string>("add_entry", { title, username, password, url, notes, tags, totpSecret: totpSecret ?? null });

export const updateEntry = (
  id: string, title: string, username: string, password: string, url: string, notes: string,
  tags: string[], totpSecret?: string,
) => invoke<void>("update_entry", { id, title, username, password, url, notes, tags, totpSecret: totpSecret ?? null });

export const deleteEntry = (id: string) => invoke<void>("delete_entry", { id });

export const generatePassword = (o: GenOpts) =>
  invoke<string>("generate_password", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
  });

export const passwordEntropy = (o: GenOpts) =>
  invoke<number>("password_entropy", {
    length: o.length, lower: o.lower, upper: o.upper, digits: o.digits, symbols: o.symbols, excludeAmbiguous: o.exclude_ambiguous,
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
  passphrase: string, notes: string, tags: string[],
) => invoke<string>("add_seed_entry", { title, network, words, derivationPath, passphrase, notes, tags });

export const updateSeedEntry = (
  id: string, title: string, network: string, words: string[], derivationPath: string,
  passphrase: string, notes: string, tags: string[],
) => invoke<void>("update_seed_entry", { id, title, network, words, derivationPath, passphrase, notes, tags });

export const getSeedSecret = (id: string) => invoke<SeedSecret>("get_seed_secret", { id });
