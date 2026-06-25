use filaxy_vault_core::crypto::kdf::KdfParams;
use filaxy_vault_core::generator::{generate, GenOptions};
use filaxy_vault_core::import::{csv, presets, rows_to_entries};
use filaxy_vault_core::vault::{format, model::Entry, Vault};

fn fast() -> KdfParams { KdfParams { mem_kib: 8 * 1024, time_cost: 1, parallelism: 1 } }

#[test]
fn full_lifecycle_create_import_save_open_edit() {
    // import a CSV (Chrome-style) -> entries
    let data = b"name,url,username,password\nGmail,gmail.com,me,pw1\nBank,bank.com,you,pw2\n";
    let (headers, rows) = csv::read(data).unwrap();
    let preset = presets::detect(&headers).expect("chrome detected");
    let map = presets::mapping_for(preset);
    let entries = rows_to_entries(&headers, &rows, &map, 10);
    assert_eq!(entries.len(), 2);

    // build vault, add a generated entry
    let mut v = Vault::default();
    for e in entries { v.add(e); }
    let mut g = Entry::new("Generated");
    g.set_password(generate(&GenOptions::default()).unwrap(), 10);
    v.add(g);

    // seal + open round trip
    let blob = format::seal(&v, b"master", None, fast()).unwrap();
    let mut opened = format::open(&blob, b"master", None).unwrap();
    assert_eq!(opened, v);

    // edit a password -> history grows -> reseal -> reopen
    let id = opened.entries[0].id;
    opened.get_mut(id).unwrap().set_password("rotated", 20);
    let blob2 = format::seal(&opened, b"master", None, fast()).unwrap();
    let reopened = format::open(&blob2, b"master", None).unwrap();
    assert_eq!(reopened.get(id).unwrap().password, "rotated");
    assert_eq!(reopened.get(id).unwrap().history.len(), 1);
}

proptest::proptest! {
    #[test]
    fn seal_open_round_trips_for_arbitrary_titles(titles in proptest::collection::vec(".*", 0..20)) {
        let mut v = Vault::default();
        for t in &titles {
            let mut e = Entry::new(t.clone());
            e.set_password("p", 1);
            v.add(e);
        }
        let blob = format::seal(&v, b"pw", None, fast()).unwrap();
        let opened = format::open(&blob, b"pw", None).unwrap();
        proptest::prop_assert_eq!(opened, v);
    }
}
