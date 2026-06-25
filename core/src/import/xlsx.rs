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
