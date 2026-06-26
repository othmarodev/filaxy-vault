use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::State;
use zeroize::Zeroizing;

use filaxy_vault_core::crypto::kdf::KdfParams;
use filaxy_vault_core::vault::{store, Vault};

use crate::session::{Settings, Unlocked};
use crate::state::AppState;

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

fn read_keyfile(opt: &Option<String>) -> Result<Option<Vec<u8>>, String> {
    match opt {
        None => Ok(None),
        Some(p) => std::fs::read(p).map(Some).map_err(|_| "cannot open vault".to_string()),
    }
}

#[tauri::command]
pub fn vault_exists(path: String) -> bool {
    PathBuf::from(path).exists()
}

#[tauri::command]
pub fn create_vault(
    state: State<'_, Mutex<AppState>>,
    path: String,
    password: String,
    keyfile_path: Option<String>,
) -> Result<(), String> {
    let kf = read_keyfile(&keyfile_path)?;
    let p = PathBuf::from(&path);
    store::create(&p, password.as_bytes(), kf.as_deref()).map_err(|_| "cannot create vault".to_string())?;
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    app.vault_path = Some(p);
    Ok(())
}

#[tauri::command]
pub fn unlock_vault(
    state: State<'_, Mutex<AppState>>,
    path: String,
    password: String,
    keyfile_path: Option<String>,
    _totp_code: Option<String>,
) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;

    // enforce backoff
    let delay = app.session.backoff.delay_ms();
    if delay > 0 {
        return Err(format!("locked: retry after {} ms", delay));
    }

    let kf = read_keyfile(&keyfile_path)?;
    let p = PathBuf::from(&path);
    let vault: Result<Vault, _> = store::load(&p, password.as_bytes(), kf.as_deref());

    match vault {
        Ok(v) => {
            let unlocked = Unlocked {
                vault: v,
                password: Zeroizing::new(password.into_bytes()),
                keyfile: kf.map(Zeroizing::new),
                params: KdfParams::default(),
                settings: Settings::default(),
            };
            app.session.set_unlocked(unlocked, now_secs());
            app.vault_path = Some(p);
            Ok(())
        }
        Err(_) => {
            app.session.backoff.record_failure();
            Err("cannot open vault".to_string()) // generic — never reveal which factor failed
        }
    }
}

#[tauri::command]
pub fn lock_vault(state: State<'_, Mutex<AppState>>) {
    if let Ok(mut app) = state.lock() {
        app.session.lock();
    }
}

#[tauri::command]
pub fn is_locked(state: State<'_, Mutex<AppState>>) -> bool {
    state.lock().map(|app| app.session.is_locked()).unwrap_or(true)
}

// ---------------------------------------------------------------------------
// Task 7: entry CRUD + search + generator + TOTP
// ---------------------------------------------------------------------------

use filaxy_vault_core::generator::{self, GenOptions};
use filaxy_vault_core::vault::model::Entry;
use uuid::Uuid;
use crate::dto;
use crate::totp;

fn persist(app: &AppState) -> Result<(), String> {
    let path = app.vault_path.as_ref().ok_or("no vault path")?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let kf: Option<&[u8]> = u.keyfile.as_ref().map(|z| z.as_slice());
    store::save(path, &u.vault, &u.password, kf, u.params).map_err(|_| "cannot save vault".to_string())
}

fn parse_id(id: &str) -> Result<Uuid, String> {
    Uuid::parse_str(id).map_err(|_| "bad id".to_string())
}

#[tauri::command]
pub fn list_entries(state: State<'_, Mutex<AppState>>) -> Result<Vec<dto::EntrySummary>, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    Ok(u.vault.entries.iter().map(dto::from_entry).collect())
}

#[tauri::command]
pub fn search_entries(state: State<'_, Mutex<AppState>>, query: String) -> Result<Vec<dto::EntrySummary>, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    Ok(u.vault.search(&query).into_iter().map(dto::from_entry).collect())
}

#[tauri::command]
pub fn get_entry_secret(state: State<'_, Mutex<AppState>>, id: String) -> Result<dto::EntrySecret, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let uuid = parse_id(&id)?;
    let e = u.vault.get(uuid).ok_or("not found")?;
    let totp_code = e.totp_secret.as_ref().and_then(|s| totp::current_code(s).ok());
    Ok(dto::EntrySecret { password: e.password.clone(), notes: e.notes.clone(), totp_code })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn add_entry(
    state: State<'_, Mutex<AppState>>,
    title: String, username: String, password: String, url: String, notes: String,
    tags: Vec<String>, totp_secret: Option<String>, group: String,
) -> Result<String, String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let id = {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let mut e = Entry::new(title);
        e.username = username; e.url = url; e.notes = notes; e.tags = tags;
        e.totp_secret = totp_secret; e.group = group; e.created_at = now;
        e.set_password(password, now);
        let id = e.id.to_string();
        u.vault.add(e);
        id
    };
    persist(&app)?;
    Ok(id)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_entry(
    state: State<'_, Mutex<AppState>>,
    id: String, title: String, username: String, password: String, url: String, notes: String,
    tags: Vec<String>, totp_secret: Option<String>, group: String,
) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.title = title; e.username = username; e.url = url; e.notes = notes;
        e.tags = tags; e.totp_secret = totp_secret; e.group = group;
        if e.password != password {
            e.set_password(password, now);
        }
    }
    persist(&app)
}

/// Move an entry to the trash (soft delete — reversible).
#[tauri::command]
pub fn delete_entry(state: State<'_, Mutex<AppState>>, id: String) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.trashed = true;
    }
    persist(&app)
}

/// Restore an entry from the trash.
#[tauri::command]
pub fn restore_entry(state: State<'_, Mutex<AppState>>, id: String) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.trashed = false;
    }
    persist(&app)
}

/// Permanently delete a single entry (irreversible).
#[tauri::command]
pub fn delete_forever(state: State<'_, Mutex<AppState>>, id: String) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        if !u.vault.remove(uuid) { return Err("not found".to_string()); }
    }
    persist(&app)
}

/// Permanently delete every trashed entry.
#[tauri::command]
pub fn empty_trash(state: State<'_, Mutex<AppState>>) -> Result<usize, String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let removed = {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let before = u.vault.entries.len();
        u.vault.entries.retain(|e| !e.trashed);
        before - u.vault.entries.len()
    };
    persist(&app)?;
    Ok(removed)
}

/// Toggle the favorite (starred) flag.
#[tauri::command]
pub fn toggle_favorite(state: State<'_, Mutex<AppState>>, id: String) -> Result<bool, String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let uuid = parse_id(&id)?;
    let fav = {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.favorite = !e.favorite;
        e.favorite
    };
    persist(&app)?;
    Ok(fav)
}

#[tauri::command]
pub fn generate_password(
    length: usize, lower: bool, upper: bool, digits: bool, symbols: bool, exclude_ambiguous: bool,
) -> Result<String, String> {
    let opts = GenOptions { length, lower, upper, digits, symbols, exclude_ambiguous };
    generator::generate(&opts).map_err(|_| "invalid options".to_string())
}

#[tauri::command]
pub fn password_entropy(
    length: usize, lower: bool, upper: bool, digits: bool, symbols: bool, exclude_ambiguous: bool,
) -> f64 {
    let opts = GenOptions { length, lower, upper, digits, symbols, exclude_ambiguous };
    generator::entropy_bits(&opts)
}

#[tauri::command]
pub fn totp_now(secret: String) -> Result<String, String> {
    totp::current_code(&secret)
}

// ---------------------------------------------------------------------------
// Task 8: clipboard auto-clear + auto-lock + settings + activity
// ---------------------------------------------------------------------------

use tauri::AppHandle;
use tauri_plugin_clipboard_manager::ClipboardExt;
// `Settings` is already imported at the top of this module (Task 6).

#[tauri::command]
pub fn copy_secret_to_clipboard(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    id: String,
) -> Result<(), String> {
    let (secret, clear_after) = {
        let app = state.lock().map_err(|_| "state poisoned".to_string())?;
        let u = app.session.unlocked.as_ref().ok_or("locked")?;
        let uuid = parse_id(&id)?;
        let e = u.vault.get(uuid).ok_or("not found")?;
        (e.password.clone(), u.settings.clipboard_clear_secs)
    };

    app_handle.clipboard().write_text(secret.clone()).map_err(|e| e.to_string())?;

    let handle = app_handle.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(clear_after));
        // only clear if the clipboard still holds OUR secret (don't stomp later copies)
        if let Ok(current) = handle.clipboard().read_text() {
            if current == secret {
                let _ = handle.clipboard().write_text(String::new());
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub fn touch_activity(state: State<'_, Mutex<AppState>>) {
    if let Ok(mut app) = state.lock() {
        let now = now_secs();
        app.session.touch(now);
    }
}

#[tauri::command]
pub fn check_autolock(state: State<'_, Mutex<AppState>>) -> bool {
    let mut app = match state.lock() { Ok(a) => a, Err(_) => return true };
    if app.session.is_expired(now_secs()) {
        app.session.lock();
    }
    app.session.is_locked()
}

#[tauri::command]
pub fn get_settings(state: State<'_, Mutex<AppState>>) -> Result<Settings, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    Ok(u.settings.clone())
}

#[tauri::command]
pub fn set_settings(
    state: State<'_, Mutex<AppState>>,
    autolock_secs: u64,
    clipboard_clear_secs: u64,
) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_mut().ok_or("locked")?;
    u.settings = Settings { autolock_secs, clipboard_clear_secs };
    Ok(())
}

// ---------------------------------------------------------------------------
// Task 9: import/export + remember-device
// ---------------------------------------------------------------------------

use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use filaxy_vault_core::import::{self, csv as csv_in, xlsx as xlsx_in, presets, ColumnMapping};
use crate::keychain;

#[derive(Serialize)]
pub struct ImportPreview {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub detected_preset: Option<String>,
}

#[derive(Deserialize)]
pub struct MappingArg {
    pub title: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
}

fn read_table(file_path: &str) -> Result<(Vec<String>, Vec<Vec<String>>), String> {
    let bytes = std::fs::read(file_path).map_err(|e| e.to_string())?;
    if file_path.to_lowercase().ends_with(".xlsx") {
        xlsx_in::read(&bytes).map_err(|e| format!("{e:?}"))
    } else {
        csv_in::read(&bytes).map_err(|e| format!("{e:?}"))
    }
}

#[tauri::command]
pub fn import_preview(file_path: String) -> Result<ImportPreview, String> {
    let (headers, rows) = read_table(&file_path)?;
    let detected_preset = presets::detect(&headers).map(|p| format!("{p:?}"));
    Ok(ImportPreview { headers, rows, detected_preset })
}

#[tauri::command]
pub fn import_commit(
    state: State<'_, Mutex<AppState>>,
    file_path: String,
    map: MappingArg,
) -> Result<usize, String> {
    let (headers, rows) = read_table(&file_path)?;
    let mapping = ColumnMapping {
        title: map.title, username: map.username, password: map.password, url: map.url, notes: map.notes,
    };
    let now = now_secs() as i64;
    let entries = import::rows_to_entries(&headers, &rows, &mapping, now);
    let count = entries.len();
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        for e in entries { u.vault.add(e); }
    }
    persist(&app)?;
    Ok(count)
}

#[tauri::command]
pub fn export_backup(state: State<'_, Mutex<AppState>>, dest_path: String) -> Result<(), String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let kf: Option<&[u8]> = u.keyfile.as_ref().map(|z| z.as_slice());
    store::save(&PathBuf::from(dest_path), &u.vault, &u.password, kf, u.params)
        .map_err(|_| "cannot export".to_string())
}

#[tauri::command]
pub fn remember_on_device(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let path = app.vault_path.as_ref().ok_or("no vault path")?.to_string_lossy().to_string();
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let key_b64 = STANDARD.encode(u.password.as_slice());
    keychain::remember(&path, &key_b64)
}

#[tauri::command]
pub fn forget_device(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let path = app.vault_path.as_ref().ok_or("no vault path")?.to_string_lossy().to_string();
    keychain::forget(&path)
}

#[tauri::command]
pub fn unlock_with_device(state: State<'_, Mutex<AppState>>, path: String) -> Result<(), String> {
    let recalled = keychain::recall(&path)?.ok_or("no device key")?;
    let pw_bytes = STANDARD.decode(recalled).map_err(|_| "bad device key".to_string())?;
    let p = PathBuf::from(&path);
    let vault = store::load(&p, &pw_bytes, None).map_err(|_| "cannot open vault".to_string())?;
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let unlocked = Unlocked {
        vault,
        password: Zeroizing::new(pw_bytes),
        keyfile: None,
        params: KdfParams::default(),
        settings: Settings::default(),
    };
    app.session.set_unlocked(unlocked, now_secs());
    app.vault_path = Some(p);
    Ok(())
}

// ── Seed-phrase (crypto wallet) entries ──────────────────────────────────────
use filaxy_vault_core::vault::model::SeedData;

fn clean_words(words: Vec<String>) -> Vec<String> {
    words.into_iter().map(|w| w.trim().to_lowercase()).collect()
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn add_seed_entry(
    state: State<'_, Mutex<AppState>>,
    title: String,
    network: String,
    words: Vec<String>,
    derivation_path: String,
    passphrase: String,
    notes: String,
    tags: Vec<String>,
) -> Result<String, String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let id = {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let seed = SeedData { words: clean_words(words), network, derivation_path, passphrase };
        let mut e = Entry::new_seed(title, seed, now);
        e.notes = notes;
        e.tags = tags;
        let id = e.id.to_string();
        u.vault.add(e);
        id
    };
    persist(&app)?;
    Ok(id)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_seed_entry(
    state: State<'_, Mutex<AppState>>,
    id: String,
    title: String,
    network: String,
    words: Vec<String>,
    derivation_path: String,
    passphrase: String,
    notes: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.title = title;
        e.notes = notes;
        e.tags = tags;
        e.seed = Some(SeedData { words: clean_words(words), network, derivation_path, passphrase });
        e.updated_at = now;
    }
    persist(&app)
}

#[tauri::command]
pub fn get_seed_secret(state: State<'_, Mutex<AppState>>, id: String) -> Result<dto::SeedSecret, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let uuid = parse_id(&id)?;
    let e = u.vault.get(uuid).ok_or("not found")?;
    let seed = e.seed.as_ref().ok_or("not a seed entry")?;
    Ok(dto::SeedSecret {
        words: seed.words.clone(),
        network: seed.network.clone(),
        derivation_path: seed.derivation_path.clone(),
        passphrase: seed.passphrase.clone(),
        notes: e.notes.clone(),
    })
}

// ── Authenticator / 2FA (TOTP) entries ───────────────────────────────────────

fn normalize_secret(secret: &str) -> String {
    secret.replace(' ', "").to_uppercase()
}

#[tauri::command]
pub fn add_totp_entry(
    state: State<'_, Mutex<AppState>>,
    issuer: String,
    account: String,
    secret: String,
    tags: Vec<String>,
) -> Result<String, String> {
    let secret = normalize_secret(&secret);
    // reject invalid base32 secrets up front
    totp::current_code(&secret).map_err(|_| "invalid 2FA key".to_string())?;
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let id = {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let mut e = Entry::new_totp(issuer, account, secret, now);
        e.tags = tags;
        let id = e.id.to_string();
        u.vault.add(e);
        id
    };
    persist(&app)?;
    Ok(id)
}

#[tauri::command]
pub fn update_totp_entry(
    state: State<'_, Mutex<AppState>>,
    id: String,
    issuer: String,
    account: String,
    secret: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let secret = normalize_secret(&secret);
    totp::current_code(&secret).map_err(|_| "invalid 2FA key".to_string())?;
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let uuid = parse_id(&id)?;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        let e = u.vault.get_mut(uuid).ok_or("not found")?;
        e.title = issuer;
        e.username = account;
        e.totp_secret = Some(secret);
        e.tags = tags;
        e.updated_at = now;
    }
    persist(&app)
}

/// Returns the raw 2FA secret (for backup / editing). Sensitive.
#[tauri::command]
pub fn get_totp_secret(state: State<'_, Mutex<AppState>>, id: String) -> Result<String, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let uuid = parse_id(&id)?;
    let e = u.vault.get(uuid).ok_or("not found")?;
    e.totp_secret.clone().ok_or_else(|| "no 2FA key".to_string())
}

/// Generates the current 6-digit code for a stored 2FA entry.
#[tauri::command]
pub fn totp_code_for(state: State<'_, Mutex<AppState>>, id: String) -> Result<String, String> {
    let app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let u = app.session.unlocked.as_ref().ok_or("locked")?;
    let uuid = parse_id(&id)?;
    let e = u.vault.get(uuid).ok_or("not found")?;
    let secret = e.totp_secret.as_ref().ok_or("no 2FA key")?;
    let algo = e.totp_algo.clone().unwrap_or_else(|| "SHA1".to_string());
    let digits = e.totp_digits.unwrap_or(6) as usize;
    let period = e.totp_period.unwrap_or(30) as u64;
    totp::current_code_with(secret, &algo, digits, period).map_err(|_| "invalid 2FA key".to_string())
}

/// Import all accounts from a Google Authenticator export URI
/// (otpauth-migration://...). Creates one TOTP entry per account. Returns count.
#[tauri::command]
pub fn import_google_authenticator(state: State<'_, Mutex<AppState>>, uri: String) -> Result<usize, String> {
    use filaxy_vault_core::import::google_auth;
    let accounts = google_auth::parse_migration_uri(&uri).map_err(|_| "not a valid Google Authenticator export".to_string())?;
    let mut app = state.lock().map_err(|_| "state poisoned".to_string())?;
    let now = now_secs() as i64;
    let mut count = 0usize;
    {
        let u = app.session.unlocked.as_mut().ok_or("locked")?;
        for a in accounts {
            if a.secret_base32.is_empty() { continue; }
            // validate with the account's OWN algorithm/digits; skip silently if invalid
            if totp::current_code_with(&a.secret_base32, &a.algorithm, a.digits as usize, 30).is_err() { continue; }
            let mut e = Entry::new_totp(a.issuer, a.account, a.secret_base32, now);
            e.totp_algo = Some(a.algorithm);
            e.totp_digits = Some(a.digits);
            e.totp_period = Some(30);
            u.vault.add(e);
            count += 1;
        }
    }
    persist(&app)?;
    Ok(count)
}
