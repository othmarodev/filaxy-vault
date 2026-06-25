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
