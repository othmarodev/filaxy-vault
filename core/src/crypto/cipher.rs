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
