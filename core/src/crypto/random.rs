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
