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
