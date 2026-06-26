use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct EntryVersion {
    pub password: String,
    pub edited_at: i64,
}

/// What kind of secret an entry holds. `Login` is the default so vaults written
/// before this field existed deserialize correctly.
#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Debug, Default)]
#[serde(rename_all = "snake_case")]
pub enum EntryKind {
    #[default]
    Login,
    Seed,
    /// Standalone 2FA / authenticator account (TOTP). Secret lives in `totp_secret`,
    /// `title` is the issuer, `username` is the account.
    Totp,
}

/// Crypto-wallet recovery phrase payload (BIP39). The words are secrets and are
/// encrypted with the rest of the vault.
#[derive(Clone, Serialize, Deserialize, PartialEq, Debug, Default)]
pub struct SeedData {
    pub words: Vec<String>,
    pub network: String,
    pub derivation_path: String,
    pub passphrase: String,
}

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct Entry {
    pub id: Uuid,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub tags: Vec<String>,
    pub totp_secret: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub history: Vec<EntryVersion>,
    /// Discriminator + optional seed payload. `#[serde(default)]` keeps old
    /// vault files (without these fields) loadable.
    #[serde(default)]
    pub kind: EntryKind,
    #[serde(default)]
    pub seed: Option<SeedData>,
    /// TOTP parameters (for 2FA entries / entries with a TOTP secret).
    /// `None` means the default ("SHA1" / 6 digits / 30s). Kept optional +
    /// `#[serde(default)]` for backward compatibility with older vaults.
    #[serde(default)]
    pub totp_algo: Option<String>,
    #[serde(default)]
    pub totp_digits: Option<u32>,
    #[serde(default)]
    pub totp_period: Option<u32>,
}

impl Entry {
    pub fn new(title: impl Into<String>) -> Self {
        Entry {
            id: Uuid::new_v4(),
            title: title.into(),
            username: String::new(),
            password: String::new(),
            url: String::new(),
            notes: String::new(),
            tags: Vec::new(),
            totp_secret: None,
            created_at: 0,
            updated_at: 0,
            history: Vec::new(),
            kind: EntryKind::Login,
            seed: None,
            totp_algo: None,
            totp_digits: None,
            totp_period: None,
        }
    }

    /// Create a new seed-phrase (crypto wallet) entry.
    pub fn new_seed(title: impl Into<String>, seed: SeedData, now: i64) -> Self {
        let mut e = Entry::new(title);
        e.kind = EntryKind::Seed;
        e.seed = Some(seed);
        e.created_at = now;
        e.updated_at = now;
        e
    }

    /// Create a new standalone 2FA / authenticator (TOTP) entry.
    pub fn new_totp(issuer: impl Into<String>, account: impl Into<String>, secret: impl Into<String>, now: i64) -> Self {
        let mut e = Entry::new(issuer);
        e.kind = EntryKind::Totp;
        e.username = account.into();
        e.totp_secret = Some(secret.into());
        e.created_at = now;
        e.updated_at = now;
        e
    }

    /// Replace the password, archiving the previous non-empty one in history.
    pub fn set_password(&mut self, new_pw: impl Into<String>, now: i64) {
        if !self.password.is_empty() {
            self.history.push(EntryVersion { password: self.password.clone(), edited_at: now });
        }
        self.password = new_pw.into();
        self.updated_at = now;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_entry_has_unique_id_and_empty_history() {
        let a = Entry::new("Gmail");
        let b = Entry::new("Gmail");
        assert_ne!(a.id, b.id);
        assert!(a.history.is_empty());
    }

    #[test]
    fn first_password_set_does_not_create_history() {
        let mut e = Entry::new("Gmail");
        e.set_password("hunter2", 100);
        assert_eq!(e.password, "hunter2");
        assert!(e.history.is_empty());
        assert_eq!(e.updated_at, 100);
    }

    #[test]
    fn changing_password_archives_previous() {
        let mut e = Entry::new("Gmail");
        e.set_password("old", 100);
        e.set_password("new", 200);
        assert_eq!(e.password, "new");
        assert_eq!(e.history.len(), 1);
        assert_eq!(e.history[0].password, "old");
        assert_eq!(e.history[0].edited_at, 200);
    }

    #[test]
    fn default_entry_is_login_kind() {
        assert_eq!(Entry::new("x").kind, EntryKind::Login);
        assert!(Entry::new("x").seed.is_none());
    }

    #[test]
    fn new_totp_entry_holds_secret() {
        let e = Entry::new_totp("GitHub", "me@x.com", "JBSWY3DPEHPK3PXP", 7);
        assert_eq!(e.kind, EntryKind::Totp);
        assert_eq!(e.title, "GitHub");
        assert_eq!(e.username, "me@x.com");
        assert_eq!(e.totp_secret.as_deref(), Some("JBSWY3DPEHPK3PXP"));
    }

    #[test]
    fn new_seed_entry_holds_words() {
        let seed = SeedData {
            words: vec!["abandon".into(), "ability".into(), "able".into()],
            network: "Bitcoin".into(),
            derivation_path: "m/84'/0'/0'".into(),
            passphrase: String::new(),
        };
        let e = Entry::new_seed("Ledger main", seed, 42);
        assert_eq!(e.kind, EntryKind::Seed);
        assert_eq!(e.created_at, 42);
        let s = e.seed.unwrap();
        assert_eq!(s.words.len(), 3);
        assert_eq!(s.network, "Bitcoin");
    }
}
