# Filaxy Vault — Núcleo (`core`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `filaxy-vault-core` Rust crate — a UI-agnostic, fully auditable engine that creates/opens encrypted vaults, manages entries, generates passwords, and imports from CSV/XLSX.

**Architecture:** A pure Rust library (no Tauri, no UI deps). Crypto primitives (Argon2id KDF, XChaCha20-Poly1305 AEAD, HKDF key-file combine) sit under a `crypto` module. A `vault` module owns the data model, the `.fvault` on-disk format (header authenticated as AAD), and a high-level store API. A `generator` module produces passwords with entropy scoring. An `import` module parses CSV/XLSX into entries with column mapping and known-tool presets.

**Tech Stack:** Rust 2021, `argon2`, `chacha20poly1305`, `hkdf`, `sha2`, `getrandom`, `zeroize`, `subtle`, `uuid`, `serde` + `ciborium` (CBOR), `csv`, `calamine`, `thiserror`, `time`; `proptest` + `hex` for tests.

## Global Constraints

- **Clean-room:** no KeePassXC (GPL) code; no KDBX format. Own format `.fvault`.
- **No network, no telemetry:** the `core` crate MUST NOT depend on any HTTP/network crate.
- **No cloud, no hardware:** engine is fully local; nothing requires a purchase.
- **Cipher:** XChaCha20-Poly1305 (24-byte nonce). **KDF:** Argon2id, default 64 MiB / time_cost 3 / parallelism 4.
- **Secret hygiene:** all derived keys wrapped in `zeroize::Zeroizing`; constant-time compares via `subtle` where comparing secrets.
- **Generic errors on open:** wrong password, wrong key file, and tampered file all return the SAME error (`VaultError::CannotOpen`) — never leak which factor failed.
- **Key file & TOTP are OPTIONAL.** Entry history is INCLUDED.
- **Import is on-device only.** Import Fase 1 presets: Chrome, LastPass, Bitwarden, 1Password, KeePass.

---

## File Structure

```
filaxy-vault/
├─ Cargo.toml                 # workspace
└─ core/
   ├─ Cargo.toml
   ├─ src/
   │  ├─ lib.rs               # public re-exports
   │  ├─ error.rs             # VaultError + Result
   │  ├─ crypto/
   │  │  ├─ mod.rs
   │  │  ├─ kdf.rs            # Argon2id derive_key + KdfParams
   │  │  ├─ cipher.rs         # XChaCha20-Poly1305 encrypt/decrypt
   │  │  ├─ keyfile.rs        # HKDF combine of derived key + key file
   │  │  └─ random.rs         # OS CSPRNG helpers (salt/nonce)
   │  ├─ vault/
   │  │  ├─ mod.rs            # Vault struct + CRUD + search
   │  │  ├─ model.rs          # Entry, EntryVersion
   │  │  ├─ format.rs         # .fvault seal/open (header as AAD, tamper-proof)
   │  │  └─ store.rs          # create/open/save/change-password API
   │  ├─ generator.rs         # password generator + entropy
   │  └─ import/
   │     ├─ mod.rs            # ColumnMapping, ImportedRow, to_entries
   │     ├─ csv.rs            # CSV reader
   │     ├─ xlsx.rs           # XLSX reader (calamine)
   │     └─ presets.rs        # Chrome/LastPass/Bitwarden/1Password/KeePass header maps
   └─ tests/
      └─ integration.rs       # end-to-end create→save→open→edit
```

---

### Task 1: Workspace + crate scaffolding

**Files:**
- Create: `Cargo.toml` (workspace root)
- Create: `core/Cargo.toml`
- Create: `core/src/lib.rs`
- Create: `core/src/error.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: crate `filaxy-vault-core`; `error::VaultError`, `error::Result<T>`.

- [ ] **Step 1: Write the workspace manifest**

`Cargo.toml`:
```toml
[workspace]
members = ["core"]
resolver = "2"
```

- [ ] **Step 2: Write the crate manifest**

`core/Cargo.toml`:
```toml
[package]
name = "filaxy-vault-core"
version = "0.1.0"
edition = "2021"
license = "MIT OR Apache-2.0"

[dependencies]
argon2 = "0.5"
chacha20poly1305 = "0.10"
hkdf = "0.12"
sha2 = "0.10"
getrandom = "0.2"
zeroize = { version = "1.8", features = ["derive"] }
subtle = "2.6"
uuid = { version = "1", features = ["v4", "serde"] }
serde = { version = "1", features = ["derive"] }
ciborium = "0.2"
csv = "1.3"
calamine = "0.26"
thiserror = "2"
time = { version = "0.3", features = ["serde"] }

[dev-dependencies]
proptest = "1"
hex = "0.4"
```

- [ ] **Step 3: Write the error type**

`core/src/error.rs`:
```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum VaultError {
    /// Generic open failure — used for wrong password, wrong key file, AND
    /// tampered/corrupt file so the caller cannot tell which factor failed.
    #[error("cannot open vault")]
    CannotOpen,
    #[error("key derivation failed")]
    Kdf,
    #[error("serialization error")]
    Serialization,
    #[error("invalid vault file")]
    BadFormat,
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("import error: {0}")]
    Import(String),
}

pub type Result<T> = std::result::Result<T, VaultError>;
```

- [ ] **Step 4: Write the lib root**

`core/src/lib.rs`:
```rust
pub mod error;
pub mod crypto;
pub mod vault;
pub mod generator;
pub mod import;

pub use error::{Result, VaultError};
```

- [ ] **Step 5: Create empty module roots so it compiles**

`core/src/crypto/mod.rs`:
```rust
pub mod kdf;
pub mod cipher;
pub mod keyfile;
pub mod random;
```
`core/src/vault/mod.rs`:
```rust
pub mod model;
pub mod format;
pub mod store;
```
`core/src/generator.rs`: `// implemented in a later task`
`core/src/import/mod.rs`:
```rust
pub mod csv;
pub mod xlsx;
pub mod presets;
```
Create empty placeholder files `core/src/crypto/{kdf,cipher,keyfile,random}.rs`, `core/src/vault/{model,format,store}.rs`, `core/src/import/{csv,xlsx,presets}.rs` each containing `// implemented in a later task`.

- [ ] **Step 6: Verify it builds**

Run: `cargo build`
Expected: compiles (warnings about unused modules are fine).

- [ ] **Step 7: Commit**

```bash
git add Cargo.toml core/
git commit -m "chore: scaffold filaxy-vault-core crate + error type"
```

---

### Task 2: OS CSPRNG helpers

**Files:**
- Modify: `core/src/crypto/random.rs`
- Test: in-file `#[cfg(test)]`

**Interfaces:**
- Consumes: nothing.
- Produces: `crypto::random::fill(buf: &mut [u8]) -> Result<()>`, `random::salt16() -> Result<[u8;16]>`, `random::nonce24() -> Result<[u8;24]>`.

- [ ] **Step 1: Write the failing test**

`core/src/crypto/random.rs`:
```rust
use crate::error::{Result, VaultError};

pub fn fill(buf: &mut [u8]) -> Result<()> {
    getrandom::getrandom(buf).map_err(|_| VaultError::Kdf)
}

pub fn salt16() -> Result<[u8; 16]> {
    let mut b = [0u8; 16];
    fill(&mut b)?;
    Ok(b)
}

pub fn nonce24() -> Result<[u8; 24]> {
    let mut b = [0u8; 24];
    fill(&mut b)?;
    Ok(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn salts_are_not_all_zero_and_differ() {
        let a = salt16().unwrap();
        let b = salt16().unwrap();
        assert_ne!(a, [0u8; 16]);
        assert_ne!(a, b);
    }

    #[test]
    fn nonces_differ() {
        assert_ne!(nonce24().unwrap(), nonce24().unwrap());
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core random`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/crypto/random.rs
git commit -m "feat(crypto): OS CSPRNG helpers for salt and nonce"
```

---

### Task 3: Argon2id key derivation

**Files:**
- Modify: `core/src/crypto/kdf.rs`

**Interfaces:**
- Consumes: `error::{Result, VaultError}`.
- Produces: `crypto::kdf::KEY_LEN: usize = 32`; `kdf::KdfParams { mem_kib: u32, time_cost: u32, parallelism: u32 }` (Default = 65536/3/4, derives `Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Debug`); `kdf::derive_key(password: &[u8], salt: &[u8], params: &KdfParams) -> Result<Zeroizing<[u8; KEY_LEN]>>`.

- [ ] **Step 1: Write the failing test**

`core/src/crypto/kdf.rs`:
```rust
use argon2::{Algorithm, Argon2, Params, Version};
use zeroize::Zeroizing;
use crate::error::{Result, VaultError};

pub const KEY_LEN: usize = 32;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct KdfParams {
    pub mem_kib: u32,
    pub time_cost: u32,
    pub parallelism: u32,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self { mem_kib: 64 * 1024, time_cost: 3, parallelism: 4 }
    }
}

pub fn derive_key(
    password: &[u8],
    salt: &[u8],
    params: &KdfParams,
) -> Result<Zeroizing<[u8; KEY_LEN]>> {
    let argon = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(params.mem_kib, params.time_cost, params.parallelism, Some(KEY_LEN))
            .map_err(|_| VaultError::Kdf)?,
    );
    let mut out = Zeroizing::new([0u8; KEY_LEN]);
    argon
        .hash_password_into(password, salt, out.as_mut_slice())
        .map_err(|_| VaultError::Kdf)?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Fast params keep the test suite quick; production uses Default.
    fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

    #[test]
    fn deterministic_for_same_inputs() {
        let salt = [7u8; 16];
        let a = derive_key(b"correct horse", &salt, &fast()).unwrap();
        let b = derive_key(b"correct horse", &salt, &fast()).unwrap();
        assert_eq!(*a, *b);
    }

    #[test]
    fn different_salt_changes_key() {
        let a = derive_key(b"pw", &[1u8; 16], &fast()).unwrap();
        let b = derive_key(b"pw", &[2u8; 16], &fast()).unwrap();
        assert_ne!(*a, *b);
    }

    #[test]
    fn different_password_changes_key() {
        let salt = [9u8; 16];
        let a = derive_key(b"pw-one", &salt, &fast()).unwrap();
        let b = derive_key(b"pw-two", &salt, &fast()).unwrap();
        assert_ne!(*a, *b);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core kdf`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/crypto/kdf.rs
git commit -m "feat(crypto): Argon2id key derivation with KdfParams"
```

---

### Task 4: XChaCha20-Poly1305 AEAD

**Files:**
- Modify: `core/src/crypto/cipher.rs`

**Interfaces:**
- Consumes: `error::{Result, VaultError}`.
- Produces: `crypto::cipher::NONCE_LEN: usize = 24`; `cipher::encrypt(key: &[u8;32], nonce: &[u8;24], plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>>`; `cipher::decrypt(key: &[u8;32], nonce: &[u8;24], ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>>`. Any decrypt failure → `VaultError::CannotOpen`.

- [ ] **Step 1: Write the failing test**

`core/src/crypto/cipher.rs`:
```rust
use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    XChaCha20Poly1305, XNonce,
};
use crate::error::{Result, VaultError};

pub const NONCE_LEN: usize = 24;

pub fn encrypt(key: &[u8; 32], nonce: &[u8; NONCE_LEN], plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new(key.into());
    cipher
        .encrypt(XNonce::from_slice(nonce), Payload { msg: plaintext, aad })
        .map_err(|_| VaultError::CannotOpen)
}

pub fn decrypt(key: &[u8; 32], nonce: &[u8; NONCE_LEN], ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
    let cipher = XChaCha20Poly1305::new(key.into());
    cipher
        .decrypt(XNonce::from_slice(nonce), Payload { msg: ciphertext, aad })
        .map_err(|_| VaultError::CannotOpen)
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; 32] = [3u8; 32];
    const NONCE: [u8; NONCE_LEN] = [5u8; NONCE_LEN];

    #[test]
    fn round_trip() {
        let ct = encrypt(&KEY, &NONCE, b"secret data", b"header").unwrap();
        let pt = decrypt(&KEY, &NONCE, &ct, b"header").unwrap();
        assert_eq!(pt, b"secret data");
    }

    #[test]
    fn tampered_ciphertext_fails() {
        let mut ct = encrypt(&KEY, &NONCE, b"secret data", b"header").unwrap();
        ct[0] ^= 0xFF;
        assert!(matches!(decrypt(&KEY, &NONCE, &ct, b"header"), Err(VaultError::CannotOpen)));
    }

    #[test]
    fn tampered_aad_fails() {
        let ct = encrypt(&KEY, &NONCE, b"secret data", b"header").unwrap();
        assert!(matches!(decrypt(&KEY, &NONCE, &ct, b"HEADER"), Err(VaultError::CannotOpen)));
    }

    #[test]
    fn wrong_key_fails() {
        let ct = encrypt(&KEY, &NONCE, b"secret data", b"header").unwrap();
        assert!(matches!(decrypt(&[9u8; 32], &NONCE, &ct, b"header"), Err(VaultError::CannotOpen)));
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core cipher`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/crypto/cipher.rs
git commit -m "feat(crypto): XChaCha20-Poly1305 AEAD with AAD + tamper tests"
```

---

### Task 5: Key file combine (HKDF-SHA256)

**Files:**
- Modify: `core/src/crypto/keyfile.rs`

**Interfaces:**
- Consumes: `crypto::kdf::KEY_LEN`.
- Produces: `crypto::keyfile::combine_key(derived: &[u8; 32], keyfile: Option<&[u8]>) -> Zeroizing<[u8; 32]>`.

- [ ] **Step 1: Write the failing test**

`core/src/crypto/keyfile.rs`:
```rust
use hkdf::Hkdf;
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;
use crate::crypto::kdf::KEY_LEN;

/// Combine the password-derived key with an optional key file.
/// No key file -> returns the derived key unchanged.
/// With a key file -> HKDF-SHA256(salt = SHA256(keyfile), ikm = derived).
pub fn combine_key(derived: &[u8; KEY_LEN], keyfile: Option<&[u8]>) -> Zeroizing<[u8; KEY_LEN]> {
    match keyfile {
        None => Zeroizing::new(*derived),
        Some(kf) => {
            let kf_hash = Sha256::digest(kf);
            let hk = Hkdf::<Sha256>::new(Some(&kf_hash), derived);
            let mut out = Zeroizing::new([0u8; KEY_LEN]);
            hk.expand(b"filaxy-vault-keyfile-v1", out.as_mut_slice())
                .expect("KEY_LEN is a valid HKDF output length");
            out
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_keyfile_is_identity() {
        let derived = [4u8; KEY_LEN];
        assert_eq!(*combine_key(&derived, None), derived);
    }

    #[test]
    fn keyfile_changes_key_deterministically() {
        let derived = [4u8; KEY_LEN];
        let a = combine_key(&derived, Some(b"my-key-file-bytes"));
        let b = combine_key(&derived, Some(b"my-key-file-bytes"));
        assert_eq!(*a, *b);
        assert_ne!(*a, derived);
    }

    #[test]
    fn different_keyfile_changes_key() {
        let derived = [4u8; KEY_LEN];
        let a = combine_key(&derived, Some(b"file-a"));
        let b = combine_key(&derived, Some(b"file-b"));
        assert_ne!(*a, *b);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core keyfile`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/crypto/keyfile.rs
git commit -m "feat(crypto): optional key file combine via HKDF-SHA256"
```

---

### Task 6: Entry data model

**Files:**
- Modify: `core/src/vault/model.rs`

**Interfaces:**
- Consumes: nothing.
- Produces: `vault::model::EntryVersion { password: String, edited_at: i64 }`; `vault::model::Entry` with fields `id: Uuid, title, username, password, url, notes: String, tags: Vec<String>, totp_secret: Option<String>, created_at: i64, updated_at: i64, history: Vec<EntryVersion>`; `Entry::new(title: impl Into<String>) -> Entry`; `Entry::set_password(&mut self, new_pw: impl Into<String>, now: i64)` which pushes the OLD password into `history` (skipping the initial empty value) and updates `updated_at`. Both derive `Serialize, Deserialize, Clone, PartialEq, Debug`.

- [ ] **Step 1: Write the failing test**

`core/src/vault/model.rs`:
```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct EntryVersion {
    pub password: String,
    pub edited_at: i64,
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
        }
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
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core model`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/vault/model.rs
git commit -m "feat(vault): Entry model with password history"
```

---

### Task 7: Vault container (CRUD + search)

**Files:**
- Modify: `core/src/vault/mod.rs`

**Interfaces:**
- Consumes: `vault::model::Entry`.
- Produces: `vault::Vault { entries: Vec<Entry> }` (`Serialize, Deserialize, Clone, PartialEq, Debug, Default`); methods `add(&mut self, e: Entry)`, `remove(&mut self, id: Uuid) -> bool`, `get(&self, id: Uuid) -> Option<&Entry>`, `get_mut(&mut self, id: Uuid) -> Option<&mut Entry>`, `search(&self, q: &str) -> Vec<&Entry>` (case-insensitive over title/username/url/tags).

- [ ] **Step 1: Write the failing test**

Replace the `pub mod` lines at the TOP of `core/src/vault/mod.rs` are kept; append below them:
```rust
pub mod model;
pub mod format;
pub mod store;

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use model::Entry;

#[derive(Clone, Serialize, Deserialize, PartialEq, Debug, Default)]
pub struct Vault {
    pub entries: Vec<Entry>,
}

impl Vault {
    pub fn add(&mut self, e: Entry) {
        self.entries.push(e);
    }

    pub fn remove(&mut self, id: Uuid) -> bool {
        let before = self.entries.len();
        self.entries.retain(|e| e.id != id);
        self.entries.len() != before
    }

    pub fn get(&self, id: Uuid) -> Option<&Entry> {
        self.entries.iter().find(|e| e.id == id)
    }

    pub fn get_mut(&mut self, id: Uuid) -> Option<&mut Entry> {
        self.entries.iter_mut().find(|e| e.id == id)
    }

    pub fn search(&self, q: &str) -> Vec<&Entry> {
        let q = q.to_lowercase();
        if q.is_empty() {
            return self.entries.iter().collect();
        }
        self.entries
            .iter()
            .filter(|e| {
                e.title.to_lowercase().contains(&q)
                    || e.username.to_lowercase().contains(&q)
                    || e.url.to_lowercase().contains(&q)
                    || e.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_get_remove() {
        let mut v = Vault::default();
        let e = Entry::new("Gmail");
        let id = e.id;
        v.add(e);
        assert!(v.get(id).is_some());
        assert!(v.remove(id));
        assert!(v.get(id).is_none());
        assert!(!v.remove(id));
    }

    #[test]
    fn search_is_case_insensitive_over_fields() {
        let mut v = Vault::default();
        let mut e = Entry::new("GitHub");
        e.username = "othmaro".into();
        e.url = "https://github.com".into();
        e.tags = vec!["dev".into()];
        v.add(e);
        assert_eq!(v.search("github").len(), 1);
        assert_eq!(v.search("OTHMARO").len(), 1);
        assert_eq!(v.search("dev").len(), 1);
        assert_eq!(v.search("nope").len(), 0);
        assert_eq!(v.search("").len(), 1);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core vault::tests`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/vault/mod.rs
git commit -m "feat(vault): Vault container with CRUD and search"
```

---

### Task 8: `.fvault` file format (seal/open, tamper-proof)

**Files:**
- Modify: `core/src/vault/format.rs`

**Interfaces:**
- Consumes: `crypto::{kdf, cipher, keyfile, random}`, `vault::Vault`, `error`.
- Produces: `vault::format::seal(vault: &Vault, password: &[u8], keyfile: Option<&[u8]>, params: KdfParams) -> Result<Vec<u8>>`; `vault::format::open(bytes: &[u8], password: &[u8], keyfile: Option<&[u8]>) -> Result<Vault>`. File layout: `MAGIC(8) | version(u16 LE) | header_len(u32 LE) | header(CBOR) | ciphertext`. AAD = `MAGIC || version_le || header_bytes`. Header CBOR struct carries `KdfParams`, `salt[16]`, `nonce[24]`.

- [ ] **Step 1: Write the failing test**

`core/src/vault/format.rs`:
```rust
use serde::{Deserialize, Serialize};
use crate::crypto::cipher::{self, NONCE_LEN};
use crate::crypto::kdf::{self, KdfParams};
use crate::crypto::keyfile::combine_key;
use crate::crypto::random;
use crate::error::{Result, VaultError};
use crate::vault::Vault;

const MAGIC: &[u8; 8] = b"FILAXYV1";
const VERSION: u16 = 1;

#[derive(Serialize, Deserialize)]
struct Header {
    kdf: KdfParams,
    salt: [u8; 16],
    nonce: [u8; NONCE_LEN],
}

fn aad(header_bytes: &[u8]) -> Vec<u8> {
    let mut a = Vec::with_capacity(8 + 2 + header_bytes.len());
    a.extend_from_slice(MAGIC);
    a.extend_from_slice(&VERSION.to_le_bytes());
    a.extend_from_slice(header_bytes);
    a
}

pub fn seal(vault: &Vault, password: &[u8], keyfile: Option<&[u8]>, params: KdfParams) -> Result<Vec<u8>> {
    let salt = random::salt16()?;
    let nonce = random::nonce24()?;

    let derived = kdf::derive_key(password, &salt, &params)?;
    let key = combine_key(&derived, keyfile);

    let header = Header { kdf: params, salt, nonce };
    let mut header_bytes = Vec::new();
    ciborium::into_writer(&header, &mut header_bytes).map_err(|_| VaultError::Serialization)?;

    let mut plaintext = Vec::new();
    ciborium::into_writer(vault, &mut plaintext).map_err(|_| VaultError::Serialization)?;

    let ciphertext = cipher::encrypt(&key, &nonce, &plaintext, &aad(&header_bytes))?;

    let mut out = Vec::new();
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&VERSION.to_le_bytes());
    out.extend_from_slice(&(header_bytes.len() as u32).to_le_bytes());
    out.extend_from_slice(&header_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

pub fn open(bytes: &[u8], password: &[u8], keyfile: Option<&[u8]>) -> Result<Vault> {
    if bytes.len() < 14 || &bytes[0..8] != MAGIC {
        return Err(VaultError::BadFormat);
    }
    let version = u16::from_le_bytes([bytes[8], bytes[9]]);
    if version != VERSION {
        return Err(VaultError::BadFormat);
    }
    let header_len = u32::from_le_bytes([bytes[10], bytes[11], bytes[12], bytes[13]]) as usize;
    let header_start = 14;
    let header_end = header_start.checked_add(header_len).ok_or(VaultError::BadFormat)?;
    if bytes.len() < header_end {
        return Err(VaultError::BadFormat);
    }
    let header_bytes = &bytes[header_start..header_end];
    let ciphertext = &bytes[header_end..];

    let header: Header =
        ciborium::from_reader(header_bytes).map_err(|_| VaultError::BadFormat)?;

    let derived = kdf::derive_key(password, &header.salt, &header.kdf)?;
    let key = combine_key(&derived, keyfile);

    let plaintext = cipher::decrypt(&key, &header.nonce, ciphertext, &aad(header_bytes))?;
    let vault: Vault =
        ciborium::from_reader(plaintext.as_slice()).map_err(|_| VaultError::CannotOpen)?;
    Ok(vault)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::model::Entry;

    fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

    fn sample() -> Vault {
        let mut v = Vault::default();
        let mut e = Entry::new("Gmail");
        e.username = "me".into();
        e.set_password("hunter2", 1);
        v.add(e);
        v
    }

    #[test]
    fn seal_then_open_round_trips() {
        let v = sample();
        let blob = seal(&v, b"master-pw", None, fast()).unwrap();
        let opened = open(&blob, b"master-pw", None).unwrap();
        assert_eq!(opened, v);
    }

    #[test]
    fn wrong_password_returns_generic_cannot_open() {
        let blob = seal(&sample(), b"master-pw", None, fast()).unwrap();
        assert!(matches!(open(&blob, b"WRONG", None), Err(VaultError::CannotOpen)));
    }

    #[test]
    fn keyfile_required_to_open() {
        let blob = seal(&sample(), b"master-pw", Some(b"kf"), fast()).unwrap();
        assert!(matches!(open(&blob, b"master-pw", None), Err(VaultError::CannotOpen)));
        assert!(open(&blob, b"master-pw", Some(b"kf")).is_ok());
    }

    #[test]
    fn tampering_any_byte_fails_to_open() {
        let blob = seal(&sample(), b"master-pw", None, fast()).unwrap();
        // flip a byte in the header region and in the ciphertext region
        for idx in [16usize, blob.len() - 1] {
            let mut t = blob.clone();
            t[idx] ^= 0xFF;
            assert!(open(&t, b"master-pw", None).is_err(), "tamper at {idx} should fail");
        }
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core format`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/vault/format.rs
git commit -m "feat(vault): .fvault format with AAD header and tamper detection"
```

---

### Task 9: Vault store (file API + change password)

**Files:**
- Modify: `core/src/vault/store.rs`

**Interfaces:**
- Consumes: `vault::{Vault, format}`, `crypto::kdf::KdfParams`, `error`.
- Produces: `vault::store::create(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<()>` (writes an empty vault with default params); `store::save(path: &Path, vault: &Vault, password: &[u8], keyfile: Option<&[u8]>, params: KdfParams) -> Result<()>`; `store::load(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<Vault>`.

- [ ] **Step 1: Write the failing test**

`core/src/vault/store.rs`:
```rust
use std::path::Path;
use crate::crypto::kdf::KdfParams;
use crate::error::Result;
use crate::vault::{format, Vault};

pub fn save(
    path: &Path,
    vault: &Vault,
    password: &[u8],
    keyfile: Option<&[u8]>,
    params: KdfParams,
) -> Result<()> {
    let blob = format::seal(vault, password, keyfile, params)?;
    // write to a temp file then rename for atomicity
    let tmp = path.with_extension("fvault.tmp");
    std::fs::write(&tmp, &blob)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

pub fn create(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<()> {
    save(path, &Vault::default(), password, keyfile, KdfParams::default())
}

pub fn load(path: &Path, password: &[u8], keyfile: Option<&[u8]>) -> Result<Vault> {
    let bytes = std::fs::read(path)?;
    format::open(&bytes, password, keyfile)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::kdf::KdfParams;
    use crate::vault::model::Entry;

    fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

    #[test]
    fn save_and_load_round_trip() {
        let dir = std::env::temp_dir().join(format!("fv-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("v.fvault");

        let mut v = Vault::default();
        let mut e = Entry::new("Bank");
        e.set_password("s3cret", 1);
        v.add(e);

        save(&path, &v, b"pw", None, fast()).unwrap();
        let loaded = load(&path, b"pw", None).unwrap();
        assert_eq!(loaded, v);

        std::fs::remove_dir_all(&dir).ok();
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core store`
Expected: PASS (1 test).

- [ ] **Step 3: Commit**

```bash
git add core/src/vault/store.rs
git commit -m "feat(vault): store API (atomic save/load/create)"
```

---

### Task 10: Password generator + entropy

**Files:**
- Modify: `core/src/generator.rs`

**Interfaces:**
- Consumes: `crypto::random`, `error`.
- Produces: `generator::GenOptions { length: usize, lower: bool, upper: bool, digits: bool, symbols: bool, exclude_ambiguous: bool }` (Default: length 20, all true, exclude_ambiguous true); `generator::generate(opts: &GenOptions) -> Result<String>`; `generator::entropy_bits(opts: &GenOptions) -> f64`. Uniform unbiased selection via rejection sampling over the charset.

- [ ] **Step 1: Write the failing test**

`core/src/generator.rs`:
```rust
use crate::crypto::random;
use crate::error::{Result, VaultError};

const LOWER: &[u8] = b"abcdefghijklmnopqrstuvwxyz";
const UPPER: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS: &[u8] = b"0123456789";
const SYMBOLS: &[u8] = b"!@#$%^&*()-_=+[]{};:,.?";
const AMBIGUOUS: &[u8] = b"O0oIl1|S5B8";

#[derive(Clone, Debug)]
pub struct GenOptions {
    pub length: usize,
    pub lower: bool,
    pub upper: bool,
    pub digits: bool,
    pub symbols: bool,
    pub exclude_ambiguous: bool,
}

impl Default for GenOptions {
    fn default() -> Self {
        Self { length: 20, lower: true, upper: true, digits: true, symbols: true, exclude_ambiguous: true }
    }
}

fn charset(opts: &GenOptions) -> Vec<u8> {
    let mut set: Vec<u8> = Vec::new();
    if opts.lower { set.extend_from_slice(LOWER); }
    if opts.upper { set.extend_from_slice(UPPER); }
    if opts.digits { set.extend_from_slice(DIGITS); }
    if opts.symbols { set.extend_from_slice(SYMBOLS); }
    if opts.exclude_ambiguous { set.retain(|c| !AMBIGUOUS.contains(c)); }
    set
}

pub fn generate(opts: &GenOptions) -> Result<String> {
    let set = charset(opts);
    if set.is_empty() || opts.length == 0 {
        return Err(VaultError::Import("invalid generator options".into()));
    }
    let n = set.len() as u8;
    // largest multiple of n that fits in a u8, for unbiased rejection sampling
    let limit = (256u16 - (256u16 % set.len() as u16)) as u16;
    let mut out = String::with_capacity(opts.length);
    let mut buf = [0u8; 1];
    while out.len() < opts.length {
        random::fill(&mut buf)?;
        if (buf[0] as u16) < limit {
            out.push(set[(buf[0] % n) as usize] as char);
        }
    }
    Ok(out)
}

pub fn entropy_bits(opts: &GenOptions) -> f64 {
    let size = charset(opts).len();
    if size <= 1 || opts.length == 0 {
        return 0.0;
    }
    opts.length as f64 * (size as f64).log2()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_requested_length() {
        let pw = generate(&GenOptions::default()).unwrap();
        assert_eq!(pw.chars().count(), 20);
    }

    #[test]
    fn respects_charset_digits_only() {
        let opts = GenOptions { length: 40, lower: false, upper: false, digits: true, symbols: false, exclude_ambiguous: false };
        let pw = generate(&opts).unwrap();
        assert!(pw.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn excludes_ambiguous_chars() {
        let opts = GenOptions { length: 200, exclude_ambiguous: true, ..GenOptions::default() };
        let pw = generate(&opts).unwrap();
        assert!(pw.bytes().all(|b| !AMBIGUOUS.contains(&b)));
    }

    #[test]
    fn empty_charset_errors() {
        let opts = GenOptions { length: 10, lower: false, upper: false, digits: false, symbols: false, exclude_ambiguous: false };
        assert!(generate(&opts).is_err());
    }

    #[test]
    fn entropy_increases_with_length() {
        let short = GenOptions { length: 8, ..GenOptions::default() };
        let long = GenOptions { length: 32, ..GenOptions::default() };
        assert!(entropy_bits(&long) > entropy_bits(&short));
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core generator`
Expected: PASS (5 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/generator.rs
git commit -m "feat(generator): unbiased password generator with entropy scoring"
```

---

### Task 11: Import column mapping → entries

**Files:**
- Modify: `core/src/import/mod.rs`

**Interfaces:**
- Consumes: `vault::model::Entry`.
- Produces: `import::ColumnMapping { title, username, password, url, notes: Option<String> }` (each holds the source column NAME to read, or None); `import::rows_to_entries(headers: &[String], rows: &[Vec<String>], map: &ColumnMapping, now: i64) -> Vec<Entry>`. A row with an empty title falls back to its URL or username for the title; password set via `Entry::set_password`.

- [ ] **Step 1: Write the failing test**

`core/src/import/mod.rs` (keep the existing `pub mod` lines at top, append below):
```rust
pub mod csv;
pub mod xlsx;
pub mod presets;

use crate::vault::model::Entry;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct ColumnMapping {
    pub title: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
}

fn col<'a>(headers: &[String], row: &'a [String], name: &Option<String>) -> &'a str {
    match name {
        Some(n) => headers
            .iter()
            .position(|h| h.eq_ignore_ascii_case(n))
            .and_then(|i| row.get(i))
            .map(|s| s.as_str())
            .unwrap_or(""),
        None => "",
    }
}

pub fn rows_to_entries(
    headers: &[String],
    rows: &[Vec<String>],
    map: &ColumnMapping,
    now: i64,
) -> Vec<Entry> {
    rows.iter()
        .map(|row| {
            let title = col(headers, row, &map.title);
            let username = col(headers, row, &map.username);
            let password = col(headers, row, &map.password);
            let url = col(headers, row, &map.url);
            let notes = col(headers, row, &map.notes);

            let final_title = if !title.is_empty() {
                title.to_string()
            } else if !url.is_empty() {
                url.to_string()
            } else {
                username.to_string()
            };

            let mut e = Entry::new(final_title);
            e.username = username.to_string();
            e.url = url.to_string();
            e.notes = notes.to_string();
            e.created_at = now;
            if !password.is_empty() {
                e.set_password(password, now);
            } else {
                e.updated_at = now;
            }
            e
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_columns_into_entries() {
        let headers = vec!["name".to_string(), "login".into(), "secret".into(), "site".into()];
        let rows = vec![vec!["Gmail".into(), "me@x.com".into(), "pw1".into(), "gmail.com".into()]];
        let map = ColumnMapping {
            title: Some("name".into()),
            username: Some("login".into()),
            password: Some("secret".into()),
            url: Some("site".into()),
            notes: None,
        };
        let entries = rows_to_entries(&headers, &rows, &map, 50);
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].title, "Gmail");
        assert_eq!(entries[0].username, "me@x.com");
        assert_eq!(entries[0].password, "pw1");
        assert_eq!(entries[0].url, "gmail.com");
        assert_eq!(entries[0].created_at, 50);
    }

    #[test]
    fn missing_title_falls_back_to_url_then_username() {
        let headers = vec!["login".to_string(), "site".into()];
        let rows = vec![
            vec!["a@x.com".into(), "site.com".into()],
            vec!["b@x.com".into(), "".into()],
        ];
        let map = ColumnMapping { username: Some("login".into()), url: Some("site".into()), ..Default::default() };
        let entries = rows_to_entries(&headers, &rows, &map, 0);
        assert_eq!(entries[0].title, "site.com");
        assert_eq!(entries[1].title, "b@x.com");
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core import::tests`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/import/mod.rs
git commit -m "feat(import): column mapping to entries with title fallback"
```

---

### Task 12: CSV reader

**Files:**
- Modify: `core/src/import/csv.rs`

**Interfaces:**
- Consumes: `error`.
- Produces: `import::csv::read(data: &[u8]) -> Result<(Vec<String>, Vec<Vec<String>>)>` returning `(headers, rows)`. Uses the `csv` crate with headers enabled.

> Note: the module is named `csv` and also depends on the external `csv` crate. Refer to the crate as `::csv` inside this file to avoid the name clash.

- [ ] **Step 1: Write the failing test**

`core/src/import/csv.rs`:
```rust
use crate::error::{Result, VaultError};

pub fn read(data: &[u8]) -> Result<(Vec<String>, Vec<Vec<String>>)> {
    let mut rdr = ::csv::ReaderBuilder::new().has_headers(true).from_reader(data);
    let headers = rdr
        .headers()
        .map_err(|e| VaultError::Import(e.to_string()))?
        .iter()
        .map(|s| s.to_string())
        .collect();
    let mut rows = Vec::new();
    for rec in rdr.records() {
        let rec = rec.map_err(|e| VaultError::Import(e.to_string()))?;
        rows.push(rec.iter().map(|s| s.to_string()).collect());
    }
    Ok((headers, rows))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_headers_and_rows() {
        let data = b"name,login,secret\nGmail,me,pw1\nBank,you,pw2\n";
        let (headers, rows) = read(data).unwrap();
        assert_eq!(headers, vec!["name", "login", "secret"]);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0], vec!["Gmail", "me", "pw1"]);
    }

    #[test]
    fn handles_quoted_commas() {
        let data = b"name,notes\nGmail,\"hello, world\"\n";
        let (_h, rows) = read(data).unwrap();
        assert_eq!(rows[0][1], "hello, world");
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core import::csv`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/import/csv.rs
git commit -m "feat(import): CSV reader"
```

---

### Task 13: XLSX reader

**Files:**
- Modify: `core/src/import/xlsx.rs`

**Interfaces:**
- Consumes: `error`.
- Produces: `import::xlsx::read(data: &[u8]) -> Result<(Vec<String>, Vec<Vec<String>>)>` — reads the first worksheet, first row as headers, via `calamine`.

- [ ] **Step 1: Write the failing test**

`core/src/import/xlsx.rs`:
```rust
use std::io::Cursor;
use calamine::{Reader, Xlsx, Data};
use crate::error::{Result, VaultError};

pub fn read(data: &[u8]) -> Result<(Vec<String>, Vec<Vec<String>>)> {
    let cursor = Cursor::new(data.to_vec());
    let mut wb: Xlsx<_> = Xlsx::new(cursor).map_err(|e| VaultError::Import(e.to_string()))?;
    let first = wb
        .sheet_names()
        .first()
        .cloned()
        .ok_or_else(|| VaultError::Import("no worksheet".into()))?;
    let range = wb
        .worksheet_range(&first)
        .map_err(|e| VaultError::Import(e.to_string()))?;

    let mut iter = range.rows();
    let headers: Vec<String> = match iter.next() {
        Some(r) => r.iter().map(cell_to_string).collect(),
        None => return Ok((Vec::new(), Vec::new())),
    };
    let rows: Vec<Vec<String>> = iter.map(|r| r.iter().map(cell_to_string).collect()).collect();
    Ok((headers, rows))
}

fn cell_to_string(c: &Data) -> String {
    match c {
        Data::Empty => String::new(),
        Data::String(s) => s.clone(),
        Data::Float(f) => f.to_string(),
        Data::Int(i) => i.to_string(),
        Data::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // A tiny xlsx fixture is generated at test time by the build helper below.
    // We assert the reader parses headers + rows from `tests/fixtures/sample.xlsx`.
    #[test]
    fn reads_fixture() {
        let bytes = include_bytes!("../../tests/fixtures/sample.xlsx");
        let (headers, rows) = read(bytes).unwrap();
        assert_eq!(headers, vec!["name", "login", "secret"]);
        assert_eq!(rows[0], vec!["Gmail", "me", "pw1"]);
    }
}
```

- [ ] **Step 2: Create the fixture**

The reader test needs a real `.xlsx`. Generate it once with a throwaway script (requires Python with `openpyxl`, available on the dev machine):

Run:
```bash
mkdir -p core/tests/fixtures
python3 - <<'PY'
from openpyxl import Workbook
wb = Workbook(); ws = wb.active
ws.append(["name","login","secret"])
ws.append(["Gmail","me","pw1"])
ws.append(["Bank","you","pw2"])
wb.save("core/tests/fixtures/sample.xlsx")
print("wrote core/tests/fixtures/sample.xlsx")
PY
```
Expected: `wrote core/tests/fixtures/sample.xlsx`. If `openpyxl` is missing: `pip3 install openpyxl` first.

- [ ] **Step 3: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core import::xlsx`
Expected: PASS (1 test).

- [ ] **Step 4: Commit**

```bash
git add core/src/import/xlsx.rs core/tests/fixtures/sample.xlsx
git commit -m "feat(import): XLSX reader via calamine + fixture"
```

---

### Task 14: Import presets (auto-mapping for known tools)

**Files:**
- Modify: `core/src/import/presets.rs`

**Interfaces:**
- Consumes: `import::ColumnMapping`.
- Produces: `import::presets::Preset` enum `{ Chrome, LastPass, Bitwarden, OnePassword, Keepass }`; `presets::detect(headers: &[String]) -> Option<Preset>`; `presets::mapping_for(p: Preset) -> ColumnMapping`. Detection matches each tool's known export header set (case-insensitive).

- [ ] **Step 1: Write the failing test**

`core/src/import/presets.rs`:
```rust
use crate::import::ColumnMapping;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Preset {
    Chrome,
    LastPass,
    Bitwarden,
    OnePassword,
    Keepass,
}

fn has_all(headers: &[String], names: &[&str]) -> bool {
    names.iter().all(|n| headers.iter().any(|h| h.eq_ignore_ascii_case(n)))
}

pub fn detect(headers: &[String]) -> Option<Preset> {
    // Chrome: name,url,username,password
    if has_all(headers, &["name", "url", "username", "password"]) {
        return Some(Preset::Chrome);
    }
    // LastPass: url,username,password,extra,name,grouping,fav
    if has_all(headers, &["url", "username", "password", "extra", "name"]) {
        return Some(Preset::LastPass);
    }
    // Bitwarden: name,login_uri,login_username,login_password,notes
    if has_all(headers, &["name", "login_uri", "login_username", "login_password"]) {
        return Some(Preset::Bitwarden);
    }
    // 1Password: Title,Url,Username,Password,Notes
    if has_all(headers, &["title", "url", "username", "password"]) {
        return Some(Preset::OnePassword);
    }
    // KeePass: "Account","Login Name","Password","Web Site","Comments"
    if has_all(headers, &["account", "login name", "password", "web site"]) {
        return Some(Preset::Keepass);
    }
    None
}

pub fn mapping_for(p: Preset) -> ColumnMapping {
    match p {
        Preset::Chrome => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: None,
        },
        Preset::LastPass => ColumnMapping {
            title: Some("name".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("extra".into()),
        },
        Preset::Bitwarden => ColumnMapping {
            title: Some("name".into()), username: Some("login_username".into()),
            password: Some("login_password".into()), url: Some("login_uri".into()), notes: Some("notes".into()),
        },
        Preset::OnePassword => ColumnMapping {
            title: Some("title".into()), username: Some("username".into()),
            password: Some("password".into()), url: Some("url".into()), notes: Some("notes".into()),
        },
        Preset::Keepass => ColumnMapping {
            title: Some("account".into()), username: Some("login name".into()),
            password: Some("password".into()), url: Some("web site".into()), notes: Some("comments".into()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_bitwarden() {
        let h: Vec<String> = ["name","login_uri","login_username","login_password","notes"]
            .iter().map(|s| s.to_string()).collect();
        assert_eq!(detect(&h), Some(Preset::Bitwarden));
        let m = mapping_for(Preset::Bitwarden);
        assert_eq!(m.password, Some("login_password".into()));
    }

    #[test]
    fn unknown_headers_return_none() {
        let h: Vec<String> = ["foo","bar"].iter().map(|s| s.to_string()).collect();
        assert_eq!(detect(&h), None);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cargo test -p filaxy-vault-core presets`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add core/src/import/presets.rs
git commit -m "feat(import): auto-mapping presets for Chrome/LastPass/Bitwarden/1Password/KeePass"
```

---

### Task 15: End-to-end integration test + property test

**Files:**
- Create: `core/tests/integration.rs`

**Interfaces:**
- Consumes: the full public API.
- Produces: nothing (tests only).

- [ ] **Step 1: Write the integration + property tests**

`core/tests/integration.rs`:
```rust
use filaxy_vault_core::crypto::kdf::KdfParams;
use filaxy_vault_core::generator::{generate, GenOptions};
use filaxy_vault_core::import::{csv, presets, rows_to_entries};
use filaxy_vault_core::vault::{format, model::Entry, Vault};

fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

#[test]
fn full_lifecycle_create_import_save_open_edit() {
    // import a CSV (Chrome-style) -> entries
    let data = b"name,url,username,password\nGmail,gmail.com,me,pw1\nBank,bank.com,you,pw2\n";
    let (headers, rows) = csv::read(data).unwrap();
    let preset = presets::detect(&headers).expect("chrome detected");
    let map = presets::mapping_for(preset);
    let entries = rows_to_entries(&headers, &rows, &map, 10);
    assert_eq!(entries.len(), 2);

    // build vault, add a generated entry
    let mut v = Vault::default();
    for e in entries { v.add(e); }
    let mut g = Entry::new("Generated");
    g.set_password(generate(&GenOptions::default()).unwrap(), 10);
    v.add(g);

    // seal + open round trip
    let blob = format::seal(&v, b"master", None, fast()).unwrap();
    let mut opened = format::open(&blob, b"master", None).unwrap();
    assert_eq!(opened, v);

    // edit a password -> history grows -> reseal -> reopen
    let id = opened.entries[0].id;
    opened.get_mut(id).unwrap().set_password("rotated", 20);
    let blob2 = format::seal(&opened, b"master", None, fast()).unwrap();
    let reopened = format::open(&blob2, b"master", None).unwrap();
    assert_eq!(reopened.get(id).unwrap().password, "rotated");
    assert_eq!(reopened.get(id).unwrap().history.len(), 1);
}

proptest::proptest! {
    #[test]
    fn seal_open_round_trips_for_arbitrary_titles(titles in proptest::collection::vec(".*", 0..20)) {
        let mut v = Vault::default();
        for t in &titles {
            let mut e = Entry::new(t.clone());
            e.set_password("p", 1);
            v.add(e);
        }
        let blob = format::seal(&v, b"pw", None, fast()).unwrap();
        let opened = format::open(&blob, b"pw", None).unwrap();
        proptest::prop_assert_eq!(opened, v);
    }
}
```

- [ ] **Step 2: Run the full suite**

Run: `cargo test -p filaxy-vault-core`
Expected: ALL tests pass (unit + integration + proptest).

- [ ] **Step 3: Verify no network dependency leaked in**

Run: `cargo tree -p filaxy-vault-core | grep -iE "reqwest|hyper|tokio|ureq|curl" || echo "NO NETWORK CRATES - good"`
Expected: prints `NO NETWORK CRATES - good`.

- [ ] **Step 4: Commit**

```bash
git add core/tests/integration.rs
git commit -m "test: end-to-end lifecycle + property round-trip; verify no network deps"
```

---

## Self-Review

**1. Spec coverage**
- §4 crypto (Argon2id, XChaCha20, key file, CSPRNG, zeroize) → Tasks 2-5, 8. ✓
- §4.5 `.fvault` format + tamper detection → Task 8. ✓
- §5 data model (Entry + history) → Task 6; Vault container → Task 7. ✓
- §6 multi-factor: key file → Task 5/8 ✓. **Biometría OS y TOTP NO van en este plan** — pertenecen a `src-tauri`/OS keychain (no son lógica del crate puro). Quedan para el plan del puente Tauri (documentado abajo).
- §7 generador → Task 10; backup/export cifrado = la misma `seal`/`store` (Task 8/9) ✓; CRUD/búsqueda → Task 7 ✓.
- §8 import CSV/XLSX + mapeo + presets → Tasks 11-14. La **pantalla de revisión** es UI → plan de UI.
- §9 endurecimiento: errores genéricos (Task 8), tamper (Task 8), 0 red (Task 15 step 3). Backoff/auto-lock/clipboard son de `src-tauri`/UI → planes siguientes.
- §12 testing → cubierto en cada task + Task 15.

**Gaps que por diseño NO están en este plan (van en planes hermanos):**
- Biometría OS + TOTP gate, auto-lock por idle/suspend/minimize, clipboard auto-clear, backoff de intentos → **plan `src-tauri`** (integraciones OS).
- Onboarding/unlock/lista/import-wizard/generador UI, light/dark, EN/ES, marca → **plan `ui`**.

**2. Placeholder scan:** sin TBD/TODO en pasos ejecutables (los `// implemented in a later task` de Task 1 son scaffolding intencional que cada task posterior reemplaza). ✓

**3. Type consistency:** `KdfParams`, `KEY_LEN`, `NONCE_LEN`, `combine_key`, `seal/open`, `Entry::set_password`, `ColumnMapping`, `rows_to_entries`, `csv::read`, `xlsx::read`, `presets::detect/mapping_for` usados consistentemente entre tasks e integración. ✓

---

## Próximos planes (después de este)

1. **`src-tauri`** — comandos Tauri sobre `core` + integraciones OS: keychain/biometría (Touch ID/Windows Hello), TOTP gate, auto-lock (idle/suspend/minimize), clipboard auto-clear, backoff de unlock, file dialogs.
2. **`ui`** — React/TS/Vite/Tailwind: onboarding, unlock, lista+búsqueda, detalle/edición, generador, settings, import wizard (mapeo + revisión); light/dark + EN/ES + marca violet→sky.
3. Luego roadmap: OCR (Fase 3), móvil/stores (Fase 4), sync LAN (Fase 5).
