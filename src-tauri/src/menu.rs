use tauri::menu::{AboutMetadata, Menu, MenuBuilder, SubmenuBuilder};
use tauri::{AppHandle, Runtime};

/// Build the native app menu bar in the given language ("en" | "es").
pub fn build_menu<R: Runtime>(app: &AppHandle<R>, lang: &str) -> tauri::Result<Menu<R>> {
    let es = lang == "es";
    let tr = |en: &str, sp: &str| -> String { if es { sp.to_string() } else { en.to_string() } };

    let about = AboutMetadata {
        name: Some("Filaxy Vault".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        ..Default::default()
    };

    let app_menu = SubmenuBuilder::new(app, "Filaxy Vault")
        .about(Some(about))
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit = SubmenuBuilder::new(app, tr("Edit", "Editar"))
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let vault = SubmenuBuilder::new(app, tr("Vault", "Bóveda"))
        .text("menu_new", tr("New entry", "Nueva entrada"))
        .text("menu_import", tr("Import…", "Importar…"))
        .text("menu_settings", tr("Settings", "Ajustes"))
        .separator()
        .text("menu_lock", tr("Lock vault", "Bloquear bóveda"))
        .build()?;

    let help = SubmenuBuilder::new(app, tr("Help", "Ayuda"))
        .text("menu_manual", tr("User manual", "Manual del usuario"))
        .text("menu_shortcuts", tr("Keyboard shortcuts", "Atajos de teclado"))
        .separator()
        .text("menu_about", tr("About Filaxy Vault", "Acerca de Filaxy Vault"))
        .build()?;

    MenuBuilder::new(app).items(&[&app_menu, &edit, &vault, &help]).build()
}

/// Rebuild the menu in the requested language (called by the UI on language change).
#[tauri::command]
pub fn set_menu_language<R: Runtime>(app: AppHandle<R>, lang: String) -> Result<(), String> {
    let menu = build_menu(&app, &lang).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}
