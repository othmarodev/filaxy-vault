pub mod state;
pub mod session;
pub mod backoff;
pub mod totp;
pub mod keychain;
pub mod dto;
pub mod commands;
pub mod menu;

use std::sync::Mutex;
use tauri::Emitter;
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .menu(|app| menu::build_menu(app, "en"))
        .on_menu_event(|app, event| {
            let _ = app.emit("fv-menu", event.id().0.clone());
        })
        .manage(Mutex::new(AppState::default()))
        .invoke_handler(tauri::generate_handler![
            commands::vault_exists,
            commands::create_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::is_locked,
            commands::list_entries,
            commands::get_entry_secret,
            commands::add_entry,
            commands::update_entry,
            commands::delete_entry,
            commands::search_entries,
            commands::generate_password,
            commands::password_entropy,
            commands::generate_passphrase,
            commands::passphrase_entropy,
            commands::import_preview,
            commands::import_commit,
            commands::export_backup,
            commands::copy_secret_to_clipboard,
            commands::touch_activity,
            commands::check_autolock,
            commands::get_settings,
            commands::set_settings,
            commands::remember_on_device,
            commands::forget_device,
            commands::unlock_with_device,
            commands::totp_now,
            commands::add_seed_entry,
            commands::update_seed_entry,
            commands::get_seed_secret,
            commands::restore_entry,
            commands::delete_forever,
            commands::empty_trash,
            commands::toggle_favorite,
            commands::list_attachments,
            commands::add_attachment,
            commands::remove_attachment,
            commands::get_attachment,
            commands::health_report,
            commands::add_totp_entry,
            commands::update_totp_entry,
            commands::get_totp_secret,
            commands::totp_code_for,
            commands::import_google_authenticator,
            menu::set_menu_language
        ])
        .run(tauri::generate_context!())
        .expect("error while running Filaxy Vault");
}
