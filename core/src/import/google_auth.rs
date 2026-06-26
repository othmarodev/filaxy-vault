//! Parser for Google Authenticator's "Export accounts" QR payload.
//!
//! The export QR encodes an `otpauth-migration://offline?data=<url-encoded base64>`
//! URI whose `data` is a protobuf `MigrationPayload`:
//!   message MigrationPayload { repeated OtpParameters otp_parameters = 1; ... }
//!   message OtpParameters { bytes secret = 1; string name = 2; string issuer = 3; ... }
//! We decode it with a tiny self-contained protobuf wire reader (no proto deps).

use base64::{engine::general_purpose::STANDARD, Engine as _};
use data_encoding::BASE32_NOPAD;
use crate::error::{Result, VaultError};

#[derive(Debug, Clone, PartialEq)]
pub struct GaAccount {
    pub issuer: String,
    pub account: String,
    pub secret_base32: String,
    /// "SHA1" | "SHA256" | "SHA512" (defaults to SHA1).
    pub algorithm: String,
    /// 6 or 8 (defaults to 6).
    pub digits: u32,
}

/// Parse one Google Authenticator export URI into its accounts.
pub fn parse_migration_uri(uri: &str) -> Result<Vec<GaAccount>> {
    let uri = uri.trim();
    if !uri.to_lowercase().starts_with("otpauth-migration://") {
        return Err(VaultError::Import("not a Google Authenticator export".into()));
    }
    let data_enc = uri
        .split("data=")
        .nth(1)
        .ok_or_else(|| VaultError::Import("missing data param".into()))?;
    let data_enc = data_enc.split('&').next().unwrap_or(data_enc);
    let data_b64 = percent_decode(data_enc);
    let bytes = STANDARD
        .decode(data_b64.as_bytes())
        .map_err(|_| VaultError::Import("bad base64 in export".into()))?;
    parse_migration_payload(&bytes)
}

fn hex_val(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                out.push(h * 16 + l);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

// ── minimal protobuf wire decoder ──

fn read_varint(buf: &[u8], pos: &mut usize) -> Result<u64> {
    let mut result: u64 = 0;
    let mut shift = 0u32;
    loop {
        if *pos >= buf.len() {
            return Err(VaultError::Import("truncated varint".into()));
        }
        let b = buf[*pos];
        *pos += 1;
        result |= ((b & 0x7f) as u64) << shift;
        if b & 0x80 == 0 {
            break;
        }
        shift += 7;
        if shift >= 64 {
            return Err(VaultError::Import("varint too long".into()));
        }
    }
    Ok(result)
}

fn read_len_delim<'a>(buf: &'a [u8], pos: &mut usize) -> Result<&'a [u8]> {
    let len = read_varint(buf, pos)? as usize;
    if *pos + len > buf.len() {
        return Err(VaultError::Import("truncated field".into()));
    }
    let slice = &buf[*pos..*pos + len];
    *pos += len;
    Ok(slice)
}

fn skip_field(buf: &[u8], pos: &mut usize, wire: u64) -> Result<()> {
    match wire {
        0 => { read_varint(buf, pos)?; }
        1 => { *pos += 8; }
        2 => { read_len_delim(buf, pos)?; }
        5 => { *pos += 4; }
        _ => return Err(VaultError::Import("unknown wire type".into())),
    }
    Ok(())
}

fn parse_migration_payload(buf: &[u8]) -> Result<Vec<GaAccount>> {
    let mut accounts = Vec::new();
    let mut pos = 0;
    while pos < buf.len() {
        let tag = read_varint(buf, &mut pos)?;
        let field = tag >> 3;
        let wire = tag & 7;
        if field == 1 && wire == 2 {
            let msg = read_len_delim(buf, &mut pos)?;
            accounts.push(parse_otp_parameters(msg)?);
        } else {
            skip_field(buf, &mut pos, wire)?;
        }
    }
    Ok(accounts)
}

fn parse_otp_parameters(buf: &[u8]) -> Result<GaAccount> {
    let mut secret: Vec<u8> = Vec::new();
    let mut name = String::new();
    let mut issuer = String::new();
    let mut algo_num: u64 = 1; // default SHA1
    let mut digits_num: u64 = 1; // default SIX
    let mut pos = 0;
    while pos < buf.len() {
        let tag = read_varint(buf, &mut pos)?;
        let field = tag >> 3;
        let wire = tag & 7;
        match (field, wire) {
            (1, 2) => secret = read_len_delim(buf, &mut pos)?.to_vec(),
            (2, 2) => name = String::from_utf8_lossy(read_len_delim(buf, &mut pos)?).into_owned(),
            (3, 2) => issuer = String::from_utf8_lossy(read_len_delim(buf, &mut pos)?).into_owned(),
            (4, 0) => algo_num = read_varint(buf, &mut pos)?,
            (5, 0) => digits_num = read_varint(buf, &mut pos)?,
            _ => skip_field(buf, &mut pos, wire)?,
        }
    }
    let algorithm = match algo_num {
        2 => "SHA256",
        3 => "SHA512",
        _ => "SHA1", // 0/1/unknown -> SHA1
    }
    .to_string();
    let digits = if digits_num == 2 { 8 } else { 6 }; // EIGHT=2 else SIX
    // GA often stores name as "Issuer:account"; split when no explicit issuer.
    let account = if issuer.trim().is_empty() && name.contains(':') {
        let mut parts = name.splitn(2, ':');
        issuer = parts.next().unwrap_or("").trim().to_string();
        parts.next().unwrap_or("").trim().to_string()
    } else {
        name.trim().to_string()
    };
    Ok(GaAccount {
        issuer: issuer.trim().to_string(),
        account,
        secret_base32: BASE32_NOPAD.encode(&secret),
        algorithm,
        digits,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_uri() -> String {
        // OtpParameters { secret=DEADBEEF (f1), name="alice@x.com" (f2), issuer="GitHub" (f3) }
        let mut otp = vec![0x0A, 0x04, 0xDE, 0xAD, 0xBE, 0xEF];
        let name = b"alice@x.com";
        otp.push(0x12);
        otp.push(name.len() as u8);
        otp.extend_from_slice(name);
        let issuer = b"GitHub";
        otp.push(0x1A);
        otp.push(issuer.len() as u8);
        otp.extend_from_slice(issuer);
        // MigrationPayload { otp_parameters = otp } (field 1, wire 2)
        let mut payload = vec![0x0A, otp.len() as u8];
        payload.extend_from_slice(&otp);
        let b64 = STANDARD.encode(&payload);
        let enc = b64.replace('+', "%2B").replace('/', "%2F").replace('=', "%3D");
        format!("otpauth-migration://offline?data={enc}")
    }

    #[test]
    fn parses_single_account() {
        let accts = parse_migration_uri(&build_uri()).unwrap();
        assert_eq!(accts.len(), 1);
        assert_eq!(accts[0].issuer, "GitHub");
        assert_eq!(accts[0].account, "alice@x.com");
        assert_eq!(accts[0].secret_base32, BASE32_NOPAD.encode(&[0xDE, 0xAD, 0xBE, 0xEF]));
    }

    #[test]
    fn splits_issuer_from_name_when_missing() {
        // name = "Google:bob@x.com", no explicit issuer field
        let mut otp = vec![0x0A, 0x02, 0x01, 0x02];
        let name = b"Google:bob@x.com";
        otp.push(0x12);
        otp.push(name.len() as u8);
        otp.extend_from_slice(name);
        let mut payload = vec![0x0A, otp.len() as u8];
        payload.extend_from_slice(&otp);
        let enc = STANDARD.encode(&payload).replace('+', "%2B").replace('/', "%2F").replace('=', "%3D");
        let accts = parse_migration_uri(&format!("otpauth-migration://offline?data={enc}")).unwrap();
        assert_eq!(accts[0].issuer, "Google");
        assert_eq!(accts[0].account, "bob@x.com");
    }

    #[test]
    fn rejects_non_migration() {
        assert!(parse_migration_uri("otpauth://totp/x?secret=ABC").is_err());
        assert!(parse_migration_uri("https://example.com").is_err());
    }
}
