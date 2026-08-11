# App de finanzas personales — especificación para Claude Code

## Objetivo
Sustituir iCompta 6 por una app de escritorio propia para Mac, sin sincronización en la nube ni base de datos externa. Todo se guarda localmente. El prototipo funcional (React) ya existe y sirve como referencia exacta de diseño y comportamiento — este documento resume qué debe conservar la versión de escritorio.

## Stack sugerido
- Electron o Tauri (Tauri es más ligero) + React
- Persistencia: un archivo local por "documento" (JSON o SQLite), sin servidor ni cuenta de usuario
- Sin dependencias de red salvo la carga de fuentes (o empaquetarlas localmente)

## Modelo de datos

**Documento** (archivo independiente, ej. "Personal", "B-nice")
- id, nombre
- cuentas[]
- categorías[]
- movimientos[]
- presupuestos { categoriaId: importe mensual }

**Cuenta**
- id, nombre, saldo inicial, tipo: `checking` (cuenta corriente) | `savings` (cuenta de ahorro) | `credit` (tarjeta de crédito)
- aviso opcional de saldo mínimo

**Categoría**
- id, nombre, color (paleta fija de ~10 colores)
- subcategorías[]: { id, nombre, color propio }

**Movimiento**
- id, cuenta, fecha, descripción, importe
- tipo: `income` | `expense` | `transfer` (con su pareja `transfer_in`)
- categoría + subcategoría (no aplica a transferencias)
- estado: `reconciliado` | `pendiente` | `programado` | `anulado`
- recurrente opcional: { frecuencia: `weekly` | `monthly` | `yearly` }

## Funcionalidades clave

1. **Multi-documento**: varios archivos independientes (pestañas), cada uno con sus propias cuentas/categorías/movimientos. Se puede crear y eliminar documentos.

2. **Transferencias entre cuentas**, incluidas entre archivos distintos:
   - Misma cuenta/archivo: se anula el efecto en el saldo total (dinero que se mueve dentro de casa).
   - Entre archivos distintos: el dinero sale de verdad de un archivo y entra en otro, afectando al saldo total de ambos. El archivo receptor muestra la entrada aunque no la haya creado directamente.

3. **Tipos de cuenta**: agrupación visual en la barra lateral por corriente / ahorro / tarjeta de crédito, cada una con su icono.

4. **Categorías y subcategorías con color**: gestión completa (crear, eliminar, asignar color desde una paleta). El color se muestra como un punto junto a la descripción del movimiento en la tabla. El selector de color se abre al hacer clic sobre el punto (no permanece visible por defecto).

5. **Estado del movimiento**: icono clicable que cicla en este orden: reconciliado (check verde) → pendiente (círculo punteado ámbar) → programado (reloj azul) → anulado (X roja) → vuelve a reconciliado. **Los movimientos anulados no cuentan en ningún saldo** (ni total, ni por cuenta, ni en la columna de saldo encadenado, ni en la gráfica de evolución).

6. **Movimientos recurrentes con autogeneración**: al marcar un movimiento como recurrente, cuando llega la fecha de la siguiente ocurrencia se genera automáticamente (estado "programado"), sin que el usuario tenga que reintroducirlo cada periodo. Si se abre la app tras varios periodos sin usarla, genera de golpe todas las ocurrencias pendientes hasta la fecha actual. (Las transferencias recurrentes entre archivos distintos no se autogeneran, por simplicidad.)

7. **Vista "Programador"**: pantalla dedicada con el listado completo de movimientos recurrentes y un botón para dar de alta una operación programada directamente.

8. **Vista "Categorías"**: pantalla dedicada con gestión de categorías/subcategorías, su color y el presupuesto mensual opcional por categoría (con barra de progreso que se pone en rojo si se supera).

9. **Tabla de movimientos** (vista principal): columnas Fecha, Estado (icono), Descripción (con punto de color de categoría), Importe, Saldo. Sin columna de categoría aparte.
   - **Columna de saldo encadenado**: muestra el saldo resultante tras cada movimiento, calculado cronológicamente (total si se ve "todas las cuentas", o de la cuenta concreta si se filtra una).
   - Edición y eliminación de movimientos in situ.

10. **Filtros**: búsqueda por texto, categoría, tipo, rango de fechas.

11. **Importar / exportar CSV**: exporta los movimientos filtrados; importa creando cuentas y categorías automáticamente si no existen.

12. **Evolución del balance**: gráfica al final de la pantalla principal, con línea escalonada (no suavizada) que salta en la fecha exacta de cada movimiento, relleno de área, líneas de referencia en máximo/mínimo/cero, y **selector de rango de fechas** (presets 1M/3M/6M/1A/Todo + fechas personalizadas). El saldo de partida se recalcula según el rango elegido.

## Estética
- Fondo blanco, estilo macOS/iCompta: sidebar gris claro (#F3F3F5), acento azul (#3373DC), verde para ingresos/saldo positivo, rojo para gastos/saldo negativo, morado para transferencias.
- Tipografía: Inter para texto, IBM Plex Mono para cifras (alineación tabular).
- Cifras en formato euro (es-ES).

## Prototipo de referencia
El archivo `ledger.jsx` (React, componente único con estado en memoria) implementa todo lo anterior salvo la persistencia en disco — es la referencia exacta de comportamiento e interfaz para portar a la app de escritorio.
