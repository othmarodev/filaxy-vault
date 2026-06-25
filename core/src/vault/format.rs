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
    let header_start: usize = 14;
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
