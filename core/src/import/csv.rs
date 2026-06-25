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
