use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn documents_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver el directorio de datos: {e}"))?;
    let dir = base.join("documents");
    fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear el directorio de documentos: {e}"))?;
    Ok(dir)
}

fn manifest_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver el directorio de datos: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("No se pudo crear el directorio de datos: {e}"))?;
    Ok(base.join("manifest.json"))
}

/// Escritura atómica: se escribe primero en un archivo temporal en el mismo
/// directorio y luego se renombra sobre el destino. Un `rename` dentro del
/// mismo sistema de archivos es atómico, así que si la app se cierra o
/// falla a mitad de escritura, el archivo original queda intacto en vez de
/// truncado o corrupto.
fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    let tmp_path = path.with_extension("tmp");
    {
        let mut f = fs::File::create(&tmp_path).map_err(|e| format!("No se pudo escribir el archivo temporal: {e}"))?;
        f.write_all(contents.as_bytes()).map_err(|e| format!("No se pudo escribir contenido: {e}"))?;
        f.sync_all().map_err(|e| format!("No se pudo sincronizar a disco: {e}"))?;
    }
    fs::rename(&tmp_path, path).map_err(|e| format!("No se pudo reemplazar el archivo: {e}"))?;
    Ok(())
}

fn sanitize_id(id: &str) -> Result<(), String> {
    let ok = !id.is_empty()
        && id.len() <= 128
        && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    if ok {
        Ok(())
    } else {
        Err("Identificador de documento inválido".into())
    }
}

#[tauri::command]
pub fn read_manifest(app: AppHandle) -> Result<Option<Value>, String> {
    let path = manifest_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el manifiesto: {e}"))?;
    let value: Value = serde_json::from_str(&raw).map_err(|e| format!("Manifiesto corrupto: {e}"))?;
    Ok(Some(value))
}

#[tauri::command]
pub fn write_manifest(app: AppHandle, manifest: Value) -> Result<(), String> {
    let path = manifest_path(&app)?;
    let serialized = serde_json::to_string_pretty(&manifest).map_err(|e| format!("No se pudo serializar el manifiesto: {e}"))?;
    write_atomic(&path, &serialized)
}

#[tauri::command]
pub fn read_document(app: AppHandle, id: String) -> Result<Value, String> {
    sanitize_id(&id)?;
    let path = documents_dir(&app)?.join(format!("{id}.json"));
    let raw = fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el documento: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("Documento corrupto: {e}"))
}

#[tauri::command]
pub fn write_document(app: AppHandle, id: String, document: Value) -> Result<(), String> {
    sanitize_id(&id)?;
    let path = documents_dir(&app)?.join(format!("{id}.json"));
    let serialized = serde_json::to_string_pretty(&document).map_err(|e| format!("No se pudo serializar el documento: {e}"))?;
    write_atomic(&path, &serialized)
}

#[tauri::command]
pub fn delete_document(app: AppHandle, id: String) -> Result<(), String> {
    sanitize_id(&id)?;
    let path = documents_dir(&app)?.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("No se pudo eliminar el documento: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el archivo: {e}"))
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| format!("No se pudo escribir el archivo: {e}"))
}
