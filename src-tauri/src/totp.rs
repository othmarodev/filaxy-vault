use totp_rs::{Algorithm, Secret, TOTP};

fn build(secret_base32: &str) -> Result<TOTP, String> {
    let bytes = Secret::Encoded(secret_base32.to_string())
        .to_bytes()
        .map_err(|_| "invalid totp secret".to_string())?;
    // totp-rs v5 enforces a >=128-bit secret in `TOTP::new`; `new_unchecked`
    // preserves RFC 6238 / Google Authenticator behavior while accepting the
    // standard 80-bit test vectors and shorter user secrets. Validity of the
    // base32 encoding is still enforced above via `to_bytes()`.
    Ok(TOTP::new_unchecked(Algorithm::SHA1, 6, 1, 30, bytes))
}

pub fn current_code(secret_base32: &str) -> Result<String, String> {
    let totp = build(secret_base32)?;
    totp.generate_current().map_err(|e| e.to_string())
}

pub fn verify(secret_base32: &str, code: &str) -> bool {
    match build(secret_base32) {
        Ok(totp) => totp.check_current(code).unwrap_or(false),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // RFC-style base32 secret ("JBSWY3DPEHPK3PXP" = "Hello!\xde\xad\xbe\xef")
    const SECRET: &str = "JBSWY3DPEHPK3PXP";

    #[test]
    fn current_code_is_six_digits() {
        let code = current_code(SECRET).unwrap();
        assert_eq!(code.len(), 6);
        assert!(code.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn verify_accepts_its_own_current_code() {
        let code = current_code(SECRET).unwrap();
        assert!(verify(SECRET, &code));
    }

    #[test]
    fn verify_rejects_wrong_code() {
        assert!(!verify(SECRET, "000000"));
    }

    #[test]
    fn invalid_secret_does_not_panic() {
        assert!(!verify("not base32 !!!", "123456"));
        assert!(current_code("not base32 !!!").is_err());
    }
}
