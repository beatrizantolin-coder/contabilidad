mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      storage::read_manifest,
      storage::write_manifest,
      storage::read_document,
      storage::write_document,
      storage::delete_document,
      storage::read_text_file,
      storage::write_text_file,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
