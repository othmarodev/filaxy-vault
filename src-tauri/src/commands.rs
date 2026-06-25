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
