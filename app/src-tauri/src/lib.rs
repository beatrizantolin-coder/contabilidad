mod storage;

use std::sync::Mutex;
#[cfg(target_os = "macos")]
use tauri::{Emitter, Manager, RunEvent};

/// Ruta de un documento .nice con el que se abrio o se hizo doble clic en la
/// app (macOS: evento `Opened`; Windows/Linux: argumento de linea de
/// comandos). Se guarda aqui porque el evento puede llegar antes de que el
/// frontend este listo para escucharlo, asi que ademas de emitirlo se deja
/// disponible para que el frontend lo consulte una vez al arrancar.
struct PendingOpenPath(Mutex<Option<String>>);

#[tauri::command]
fn take_pending_open_path(state: tauri::State<PendingOpenPath>) -> Option<String> {
  state.0.lock().unwrap().take()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let initial_path = std::env::args().skip(1).find(|a| a.ends_with(".nice"));

  let app = tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(PendingOpenPath(Mutex::new(initial_path)))
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
      take_pending_open_path,
    ])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(move |_app_handle, _event| {
    #[cfg(target_os = "macos")]
    if let RunEvent::Opened { urls } = _event {
      let path: Option<String> = urls.into_iter().find_map(|u| u.to_file_path().ok()).map(|p| p.to_string_lossy().to_string());
      if let Some(path) = path {
        _app_handle.state::<PendingOpenPath>().0.lock().unwrap().replace(path.clone());
        let _ = _app_handle.emit("open-document-path", path);
      }
    }
  });
}
