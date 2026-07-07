use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize)]
struct SaveData {
    key: String,
    value: String,
}

fn save_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("saves")
}

#[tauri::command]
fn steam_save_file(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let dir = save_dir(&app);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe = key.replace(':', "_").replace('/', "_");
    let path = dir.join(format!("{}.json", safe));
    std::fs::write(&path, &value).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn steam_load_file(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let safe = key.replace(':', "_").replace('/', "_");
    let path = save_dir(&app).join(format!("{}.json", safe));
    if path.exists() {
        std::fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn steam_user_name() -> String {
    "lok_artist".into()
}

#[tauri::command]
fn steam_unlock_achievement(id: String) -> Result<(), String> {
    println!("[STEAM] Achievement unlocked: {}", id);
    Ok(())
}

#[tauri::command]
fn steam_set_presence(key: String, value: String) -> Result<(), String> {
    println!("[STEAM] Rich presence: {} = {}", key, value);
    Ok(())
}

#[tauri::command]
fn steam_is_available() -> bool {
    false
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            steam_save_file,
            steam_load_file,
            steam_user_name,
            steam_unlock_achievement,
            steam_set_presence,
            steam_is_available,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
