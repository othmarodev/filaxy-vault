use keyring::Entry as KeyringEntry;

const SERVICE: &str = "app.filaxy.vault";

fn entry(path_key: &str) -> Result<KeyringEntry, String> {
    KeyringEntry::new(SERVICE, path_key).map_err(|e| e.to_string())
}

pub fn remember(path_key: &str, key_b64: &str) -> Result<(), String> {
    entry(path_key)?.set_password(key_b64).map_err(|e| e.to_string())
}

pub fn recall(path_key: &str) -> Result<Option<String>, String> {
    match entry(path_key)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn forget(path_key: &str) -> Result<(), String> {
    match entry(path_key)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
