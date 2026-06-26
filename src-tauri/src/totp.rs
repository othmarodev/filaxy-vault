use totp_rs::{Algorithm, Secret, TOTP};

fn algo_from(s: &str) -> Algorithm {
    match s.to_uppercase().as_str() {
        "SHA256" => Algorithm::SHA256,
        "SHA512" => Algorithm::SHA512,
        _ => Algorithm::SHA1,
    }
}

/// Build a TOTP with explicit parameters.
fn build_with(secret_base32: &str, algo: &str, digits: usize, period: u64) -> Result<TOTP, String> {
    let bytes = Secret::Encoded(secret_base32.to_string())
        .to_bytes()
        .map_err(|_| "invalid totp secret".to_string())?;
    // `new_unchecked` keeps RFC 6238 behavior while accepting short/test secrets;
    // base32 validity is enforced above via `to_bytes()`.
    Ok(TOTP::new_unchecked(algo_from(algo), digits, 1, period, bytes))
}

/// Build with the Google Authenticator defaults (SHA1 / 6 digits / 30s).
fn build(secret_base32: &str) -> Result<TOTP, String> {
    build_with(secret_base32, "SHA1", 6, 30)
}

/// Current code with explicit parameters (used by 2FA entries that may use
/// SHA256/SHA512, 8 digits, or a non-30s period — e.g. imported from Google Authenticator).
pub fn current_code_with(secret_base32: &str, algo: &str, digits: usize, period: u64) -> Result<String, String> {
    build_with(secret_base32, algo, digits, period)?
        .generate_current()
        .map_err(|e| e.to_string())
}

/// Current code with default parameters (SHA1 / 6 / 30).
pub fn current_code(secret_base32: &str) -> Result<String, String> {
    current_code_with(secret_base32, "SHA1", 6, 30)
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

    // RFC 6238 SHA1 reference: secret ASCII "12345678901234567890" → base32 below.
    // At T=59s the 8-digit code is 94287082, so the 6-digit code is "287082".
    const RFC_B32: &str = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    #[test]
    fn matches_rfc6238_vector_at_fixed_time() {
        let totp = build(RFC_B32).unwrap();
        assert_eq!(totp.generate(59), "287082");
        assert_eq!(totp.generate(1111111109), "081804");
    }

    // Reproduces the Google Authenticator import path: raw secret bytes ->
    // data-encoding BASE32_NOPAD -> totp-rs Secret::Encoded -> bytes.
    // If this round-trips, the imported secret is preserved exactly.
    #[test]
    fn base32_roundtrip_matches_core_encoder() {
        let raw = b"12345678901234567890";
        let b32 = data_encoding::BASE32_NOPAD.encode(raw);
        assert_eq!(b32, RFC_B32, "core encoder must produce standard base32");
        let decoded = Secret::Encoded(b32).to_bytes().unwrap();
        assert_eq!(&decoded, raw, "secret must survive encode->decode unchanged");
    }

    // A 20-byte secret with arbitrary bytes (not multiple-of-5 friendly) must also survive.
    #[test]
    fn base32_roundtrip_arbitrary_bytes() {
        let raw: Vec<u8> = (0u8..20).collect();
        let b32 = data_encoding::BASE32_NOPAD.encode(&raw);
        let decoded = Secret::Encoded(b32).to_bytes().unwrap();
        assert_eq!(decoded, raw);
    }
}
