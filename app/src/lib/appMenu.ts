import { Menu, Submenu, MenuItem, IconMenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import {
  CheckSquare,
  Copy,
  Download,
  FilePlus2,
  FolderInput,
  FolderOpen,
  History,
  Home,
  Pencil,
  Plus,
  Printer,
  Redo2,
  Repeat,
  Save,
  SlidersHorizontal,
  Tag,
  Trash2,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { lucideToMenuIcon } from "./menuIcon";

export interface AppMenuHandlers {
  newDocument: () => void;
  openWelcome: () => void;
  openReplacing: () => void;
  openRecent: (path: string) => void;
  closeDocument: () => void;
  save: () => void;
  duplicateDocument: () => void;
  renameDocument: () => void;
  exportCsv: () => void;
  print: () => void;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  selectAll: () => void;
  search: () => void;
  addDocument: () => void;
  newAccount: () => void;
  newTransaction: () => void;
  newScheduled: () => void;
  newCategory: () => void;
  newFilter: () => void;
}

export interface AppMenuState {
  canUndo: boolean;
  canRedo: boolean;
  recentPaths: string[];
}

/** Ultimo componente del path, sin extension, para el texto del submenu "Abrir Reciente". */
function baseName(path: string): string {
  const withSlashes = path.replace(/\\/g, "/");
  const last = withSlashes.slice(withSlashes.lastIndexOf("/") + 1);
  return last.replace(/\.json$/i, "") || path;
}

export async function buildAppMenu(handlersRef: { current: AppMenuHandlers }, state: AppMenuState): Promise<Menu> {
  const call = <K extends keyof AppMenuHandlers>(key: K, ...args: Parameters<AppMenuHandlers[K]>) => {
    (handlersRef.current[key] as (...a: Parameters<AppMenuHandlers[K]>) => void)(...args);
  };

  const [
    iconNewDoc, iconOpenWelcome, iconOpen, iconRecent, iconClose, iconSave, iconDuplicateDoc, iconRename, iconExport, iconPrint,
    iconUndo, iconRedo, iconDuplicateTx, iconDelete, iconSelectAll, iconSearch,
    iconAddDoc, iconNewAccount, iconNewTx, iconNewScheduled, iconNewCategory, iconNewFilter,
  ] = await Promise.all([
    lucideToMenuIcon(FilePlus2), lucideToMenuIcon(Home), lucideToMenuIcon(FolderOpen), lucideToMenuIcon(History), lucideToMenuIcon(X), lucideToMenuIcon(Save),
    lucideToMenuIcon(Copy), lucideToMenuIcon(Pencil), lucideToMenuIcon(Download), lucideToMenuIcon(Printer),
    lucideToMenuIcon(Undo2), lucideToMenuIcon(Redo2), lucideToMenuIcon(Copy), lucideToMenuIcon(Trash2), lucideToMenuIcon(CheckSquare), lucideToMenuIcon(SlidersHorizontal),
    lucideToMenuIcon(FolderInput), lucideToMenuIcon(Wallet), lucideToMenuIcon(Plus), lucideToMenuIcon(Repeat), lucideToMenuIcon(Tag), lucideToMenuIcon(SlidersHorizontal),
  ]);

  const recentItems =
    state.recentPaths.length === 0
      ? [await MenuItem.new({ text: "Sin documentos recientes", enabled: false })]
      : await Promise.all(
          state.recentPaths.map((path) => IconMenuItem.new({ text: baseName(path), icon: iconRecent, action: () => call("openRecent", path) })),
        );

  const appMenu = await Submenu.new({
    text: "Conta-Nice",
    items: [
      await PredefinedMenuItem.new({ item: { About: null } }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Services" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Hide" }),
      await PredefinedMenuItem.new({ item: "HideOthers" }),
      await PredefinedMenuItem.new({ item: "ShowAll" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Quit" }),
    ],
  });

  const archivoMenu = await Submenu.new({
    text: "Archivo",
    items: [
      await IconMenuItem.new({ text: "Nuevo documento", icon: iconNewDoc, accelerator: "CmdOrCtrl+N", action: () => call("newDocument") }),
      await IconMenuItem.new({ text: "Abrir ventana de inicio", icon: iconOpenWelcome, action: () => call("openWelcome") }),
      await IconMenuItem.new({ text: "Abrir...", icon: iconOpen, accelerator: "CmdOrCtrl+O", action: () => call("openReplacing") }),
      await Submenu.new({ text: "Abrir Reciente", items: recentItems }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await IconMenuItem.new({ text: "Cerrar", icon: iconClose, accelerator: "CmdOrCtrl+W", action: () => call("closeDocument") }),
      await IconMenuItem.new({ text: "Guardar", icon: iconSave, accelerator: "CmdOrCtrl+S", action: () => call("save") }),
      await IconMenuItem.new({ text: "Duplicar", icon: iconDuplicateDoc, action: () => call("duplicateDocument") }),
      await IconMenuItem.new({ text: "Renombrar...", icon: iconRename, action: () => call("renameDocument") }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await IconMenuItem.new({ text: "Exportar", icon: iconExport, action: () => call("exportCsv") }),
      await IconMenuItem.new({ text: "Imprimir...", icon: iconPrint, accelerator: "CmdOrCtrl+P", action: () => call("print") }),
    ],
  });

  const editarMenu = await Submenu.new({
    text: "Editar",
    items: [
      await IconMenuItem.new({ text: "Deshacer", icon: iconUndo, accelerator: "CmdOrCtrl+Z", enabled: state.canUndo, action: () => call("undo") }),
      await IconMenuItem.new({ text: "Rehacer", icon: iconRedo, accelerator: "CmdOrCtrl+Shift+Z", enabled: state.canRedo, action: () => call("redo") }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Cut", text: "Cortar" }),
      await PredefinedMenuItem.new({ item: "Copy", text: "Copiar" }),
      await PredefinedMenuItem.new({ item: "Paste", text: "Pegar" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await IconMenuItem.new({ text: "Duplicar", icon: iconDuplicateTx, accelerator: "CmdOrCtrl+D", action: () => call("duplicateSelected") }),
      await IconMenuItem.new({ text: "Eliminar", icon: iconDelete, action: () => call("deleteSelected") }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await IconMenuItem.new({ text: "Seleccionar todo", icon: iconSelectAll, accelerator: "CmdOrCtrl+A", action: () => call("selectAll") }),
      await IconMenuItem.new({ text: "Buscar...", icon: iconSearch, accelerator: "CmdOrCtrl+F", action: () => call("search") }),
    ],
  });

  const documentoMenu = await Submenu.new({
    text: "Documento",
    items: [
      await IconMenuItem.new({ text: "Añadir documento", icon: iconAddDoc, action: () => call("addDocument") }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await IconMenuItem.new({ text: "Nueva cuenta", icon: iconNewAccount, action: () => call("newAccount") }),
      await IconMenuItem.new({ text: "Nueva operación", icon: iconNewTx, action: () => call("newTransaction") }),
      await IconMenuItem.new({ text: "Nueva operación programada", icon: iconNewScheduled, action: () => call("newScheduled") }),
      await IconMenuItem.new({ text: "Nueva Categoria", icon: iconNewCategory, action: () => call("newCategory") }),
      await IconMenuItem.new({ text: "Nuevo filtro", icon: iconNewFilter, action: () => call("newFilter") }),
    ],
  });

  return Menu.new({ items: [appMenu, archivoMenu, editarMenu, documentoMenu] });
}
