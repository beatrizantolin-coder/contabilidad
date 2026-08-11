# Contabilidad

App de finanzas personales para macOS (Tauri + React + TypeScript), sin
servidor, sin cuenta de usuario y sin sincronización en la nube. Cada
documento se guarda como un archivo JSON local en el directorio de datos
de la app.

## Desarrollo

```bash
npm install
npm run tauri dev
```

## Generar el instalable (.app / .dmg)

```bash
npm run tauri build
```

Consulta las instrucciones completas de instalación de dependencias para
macOS en el mensaje de la sesión que generó este proyecto, o en la
documentación oficial de Tauri: <https://v2.tauri.app/start/prerequisites/>.

## Datos

Los documentos se guardan en:

```
~/Library/Application Support/com.beatrizantolin.contabilidad/
```

Cada documento es un archivo `documents/<id>.json`; `manifest.json` lista
los documentos existentes y cuál estaba activo.
