# Historial completo de instrucciones — App Conta-Nice

Recopilación de los 19 documentos de instrucciones generados a lo largo de todo el proyecto, en orden cronológico.

---

# spec-app-finanzas.md
**Fecha:** 11 ago, 11:12  
**Resumen:** Especificación inicial del proyecto

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


---

# prompt-claude-code.md
**Fecha:** 11 ago, 11:45  
**Resumen:** Prompt inicial para construir la app con Claude Code

Quiero construir una app de escritorio de finanzas personales para macOS, partiendo de un prototipo React que ya tengo en este repositorio.

Archivos de referencia:
- spec-app-finanzas.md — especificación completa de funcionalidades, modelo de datos y estética
- ledger.jsx — prototipo funcional (React) con toda la lógica e interfaz ya implementadas, salvo la persistencia en disco

Instrucciones:

1. Lee primero spec-app-finanzas.md y luego ledger.jsx completo antes de escribir nada.

2. Monta el proyecto con Tauri + React (usa Electron solo si tienes una buena razón para preferirlo). Sin backend, sin servidor, sin cuenta de usuario, sin ninguna llamada de red salvo las fuentes tipográficas (empaquétalas localmente si es posible, para que funcione sin conexión).

3. Persistencia: cada "documento" (archivo, ej. Personal, B-nice) se guarda como un archivo local en disco (JSON o SQLite, tú decides), en la carpeta de datos de la app del usuario. Debe poder cerrar la app y volver a abrirla sin perder nada. Sin sincronización en la nube de ningún tipo.

4. Traslada toda la lógica y el diseño de ledger.jsx tal cual: multi-documento, cuentas con tipo (corriente/ahorro/tarjeta de crédito), transferencias entre cuentas y entre archivos distintos, categorías y subcategorías con color editable, estado de movimiento con el ciclo reconciliado→pendiente→programado→anulado (los anulados no cuentan en ningún saldo), movimientos recurrentes con autogeneración de la siguiente ocurrencia, columna de saldo encadenado, filtros, importar/exportar CSV, presupuestos por categoría, y la gráfica de evolución del balance (línea escalonada con selector de rango de fechas).

5. Mantén la estética exacta: fondo blanco, sidebar gris claro, acento azul (#3373DC), verde/rojo/morado para ingreso/gasto/transferencia, tipografía Inter + IBM Plex Mono para cifras, formato de moneda es-ES.

6. Ve construyéndolo por partes: primero la estructura del proyecto y la persistencia básica (crear/leer/guardar un documento), luego la interfaz de cuentas y movimientos, y por último el resto de funcionalidades (recurrentes, gráfica, CSV, etc.). Explícame en cada parte qué has hecho y qué falta.

7. Al final, dime exactamente qué comandos tengo que ejecutar en mi Mac para instalar dependencias y generar la app instalable (.app o .dmg).

Empieza por el punto 1 y cuéntame qué plan sigues antes de ponerte a escribir código.


---

# instruccion-fix-csv-import.md
**Fecha:** 11 ago, 17:26  
**Resumen:** Primeras reglas de importación de CSV

La importación de CSV no funciona bien con el formato real de exportación de iCompta. He añadido un archivo de ejemplo real en samples/icompta-export-ejemplo.csv — léelo antes de tocar nada.

Problemas actuales:
1. No reconoce la fecha.
2. No diferencia entre importe negativo (gasto) y positivo (ingreso).
3. No asocia cada movimiento a su categoría correspondiente (debería crearla si no existe).

Formato real del CSV de iCompta (columnas separadas por punto y coma, no por coma):
Cuenta;ID;Estado;Fecha;Fecha valor;Nombre;Comentario;Importe;Categoría

Reglas de interpretación:

- **Delimitador**: detecta automáticamente si el CSV usa coma o punto y coma (algunos exports usan uno u otro).

- **Fecha**: viene en formato DD/MM/AAAA (ej. 31/08/2026). Conviértela al formato interno de la app. Usa la columna "Fecha", ignora "Fecha valor".

- **Importe**: si es negativo, el movimiento es un gasto (guarda el importe en positivo, tipo "expense"). Si es positivo, es un ingreso (tipo "income").

- **Estado**: mapea el valor de la columna "Estado" a nuestro campo de estado interno: "Reconciliado" → reconciliado, "Programado" → programado, "Pendiente" → pendiente, "Anulado" → anulado. Si no coincide con ninguno, usa "pendiente" por defecto.

- **Categoría**: viene anidada con " : " como separador, con un prefijo genérico "Gastos" o "Ingresos" que no aporta información (el tipo ya lo da el signo del importe). Ejemplos reales:
  - "Gastos : Gastos Generales" → categoría "Gastos Generales", sin subcategoría
  - "Gastos : Alimentación : Supermercado" → categoría "Alimentación", subcategoría "Supermercado"
  - "Ingresos : David" → categoría "David", sin subcategoría
  - "Tranferencias a otras cuentas" (sin " : ") → trátalo como categoría plana "Tranferencias a otras cuentas", sin intentar crear una transferencia real (el archivo no especifica cuenta destino)

  Regla general: ignora el primer segmento (Gastos/Ingresos), usa el segundo como categoría y el tercero (si existe) como subcategoría. Si la categoría o subcategoría no existe en el documento, créala automáticamente con un color de la paleta.

- **Cuenta**: también viene anidada, ej. "Cuentas Corrientes : ING Direct". El primer segmento indica el tipo de cuenta (mapea "Cuentas Corrientes"/similar a corriente, "Cuentas de Ahorro"/similar a ahorro, "Tarjetas de Crédito"/similar a tarjeta de crédito), el segundo es el nombre real de la cuenta. Si la cuenta no existe, créala con ese nombre y tipo detectado, saldo inicial 0.

- **Nombre**: es la descripción del movimiento.

- **Comentario**: si no está vacío, puedes añadirlo al final de la descripción entre paréntesis (opcional, no crítico).

Prueba la importación con samples/icompta-export-ejemplo.csv y comprueba que las 24 filas se importan con fecha, tipo, categoría/subcategoría, estado y cuenta correctos antes de darlo por terminado.


---

# instrucciones-actualizacion-app.md
**Fecha:** 11 ago, 21:09  
**Resumen:** Primera tanda grande de cambios (17 bloques)

Hemos seguido puliendo el prototipo (ledger.jsx, adjunto actualizado) desde la última vez. Léelo entero antes de tocar nada — es la referencia exacta de diseño y comportamiento. Aplica todos estos cambios a la app real:

## 1. Importación de CSV (formato real de iCompta)
Ver samples/icompta-export-ejemplo.csv (adjunto). Reglas:
- Detecta automáticamente si el CSV usa coma o punto y coma como separador.
- Fecha en formato DD/MM/AAAA → conviértela al formato interno.
- Importe negativo = gasto (guarda en positivo, tipo "expense"); positivo = ingreso.
- Columna "Estado" → mapea a nuestro campo de estado: Reconciliado/Programado/Pendiente/Anulado (por defecto "pendiente" si no coincide).
- Columna "Categoría" viene anidada con " : " y un prefijo "Gastos"/"Ingresos" redundante (el tipo ya lo da el signo). Ignora ese primer segmento; usa el segundo como categoría y el tercero (si existe) como subcategoría. Crea la categoría/subcategoría si no existe, con un color de la paleta.
- Columna "Cuenta" también anidada (ej. "Cuentas Corrientes : ING Direct"): el primer segmento indica el tipo de cuenta (corriente/ahorro/tarjeta de crédito), el segundo es el nombre. Crea la cuenta si no existe.

## 2. Categorías de 3 niveles, con color en cada nivel
Categoría → Subcategoría → Sub-subcategoría (antes solo 2 niveles). Cada nivel tiene su propio color, elegido de una paleta fija. El color no se muestra siempre visible: aparece como un punto junto al nombre, y solo se abre el selector de paleta al hacer clic sobre el punto.

## 3. Árbol de categorías real importado
Hemos precargado en el documento "Personal" el árbol de categorías real de Beatriz (transcrito de capturas de su iCompta), con sus colores aproximados. La rama "B-Nice" se excluye a propósito (no se importa a ningún archivo). Dos subcategorías de "Otros ingresos" estaban cortadas en la captura original y quedaron como "Devolución de Gastos (1)" y "(2)" — avisa de que habrá que renombrarlas.

## 4. Tipos de cuenta
Cada cuenta tiene un tipo: Cuenta corriente / Cuenta de ahorro / Tarjeta de crédito, con su icono. En la barra lateral las cuentas se agrupan visualmente por tipo.

## 5. Estado del movimiento
Campo "Estado" con 4 valores: Reconciliado (check verde) → Pendiente (círculo punteado ámbar) → Programado (reloj azul) → Anulado (X roja). Se cicla haciendo clic sobre el icono (sin necesidad de abrir el formulario). Los movimientos "Anulado" no cuentan en ningún saldo (ni total, ni por cuenta, ni en la columna de saldo, ni en la gráfica de evolución) — como si nunca hubieran existido para efectos de balance, pero siguen visibles en el listado (atenuados y tachados).

## 6. Recurrencia con intervalo personalizado
Antes solo había mensual/semanal/anual fijos. Ahora: número + unidad (Días / Meses / Años) — ej. "cada 15 días" o "cada 3 meses". Al llegar la fecha de la siguiente ocurrencia, se genera automáticamente con estado "Programado", sin que el usuario tenga que reintroducirla. Si se abre la app tras varios periodos, genera de golpe todas las que falten hasta la fecha actual. Las transferencias recurrentes entre archivos distintos no se autogeneran (por simplicidad).

## 7. Transferencias entre archivos distintos
Ya funcionaba, pero ahora en el formulario el campo se llama "Vincular" (selector de archivo destino) seguido de "Destino" (cuenta dentro de ese archivo). Si el archivo destino es distinto del actual, el dinero sale de verdad de un archivo y entra en otro, afectando al saldo total de ambos.

## 8. Columna de saldo encadenado
Nueva columna "Saldo" en la tabla de movimientos: muestra el saldo resultante tras cada movimiento, calculado cronológicamente (total si se ve "todas las cuentas", o de la cuenta concreta si se filtra una).

## 9. Columna de Comentario
Nueva columna después de Descripción, con su campo correspondiente en el formulario (opcional).

## 10. Autocompletado de categoría por descripción
Al escribir una descripción que coincide (exacta, sin distinguir mayúsculas) con un movimiento anterior, autorrellena categoría/subcategoría/sub-subcategoría del último movimiento con ese mismo nombre. Solo aplica al crear un movimiento nuevo, no al editar uno existente.

## 11. Selección múltiple sin casillas
Se hace clic directamente sobre la fila (fuera de los botones de estado/editar/eliminar) para seleccionarla; se marca en azul. Sin checkbox visible.

## 12. Duplicar en vez de copiar/pegar
Con movimientos seleccionados, el botón "Duplicar" crea copias inmediatas (nuevo id, estado "Pendiente"), sin pasos intermedios de portapapeles. Las transferencias se excluyen de la duplicación.

## 13. Edición en masa
Sustituye a "Deseleccionar". Con varios movimientos seleccionados, el botón "Editar" abre un panel donde se marca (con checkbox) solo el campo que se quiere cambiar — Fecha, Estado, Cuenta o Categoría — y se aplica ese cambio a todos los seleccionados a la vez. Los campos no marcados se quedan igual en cada movimiento. La cuenta y la categoría no afectan a las transferencias seleccionadas.

## 14. Panel de edición a la derecha
El formulario de movimiento (tanto para crear como para editar) ya no aparece arriba de la tabla: se abre en un panel lateral a la derecha, con botón de cerrar. Se usa el mismo panel para el formulario normal y para la edición en masa.

## 15. Orden de los campos del formulario
Cuenta → Vincular (archivo, solo transferencias) → Destino (solo transferencias) → Tipo → Movimiento recurrente → Descripción → Estado → Fecha → Importe → Categoría (+ subcategoría + sub-subcategoría) → Comentario → Guardar/Cancelar.

## 16. Formato de fecha
DD/MM/AA en toda la tabla de movimientos (antes "11 ago").

## 17. Columna Estado más ancha
Muestra icono + nombre del estado (antes solo icono).

Ve aplicando los cambios por bloques y cuéntame qué vas haciendo en cada uno, como la primera vez. Al final, dime si hace falta algún paso extra de migración de datos para quien ya tenga documentos guardados con el formato antiguo (2 niveles de categoría, frecuencia fija, sin campo de estado ni comentario).


---

# instrucciones-actualizacion-app-2.md
**Fecha:** 12 ago, 14:03  
**Resumen:** Diseño fijo, documentos, cuentas en 3 grupos, categorías Gasto/Ingreso, filtros rediseñados, bulk edit, vencimiento automático

Hemos seguido puliendo el prototipo (ledger.jsx, adjunto actualizado) desde la última entrega. Léelo entero antes de tocar nada. Esta es la segunda tanda de cambios — aplícalos todos a la app real:

## 1. Diseño general fijo con scroll interno
La barra lateral izquierda (documentos, cuentas, Programador, Categorias, Filtros, Sumatorio) ya no se desplaza con la página: ocupa toda la altura de la ventana de forma fija. Es la zona central la que hace scroll internamente cuando el contenido no cabe (tabla de movimientos, vista de Categorias, vista de Filtros, etc.), y el panel de edición de la derecha también se comporta igual.

## 2. Documentos (barra lateral)
- Título "DOCUMENTOS" encima de las pestañas de archivo, mismo estilo que "Cuentas".
- El icono de papelera junto a cada documento ahora está siempre visible (antes solo aparecía al pasar el ratón).

## 3. Cuentas reorganizadas en tres grupos
En vez de una sola sección "Cuentas" con subgrupos por tipo, ahora hay tres secciones independientes en la barra lateral, cada una con su propio boton "+" para anadir directamente de ese tipo:
- **Cuentas** (cuentas corrientes)
- **Ahorro** (cuentas de ahorro)
- **Tarjetas** (tarjetas de credito)

Al crear una tarjeta de credito, hay un selector opcional para asociarla a otra cuenta (campo `linkedAccountId`, solo relevante para tipo "credit").

Cada cuenta/tarjeta tiene ahora un icono de lapiz junto al nombre para editarla (nombre, tipo, saldo inicial, cuenta asociada si es tarjeta), ademas del icono de papelera para eliminarla.

**Pendiente, no implementado a proposito:** un campo de moneda por cuenta (€/£/$). Lo dejamos para mas adelante, no lo añadas todavia.

## 4. Selección múltiple de cuentas
Igual que con los movimientos: se hace clic en varias cuentas (sin checkbox, clic directo sobre la fila) para combinarlas. La pantalla central muestra los movimientos de todas las cuentas seleccionadas a la vez, y el "Sumatorio"/total inferior suma solo las cuentas seleccionadas. Un segundo clic en una cuenta la quita de la selección; si se quitan todas, vuelve a mostrar "Todas las cuentas". El titulo de la cabecera central refleja cuántas cuentas hay seleccionadas.

## 5. Categorías: Gasto o Ingreso, sin mezclarse
Cada categoría tiene ahora un tipo fijo: **Gasto** o **Ingreso** (campo `kind`). No pueden mezclarse:
- El selector de Categoria en el formulario de movimiento solo muestra las categorias del tipo correspondiente segun si el movimiento es Gasto o Ingreso (no aplica a Transferencias). Al cambiar el Tipo del movimiento, si la categoria seleccionada ya no encaja, se resetea a una valida del nuevo tipo.
- Al crear una categoria nueva se elige explicitamente si es de Gasto o de Ingreso (con un selector tipo segmented-control), y se ve una pequena etiqueta junto al nombre en la vista Categorias indicando cual es.
- La importación de CSV crea categorias nuevas con el tipo correcto segun el signo del importe (negativo = Gasto, positivo = Ingreso).
- En los filtros, el desplegable de Categoria tambien respeta el Tipo elegido en el filtro (si filtras por Ingresos, solo aparecen categorias de ingreso, y viceversa); cambiar el Tipo del filtro limpia las categorias/subcategorias que ya no encajen.

## 6. Filtros de movimientos: rediseño completo
- **Multi-selección de categorías y subcategorías**: en vez de un desplegable de una sola opción, ahora Categoria y Subcategorias son botones que abren un panel con un boton redondo de seleccion junto a cada opcion (se rellena de color cuando esta marcada); se pueden marcar varias a la vez. Las Subcategorias mostradas se limitan a las de las categorias ya seleccionadas (si no hay ninguna categoria marcada, se muestran todas).
- **Estilo uniforme**: todos los campos del panel de filtros (Descripcion, Tipo, Categoria, Subcategorias, las dos fechas) tienen el mismo alto y aspecto de "input" cerrado.
- **Orden fijo, en dos filas**: primera fila = Descripción, Tipo, Categoria, Subcategorias. Segunda fila = fecha desde (dd/mm/aaaa), fecha hasta (dd/mm/aaaa), boton Limpiar, boton Guardar.
- **Filtros guardados**: el boton "Guardar" abre un campo para ponerle nombre al filtro actual y guardarlo. Se guardan por documento (`savedFilters` dentro de cada documento).
- **Nueva sección "Filtros" en la barra lateral**, debajo de "Categorias": lista los filtros guardados de ese documento con un resumen de sus condiciones; clic para aplicarlo, papelera para eliminarlo.

## 7. Selección de movimientos con Mayúsculas (rango)
Al seleccionar filas de movimientos (clic directo sobre la fila, sin checkbox), si se mantiene pulsada la tecla Mayúsculas al hacer clic en otra fila, se seleccionan automáticamente todas las filas intermedias entre la última seleccionada y la actual (como en el Finder o una hoja de cálculo). Se suma a la selección existente.

## 8. Edición en masa: mismo formulario que la edición individual
Al editar varios movimientos seleccionados a la vez, ya no aparecen casillas de "activar este campo". Se abre el mismo panel visual que la edición individual, pero limitado únicamente a estos cuatro campos editables: **Cuenta, Categoria (con su Subcategoria/Sub-subcategoria en cascada), Estado y Fecha**. Al pulsar "Aplicar", esos cuatro valores se sobrescriben directamente en todos los movimientos seleccionados (la cuenta y la categoria no afectan a las transferencias seleccionadas, solo la fecha y el estado).

## 9. Movimientos recurrentes: vencimiento automático
Cuando un movimiento generado automáticamente (estado "Programado") llega a su fecha (hoy o antes), cambia solo su estado a "Pendiente" — ya no se queda como "Programado" una vez tocaba cargarse.

## 10. Icono de estado: tooltip con el nombre real
Al pasar el ratón sobre el icono de estado de un movimiento, el tooltip ya no dice genéricamente "clic para cambiar": muestra el nombre real del estado actual (Reconciliado, Pendiente, Programado o Anulado).

## 11. Columna Estado: solo icono, centrado
La columna Estado de la tabla de movimientos muestra únicamente el icono (sin texto al lado), centrado respecto a la palabra "ESTADO" de la cabecera, con ancho suficiente para que esa palabra no quede apretada.

Ve aplicando los cambios por bloques, como siempre, y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-revision-uso-real.md
**Fecha:** 12 ago, 19:23  
**Resumen:** Primera revisión tras probar la app instalada (20 puntos)

Llevo unos días probando la app instalada de verdad en mi Mac. Esto es lo que hay que cambiar. La app ya se ha desviado del prototipo original en algunas cosas (por ejemplo la ventana de bienvenida "Bienvenido a Conta-Nice" con Crear/Abrir documento/Abrir documento de prueba, que tú añadiste y yo no había visto en el prototipo), así que trabaja directamente sobre el código actual de la app, no solo sobre ledger.jsx.

## 1. Documento en blanco de verdad
"Crear un nuevo documento" en la ventana de bienvenida debe arrancar completamente vacío: sin cuentas, sin categorías precargadas, sin movimientos. Los datos de ejemplo (cuentas, categorías, movimientos de muestra) solo deben cargarse si el usuario elige explícitamente "Abrir un documento de prueba". Revisa que ahora mismo no se esté colando la semilla de ejemplo en el flujo de "nuevo documento".

## 2. Nombre de la app
Todavía no he decidido un nombre nuevo (sigue siendo "Conta-Nice" por ahora). No cambies el nombre; esto queda pendiente para más adelante.

## 3. Crear categoría/subcategoría al vuelo desde el formulario de movimiento
En los selectores de Categoria, Subcategoria y Sub-subcategoria del formulario de movimiento (tanto al crear como al editar), añade una opción "+ Nueva" al final de la lista. Al elegirla, se pide el nombre (y color, con la misma paleta que ya se usa en la vista Categorias) y se crea ahí mismo, quedando seleccionada automáticamente, sin tener que salir del formulario ni ir a la vista de Categorias.

## 4. Selección de movimientos: clic normal abre edición, Mayúsculas selecciona
Cambio de comportamiento importante:
- **Clic normal en cualquier parte de un movimiento** → abre directamente el panel de edición de la derecha (ya no selecciona la fila). El icono de lápiz se mantiene como alternativa para abrir la edición.
- **Mayúsculas + clic** → es la única forma de seleccionar movimientos (uno o varios). Si ya hay una fila marcada y se hace Mayúsculas+clic en otra, se seleccionan todas las intermedias (rango), igual que en el Finder.
- La selección sigue siendo necesaria para Duplicar / Editar en masa / Eliminar / borrar con la tecla Supr (ver puntos 6 y 7).

## 5. Selección de cuentas: mismo criterio
En la barra lateral, un clic normal en una cuenta/tarjeta selecciona solo esa (sustituye la selección anterior). Mayúsculas + clic añade más a la selección (con rango entre la última marcada y la actual). Esto es igual que el punto 4 pero aplicado a cuentas: aquí un clic normal en cuenta sigue funcionando como "ver esta cuenta" (no abre ningún panel de edición, eso ya lo hace el lápiz), solo cambia que deja de ser "multi-select acumulativo por defecto" y pasa a "un clic = solo esa cuenta, Mayúsculas = añadir más".

## 6. Eliminar con la tecla Supr/Delete
Con uno o varios movimientos seleccionados (vía Mayúsculas+clic), la tecla Supr/Delete del teclado los elimina, igual que el botón "Eliminar".

## 7. Barra de acciones de selección: añadir "Borrar" (deseleccionar)
Actualmente al seleccionar movimientos aparece: "N seleccionados · Duplicar · Editar · Eliminar". Añade un botón "Borrar" justo antes de "Duplicar" que limpia la selección actual (no borra movimientos, solo deselecciona). Orden final: **Borrar · Duplicar · Editar · Eliminar**.

## 8. Recurrencia: fecha final opcional
Al marcar un movimiento como recurrente, añade un campo opcional "Fecha final". Si se deja vacío, la recurrencia continúa indefinidamente (como ahora). Si se rellena, la serie deja de generar nuevas ocurrencias a partir de esa fecha.

## 9. Vencimiento de recurrentes (confirmar comportamiento)
Un movimiento recurrente cuya fecha ya ha pasado pasa automáticamente a estado "Pendiente". Uno con fecha futura se mantiene visible como recurrente/programado hasta que le llegue su fecha, momento en el que pasa a "Pendiente". (Esto ya debería estar implementado; solo confirmarlo.)

## 10. Vista central: por defecto solo la semana en curso
La tabla de movimientos, por defecto, debe mostrar solo los movimientos (normales y recurrentes) de la **semana en curso** — no todo el histórico. Necesita un nuevo control de rango para ampliar esa vista:

## 11. Nuevo botón "MOVIMIENTOS" junto a "Filtros"
Al lado del botón "Filtros" en la barra de herramientas, añade un botón "Movimientos" que despliega un selector de rango de fechas para la tabla central (independiente del filtro de fechas que ya existe dentro de "Filtros"): opciones **1m · 3m · 6m · Fin de año · fecha desde (dd/mm/aaaa) · fecha hasta (dd/mm/aaaa) · botón "Mostrar"**. Al pulsar "Mostrar" se aplica el rango elegido, sustituyendo la vista por defecto de la semana en curso.

## 12. Ordenar la tabla por columna (clic en la cabecera)
Las cabeceras de columna de la tabla de movimientos (Fecha, Estado, Descripcion, Comentario, Importe, Saldo) deben ser clicables: un clic ordena todos los movimientos por ese criterio de forma ascendente; un segundo clic sobre la misma cabecera invierte a descendente.

## 13. Icono de cadena para operaciones vinculadas (transferencias)
Entre las columnas Importe y Saldo, las operaciones vinculadas a otra cuenta (transferencias, traspasos) muestran un icono de cadena. Al hacer clic:
- Se **desvinculan**: ambos movimientos se mantienen (uno en cada cuenta), pero dejan de sincronizarse entre sí.
- El icono cambia a una cadena rota.
- Mientras estén vinculadas (icono de cadena normal), si se edita cualquier valor de la operación en una de las dos cuentas (importe, fecha, descripción, etc.), el cambio se refleja automáticamente en la copia de la otra cuenta.
- Una vez desvinculadas (cadena rota), cada movimiento se edita de forma independiente sin afectar al otro.

## 14. Color del importe en transferencias
El importe de una transferencia ya no debe usar el color morado especial: debe seguir el mismo criterio que cualquier movimiento normal — verde si ese lado de la operación hace que entre dinero en la cuenta, rojo si hace que salga.

## 15. Icono de flechas (⇄) al final de la descripción
El icono de flechas que indica que un movimiento es una transferencia, actualmente al principio de la descripción, debe pasar al **final** de la descripción. Esto es distinto del icono de cadena del punto 13 (que se queda entre Importe y Saldo).

## 16. Bug: cambiar el tipo de un movimiento de Gasto a Transferencia no guarda
Al editar un movimiento existente y cambiarle el tipo de "Gasto" (o "Ingreso") a "Transferencia", al pulsar "Guardar cambios" no se guarda nada. Revisar la lógica de guardado cuando el tipo cambia entre normal y transferencia durante una edición (probablemente falta gestionar la creación de las dos patas de la transferencia cuando se parte de una edición de un movimiento que antes no era transferencia).

## 17. Botón de guardar manual (icono de disco)
En la barra donde están Filtros / Movimientos / Exportar / Importar / +Movimiento, añade un botón con icono de disquete para guardar. La primera vez que se guarda un documento nuevo, debe abrir el diálogo nativo de macOS para elegir dónde guardar el archivo. Las siguientes veces, guarda directamente en el mismo sitio sin preguntar.

## 18. Deshacer / Rehacer
Añade dos botones (con sus iconos correspondientes) para deshacer y rehacer la última acción realizada (eliminar un movimiento, editar uno, cualquier cambio reciente). Necesita mantener un historial de acciones básico.

## 19. Arrastrar para reordenar cuentas/tarjetas
En la barra lateral, poder arrastrar cada cuenta/tarjeta para cambiar su orden dentro de su propio grupo (Cuentas, Ahorro, Tarjetas).

## 20. Arrastrar para reordenar movimientos del mismo día
Cuando la tabla está ordenada por fecha, permitir arrastrar para reordenar movimientos que caen en el mismo día entre sí. El orden entre movimientos de fechas distintas lo sigue marcando la fecha; el arrastre solo afecta a los empates dentro de un mismo día.

Ve aplicando los cambios por bloques y cuéntame qué vas haciendo en cada uno, como siempre. Si algo de esto entra en conflicto con cómo está montada ya la app real (por ejemplo el punto 1 con la ventana de bienvenida que ya existe), dime qué encuentras antes de decidir por tu cuenta.


---

# instrucciones-fallos-instalacion.md
**Fecha:** 13 ago, 10:08  
**Resumen:** Ventana de bienvenida, ancho de barra lateral, transferencias vinculadas

Sigo probando la app instalada y encuentro estos fallos. Trabaja sobre el código actual de la app real.

## 1. La ventana de bienvenida no aparece cuando debería
Al abrir la app instalada aparecen ya cuentas y movimientos cargados, en vez de la ventana de bienvenida (Crear nuevo / Abrir existente / Abrir documento de prueba). Si borro el archivo de datos, esa ventana sí aparece — lo que confirma que la lógica de "si no hay documento, muestra bienvenida" existe, pero el problema es que la app instalada está arrancando con un archivo de datos ya guardado (probablemente de pruebas hechas durante el desarrollo).

Comportamiento esperado:
- **Primera vez que se instala y abre la app**: debe mostrarse la ventana de bienvenida, sin ningún documento ya creado.
- **Resto de veces**: se abre directamente el último documento que se estaba usando, sin mostrar la ventana de bienvenida.

Revisa que el proceso de build/instalación no esté empaquetando ni dejando ningún archivo de datos de ejemplo en la carpeta de datos de la app (`~/Library/Application Support/...`) antes de la primera apertura real.

## 2. Barra lateral más ancha
La columna izquierda (documentos, cuentas, etc.) necesita más ancho para que el nombre de cada cuenta y su saldo (justificado a la derecha) se lean completos, sin cortarse ni superponerse.

## 3. Ancho mínimo de ventana
La ventana de la app debe tener un ancho mínimo (min-width) que garantice que, redimensione como redimensione el usuario, nunca se corte ni se superponga ningún elemento de la interfaz.

## 4. Transferencias vinculadas: crear y sincronizar el lado vinculado
Si un movimiento pasa a ser de tipo "Transferencia" (recién creado o editado desde otro tipo), debe generarse también su reflejo en la cuenta vinculada (la otra pata de la operación), no solo quedarse en la cuenta original. Esto está directamente relacionado con el bug ya reportado de que cambiar un movimiento de "Gasto" a "Transferencia" y pulsar "Guardar cambios" no guarda nada — probablemente falta la lógica que crea la segunda pata cuando la transferencia surge de editar un movimiento que antes no lo era.

Mientras las dos patas estén vinculadas (icono de cadena, ver instrucción anterior), cualquier cambio en una de las dos (importe, fecha, descripción, etc.) debe reflejarse automáticamente en la otra. Al desvincular (clic en el icono de cadena, que pasa a cadena rota), cada movimiento pasa a editarse de forma independiente.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo.


---

# instrucciones-menu-barra.md
**Fecha:** 13 ago, 10:30  
**Resumen:** Barra de menú nativa de macOS

Quiero una barra de menú nativa de macOS (la de arriba del todo, "Archivo / Editar / ...", no un menú dentro de la ventana), en español, con esta estructura. Añade un icono pequeño coherente con el estilo del resto de la app a la izquierda de cada elemento (usa los mismos iconos de lucide-react que ya usamos en la interfaz, no hace falta que se parezcan a los de la captura que adjunto de referencia solo para el formato visual).

## Archivo
- **Nuevo documento** — crea un documento en blanco (misma acción que el "+" de crear archivo nuevo / "Crear un nuevo documento" de la ventana de bienvenida).
- **Abrir...** — abre el selector de archivos nativo de macOS para elegir un documento existente en disco y lo carga como documento activo (sustituye al que estuviera abierto).
- **Abrir Reciente** — submenú con los últimos documentos abiertos (hay que llevar un pequeño historial de rutas recientes).
- **Cerrar** — cierra el documento actual.
- **Guardar** — guarda el documento activo (mismo botón de disquete que ya pedimos en la barra de herramientas; primera vez pide ubicación con el diálogo nativo, las siguientes guarda directo).
- **Duplicar** — duplica el documento completo (archivo entero, no un movimiento) como copia nueva.
- **Renombrar...** — renombra el documento activo.
- **Exportar** — exporta a CSV (misma función que el botón "Exportar" que ya existe).
- **Imprimir...** — imprime la vista actual de movimientos (usa el diálogo de impresión nativo).

## Editar
- **Deshacer** / **Rehacer** — ligado al sistema de deshacer/rehacer que ya pedimos (última acción: eliminar, editar, etc.).
- **Cortar** / **Copiar** / **Pegar** — comportamiento estándar de macOS sobre el campo de texto que tenga el foco (descripción, comentario, etc.).
- **Duplicar** — duplica el/los movimiento(s) seleccionado(s) (misma función que el botón "Duplicar" de la barra de selección).
- **Eliminar** — elimina el/los movimiento(s) seleccionado(s).
- **Seleccionar todo** — selecciona todos los movimientos visibles en la tabla actual.
- **Buscar...** — abre el panel de Filtros (si no está abierto) y pone el foco en el campo Descripción.

## Documento
- **Añadir documento** — abre el selector de archivos nativo para elegir OTRO documento ya existente en disco (distinto del que se está usando) y añadirlo como documento vinculado disponible en esta sesión, sin sustituir al actual ni fusionarse con él. Cada documento sigue siendo un archivo independiente con su propia ubicación; simplemente quedan "a la vista" el uno del otro para poder crear transferencias vinculadas entre sus cuentas (como ya existe entre "Personal" y "B-nice" en el prototipo).
- **Nueva cuenta** — abre el formulario de nueva cuenta (elige tipo: corriente/ahorro/tarjeta).
- **Nueva operación** — abre el panel de nuevo movimiento.
- **Nueva operación programada** — abre el panel de nuevo movimiento con la opción "recurrente" ya marcada (misma función que el botón "Nueva programada" de la vista Programador).
- **Nueva Categoria** — abre el formulario de nueva categoría en la vista Categorías.
- **Nuevo filtro** — abre el panel de Filtros con las condiciones en blanco, listo para configurar y guardar uno nuevo.

Nota: quité de la lista original "Nuevo grupo de cuentas" — confirmado que no hace falta, ya que los tres grupos (Cuentas/Ahorro/Tarjetas) ya existen y no es un concepto que necesite gestión propia.

Como siempre, ve por bloques y cuéntame qué vas haciendo. Si algún atajo de teclado estándar de macOS (Cmd+N, Cmd+O, Cmd+S, Cmd+Z, etc.) tiene sentido asignarlo a estos mismos elementos, hazlo también.


---

# instrucciones-bienvenida-guardado.md
**Fecha:** 13 ago, 11:30  
**Resumen:** Icono y casilla de bienvenida, extensión .nice, guardado en Escritorio

Más ajustes tras seguir probando la app instalada. Trabaja sobre el código actual de la app real.

## 1. Icono de la app en la ventana de bienvenida
En la ventana de bienvenida ("Bienvenido a [nombre]") falta el icono/logotipo de la app arriba del título (la moneda azul con el signo dólar en blanco, el mismo que usa la app como icono). Añádelo.

## 2. La ventana de bienvenida no está apareciendo
Actualmente la app abre directamente el último documento usado, sin pasar nunca por la ventana de bienvenida — ni siquiera en una instalación nueva sin documentos previos. Revisa la lógica que detecta "no hay ningún documento todavía / primera vez" y asegúrate de que en ese caso sí se muestra la ventana de bienvenida antes de nada.

## 3. Casilla "No volver a mostrar esta pantalla al iniciar"
Añade esta casilla al final de la ventana de bienvenida, con este comportamiento exacto:
- **Sin marcar (por defecto)**: la ventana de bienvenida se muestra siempre al abrir la app, incluso si ya existen documentos guardados.
- **Marcada**: deja de mostrarse en próximos inicios; la app abre directamente el último documento usado, sin pasar por la bienvenida.

## 4. Extensión de archivo: `.nice`
Los documentos de la app deben guardarse con extensión `.nice` (por ejemplo `Personal.nice`), en vez de la que se esté usando ahora. Esto implica:
- El diálogo nativo de "Guardar" debe proponer y filtrar por esa extensión por defecto.
- El diálogo de "Abrir" debe filtrar por archivos `.nice`.
- Configura la asociación de tipo de archivo en Tauri para que macOS reconozca `.nice` como archivo de esta app, le asigne el icono de la app, y permita abrirlo con doble clic desde el Finder.

## 5. Ubicación de guardado por defecto: Escritorio (solo documentos nuevos)
Los documentos que se creen **a partir de ahora** deben guardarse por defecto en el Escritorio del usuario (`~/Desktop`) al usar el diálogo nativo de guardado por primera vez, en vez de la carpeta interna de datos de la app (aunque el usuario pueda elegir otra ubicación si quiere en ese mismo diálogo).

Importante: esto **no afecta a los documentos ya creados** anteriormente en la carpeta de datos de la app (`~/Library/Application Support/...`) — esos se quedan donde están, sin moverlos ni migrarlos.

Como siempre, ve por bloques y cuéntame qué vas haciendo.


---

# instrucciones-fix-csv-import-2.md
**Fecha:** 13 ago, 12:44  
**Resumen:** Corrección del formato real de importación CSV

La importación de CSV sigue sin funcionar bien (solo importa 3 movimientos de un archivo con muchos más). Adjunto un archivo de ejemplo real nuevo: samples/2026-prueba.csv — súbelo al repositorio junto al que ya había (samples/icompta-export-ejemplo.csv) y usa AMBOS como referencia, porque confirman algo importante: **el formato de columnas no es siempre el mismo entre exportaciones**. El primer ejemplo tenía columnas `Cuenta;ID;Estado;Fecha;Fecha valor;Nombre;Comentario;Importe;Categoría`. Este nuevo ejemplo tiene `Cuenta;Estado;Fecha;Nombre;Comentario;Importe;Tipo;Categoría` — sin "ID" ni "Fecha valor", y con una columna "Tipo" que puede venir vacía.

**Causa probable del bug**: si el código lee las columnas por posición fija (columna 2, columna 5, etc.) en vez de por el nombre de la cabecera, cualquier archivo con columnas distintas al primer ejemplo se desalinea y la mayoría de filas fallan silenciosamente.

**Arréglalo así**: lee siempre las columnas por su nombre de cabecera (Cuenta, Estado, Fecha, Nombre, Comentario, Importe, Tipo, Categoría — usa la que exista de cada una; si falta alguna columna como "ID" o "Fecha valor", simplemente ignórala, no la necesitas). Mantén todos los campos tal cual, sin recortar filas.

Reglas de mapeo (confirmadas con el nuevo ejemplo, todos los campos deben conservarse):

- **Cuenta**: `"Cuentas Corrientes : ING Direct"` → primer segmento indica el tipo de cuenta (mapea a corriente/ahorro/tarjeta/efectivo según corresponda), segundo segmento es el nombre. Crea la cuenta si no existe.
- **Estado**: valores vistos → `Programado`, `Creado`, `Reconciliado` (probablemente también `Pendiente` y `Anulado` en otros exports). Mapea "Creado" a nuestro estado "Pendiente" (no tenemos un estado "Creado" propio). El resto, mapeo directo por nombre.
- **Fecha**: formato DD/MM/AAAA.
- **Nombre**: descripción del movimiento.
- **Comentario**: cuando no está vacío, guárdalo en el campo "comment" del movimiento (ya existe ese campo en el modelo de datos, se muestra en su propia columna en la tabla).
- **Importe**: puede tener decimales con punto (ej. `-14.93`) o ser entero (ej. `-100`). Negativo = gasto, positivo = ingreso, igual que antes.
- **Tipo**: en este ejemplo viene siempre vacío — si está vacío, ignóralo y deriva el tipo del signo del Importe como ya hacíamos. Si en otro export viniera relleno, tenlo en cuenta como posible fuente adicional del tipo, pero el signo del importe manda si hay conflicto.
- **Categoría**: viene anidada con " : ", con un prefijo "Gastos"/"Ingresos" redundante que se ignora (igual que ya teníamos especificado): usa el segundo segmento como categoría y el tercero (si existe) como subcategoría. Ejemplos reales de este archivo: `"Gastos : Alimentación : Supermercado"` → categoría Alimentación, subcategoría Supermercado. `"Ingresos : David"` → categoría David. `"Gastos : Vacaciones : Alimentacion"` → categoría Vacaciones, subcategoría Alimentacion.
- **Categoría vacía**: hay filas con esta columna en blanco (ej. "Coach Nicolas", "Transferencia a ING Ahorro"). En ese caso, asigna la categoría "Sin categoria" (ya existe en el árbol importado) en vez de dejarlo sin categoría o fallar.
- **Importante**: aunque el nombre de una fila sea literalmente "Transferencia a..." o la categoría sea "Tranferencias a otras cuentas", **no la conviertas en una transferencia vinculada real** del sistema (no hay cuenta destino especificada en el CSV) — impórtala como un movimiento normal de gasto/ingreso con esa categoría o descripción, igual que cualquier otro.

Después de arreglarlo, importa samples/2026-prueba.csv (27 movimientos) y samples/icompta-export-ejemplo.csv, y confirma que se importan todas las filas de ambos antes de darlo por terminado.


---

# instrucciones-programador-prevision.md
**Fecha:** 13 ago, 21:53  
**Resumen:** Programador rediseñado, gráfica Previsión de balance

Nueva tanda de cambios, adjunto ledger.jsx actualizado como referencia de diseño y comportamiento. Léelo entero antes de tocar nada y aplica esto sobre el código real de la app.

## 1. Botón "X" en el formulario de añadir documento
Al pulsar el "+" de añadir documento, junto al botón "Crear" debe haber una "X" para cerrar el formulario sin crear nada.

## 2. "Efectivo" como cuarto tipo de cuenta
Añade "Efectivo" como tipo de cuenta, al mismo nivel que Corriente / Ahorro / Tarjeta, con su propio grupo en la barra lateral (icono de billete).

## 3. "Grupos de cuentas" (antes "Todas las cuentas")
- Renombrado, con un icono nuevo (círculo con signo dólar, ver icono de la app).
- Sigue funcionando igual al hacer clic (muestra todas las cuentas combinadas).
- El botón "+" para añadir cuenta ahora vive **dentro** de esa misma barra (a la derecha), no como elemento separado al lado.
- Al pulsar ese "+": se abre el formulario con el **selector de tipo visible** (Cuentas/Ahorro/Tarjetas/Efectivo).
- El "+" de cada grupo individual (Cuentas, Ahorro, Tarjetas, Efectivo) sigue abriendo el mismo formulario pero **sin el selector de tipo** (ya viene implícito por el grupo).

## 4. Programador: rediseño completo
Cambia de mostrar el historial de ocurrencias generadas a mostrar **una fila por cada serie recurrente**, con su próxima instancia pendiente:
- Si la serie tiene una ocurrencia real ya generada con estado "Programado" (dentro de la semana en curso), se muestra esa, es editable/eliminable (iconos de lápiz y papelera) y es clicable para abrir el panel de edición.
- Si la próxima ocurrencia aún no se ha generado (fecha más lejana en el futuro), se muestra como fila informativa/prevista (algo atenuada), calculada con la fecha teórica siguiente, sin ser editable ni eliminable — solo previsualización.
- **Columnas**, en este orden: Fecha, Cuenta, Periodicidad, Estado (siempre icono de reloj — todas las filas de este listado son por definición "Programado"), Descripción, Importe, y por último los iconos de editar/eliminar (solo activos en las filas reales).
- **Sin columna Saldo.**
- Cabeceras clicables para ordenar por Fecha, Cuenta, Descripción o Importe (Estado y Periodicidad no son ordenables). Los encabezados siempre en negrita y color oscuro (no cambian a azul al estar activos, igual que las cabeceras de la tabla de Movimientos).
- **Agrupación automática según el criterio de orden activo**: si se ordena por Cuenta, se agrupa visualmente por cuenta (con su nombre como cabecera de sección); si se ordena por Fecha, se agrupa por mes y año (ej. "Agosto de 2026"); si se ordena por Descripción o Importe, la lista va plana sin agrupar.

## 5. Movimientos "Programado" en gris hasta que vencen
En la tabla principal de Movimientos: un movimiento con estado "Programado" cuya fecha aún no ha llegado se muestra **completamente en gris** (icono de estado, punto de categoría, importe y saldo). En cuanto su fecha llega o pasa, se ve en colores normales (y su estado pasa automáticamente a "Pendiente", como ya estaba implementado).

## 6. Autogeneración limitada a la semana en curso
Las ocurrencias de movimientos recurrentes solo se generan como movimiento real cuando su fecha cae dentro de la semana en curso. Las más lejanas en el futuro no se crean todavía como movimiento real (el Programador las muestra igualmente como previsión, ver punto 4).

## 7. Movimientos agrupados por mes, plegable
En la tabla principal de Movimientos, agrupa las filas por mes (con cabecera "Mes de Año (N)" mostrando el número de operaciones), con un icono de flecha para plegar/desplegar cada grupo. Por defecto todos los grupos están desplegados.

## 8. Gráfica renombrada a "Previsión de balance", ahora es una previsión real
- Ya no es solo histórico: combina el saldo real hasta hoy con una **proyección hacia delante** basada en los movimientos recurrentes (usando su intervalo para generar ocurrencias virtuales hasta el final del rango seleccionado, sin crearlas como movimientos reales).
- **Rango por defecto**: desde la fecha actual hasta el 31 de diciembre del año en curso.
- **Presets**: 1M, 3M, 6M, 1A — todos calculados como "desde el día 1 del mes en curso hasta el final del mes N" (1M = mes en curso completo, 3M = día 1 del mes en curso hasta fin del tercer mes, etc. 1A = hasta fin del mes 12).
- Se ha quitado el botón "Todo".
- El rango personalizado (dos campos de fecha) ya **no se aplica al vuelo**: hay un botón **"Mostrar"** a la derecha de esos dos campos que aplica el rango elegido.
- **Interactividad**: al hacer clic en cualquier punto de la gráfica, aparece una línea vertical en esa posición junto con una pequeña etiqueta mostrando la fecha y el saldo previsto correspondiente a ese punto exacto.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-movimientos-programador-categorias.md
**Fecha:** 13 ago, 23:45  
**Resumen:** Paleta de colores, orden en Movimientos, Programador v1, Categorías v1

Nueva tanda de cambios, adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada y aplica esto sobre el código real de la app.

## 1. Botón "Nueva operacion" (antes "Nueva programada")
En la vista Programador, el botón para dar de alta una operación programada se llama ahora "Nueva operacion".

## 2. Cabeceras de columna: gris por defecto, oscura solo la activa
En **Movimientos** y en **Programador**: los títulos de columna van en gris normal por defecto, y pasan a negrita y color oscuro únicamente en la columna que sea el criterio de orden activo en ese momento (no se usa azul para esto). No se muestran flechas de dirección junto al texto — solo el cambio de color/negrita indica cuál está activa.

## 3. Movimientos: ordenar por cualquier columna (menos Saldo)
Las cabeceras de **Fecha, Estado, Descripcion, Comentario e Importe** son clicables: el primer clic ordena ascendente, un segundo clic sobre la misma cabecera invierte a descendente. **Saldo no es ordenable** (se queda como columna informativa, ya que depende del orden cronológico real).

## 4. Movimientos: agrupación según el criterio de orden activo
Al ordenar por una columna, los movimientos se agrupan visualmente por el valor de esa misma columna, con una cabecera de grupo plegable/desplegable (con flecha, y el número de elementos entre paréntesis):
- Por **Fecha** → se agrupa por mes y año.
- Por **Estado** → se agrupa por el nombre del estado (Reconciliado, Pendiente, Programado, Anulado).
- Por **Descripcion** → se agrupa por el texto exacto de la descripción.
- Por **Comentario** → se agrupa por el texto exacto del comentario (o "Sin comentario" si está vacío).
- Por **Importe** → no se agrupa (los importes son un valor continuo, agrupar no aporta).

## 5. Movimientos: reordenar manualmente los empates de un mismo grupo
Cuando varios movimientos comparten el mismo valor en la columna por la que se está ordenando (ej. varios el mismo día si se ordena por Fecha, o varios con la misma descripción si se ordena por Descripcion), se pueden **arrastrar entre sí** para cambiar su orden relativo dentro de ese grupo de empate. Este orden manual se recuerda (un campo `manualRank` por movimiento) y se respeta independientemente de si el orden general está en ascendente o descendente — solo afecta al desempate dentro del mismo valor.

## 6. Programador: quitar columna Estado
En la vista Programador se elimina la columna "Estado" y su icono de reloj — todas las filas de esa lista son por definición operaciones programadas, así que resulta redundante. **Importante**: el icono de estado (reloj/check/etc.) y el comportamiento de "en gris si aún no vence, en color si ya vence" se mantienen intactos en la tabla de **Movimientos**, donde el movimiento aparece de verdad al llegar su cuenta correspondiente.

## 7. Programador: Periodicidad ordenable, iconos siempre visibles, cualquier fila editable
- La columna Periodicidad pasa a ser clicable para ordenar (por la frecuencia normalizada a un valor mensual equivalente).
- Los iconos de editar (lápiz) y eliminar (papelera) están **siempre visibles**, no solo al pasar el ratón.
- Al hacer clic en **cualquier fila** (tanto las que ya son un movimiento real generado, como las que solo son una previsión de una fecha lejana en el futuro) se abre el panel de edición a la derecha. Si la fila era solo una previsión (aún no existía como movimiento real), se crea en ese momento como un movimiento real con estado "Programado" y esa misma fecha, y se abre directamente su edición. El botón de eliminar (papelera) solo tiene efecto sobre filas ya reales; en las previstas aparece deshabilitado.

## 8. Gráfica de previsión: arreglar el arrastre de la línea vertical
El arrastre de la línea vertical (mantener pulsado y mover el ratón) no funcionaba correctamente — el bug estaba en que se releía una referencia al elemento SVG desde el propio evento de React de forma diferida, lo cual deja de ser válido una vez el manejador del evento termina. Solución: capturar el nodo del SVG en una variable normal de JavaScript en el momento de `mousedown`, y usar esa variable (no el evento) dentro de los manejadores de `mousemove`/`mouseup` posteriores.

## 9. Categorías: rediseño completo
- **Sin marco/caja alrededor de cada categoría**: mismo aspecto que la pantalla de Cuentas — filas a ancho completo, separadas por una línea horizontal (como en Movimientos), sin bordes redondeados individuales.
- **Iconos de editar y eliminar** con el mismo tamaño que en Cuentas, y que aparecen/desaparecen al pasar el ratón por encima de la fila (no siempre visibles).
- **Clic en la fila** (en cualquier parte, no solo el lápiz) abre el panel lateral de edición.
- **Plegable/desplegable**: cada categoría con subcategorías tiene una flecha a la izquierda para desplegar y ver sus subcategorías anidadas debajo (con su propio punto de color, indentadas). Colapsado por defecto.
- **Orden de la fila**: punto de color + nombre → barra de progreso del presupuesto (ocupa el espacio central, flexible) → cifra de "consumido / presupuesto asignado" al final, justo antes de los iconos. Se elimina la chapa "GASTO"/"INGRESO" de la fila (ya no hace falta, las pestañas ya separan por tipo).
- **Tercera pestaña "Traspasos"**, junto a "Gastos" e "Ingresos".
- **Panel lateral de edición** (se abre al clicar la fila o el lápiz):
  - Nombre de la categoría, editable.
  - Selector de tipo (Gasto / Ingreso / Traspaso), editable.
  - Selector de color: paleta de círculos sólidos: el seleccionado se marca con un anillo azul separado del círculo (no un borde pegado al círculo) — ver captura de referencia. El color se sigue aplicando en cascada a todas sus subcategorías, pero ya no hay ningún texto explicativo al respecto en la etiqueta del campo (el campo se llama simplemente "Color").
  - Presupuesto mensual.
  - Gestión de subcategorías (añadir/eliminar), heredando siempre el color de la categoría principal.
- El panel lateral de edición (de movimiento, edición en masa o de categoría) se **cierra automáticamente** al cambiar de pantalla (Movimientos/Programador/Categorías/Filtros) o al cambiar de documento activo.

## 10. Nueva paleta de colores
Sustituida la paleta de categorías/subcategorías por esta (más un color extra en el mismo rango tonal, un marrón): Rojo `#E2725B`, Naranja `#E8A33D`, Verde `#7FB35C`, Azul `#5B8DBF`, Morado `#9080C4`, Gris `#9A9D93`, Rosa `#D97FA6`, Cian `#4FAFA8`, Amarillo `#D9B23D`, Marrón `#A97C50`.

## 11. Subcategorías: color derivado, no propio
Las subcategorías (y sub-subcategorías) ya no tienen un color propio independiente: se calculan siempre como el color de su categoría principal aclarado un 20% (mezclado con blanco), en vez de un color elegido aparte. Esto se aplica tanto en la tabla de movimientos como en el listado de categorías.

## 12. Punto de color junto a Descripción en el formulario de movimiento
En el panel de edición/creación de un movimiento, a la izquierda del campo "Descripcion" aparece un punto con el color de la categoría actual del movimiento. Al pinchar sobre ese punto se despliega la paleta de colores justo debajo, permitiendo cambiar el color de esa categoría (con la misma cascada a subcategorías) sin salir del formulario ni ir a la pantalla de Categorías.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-menu-programador-filtros-categorias.md
**Fecha:** 14 ago, 11:44  
**Resumen:** Recurrencia con fecha final, botón + en Filtros, Categorías v2

Nueva tanda de cambios, adjunto ledger.jsx actualizado como referencia exacta. Léelo entero antes de tocar nada y aplica esto sobre el código real de la app.

## Menú general (barra lateral izquierda)

1. **Documentos**: el botón "+" para añadir documento se mueve a la derecha del título "DOCUMENTOS" (alineado igual que el resto de "+" de la app, no como un botón aparte al final de las pestañas). Además, dentro de la pastilla de cada documento, a la derecha del icono de papelera, añade un icono de guardar (disquete) para ese documento.

2. **Bug: los formularios se quedan abiertos al cambiar de pantalla.** Al pulsar el "+" de añadir cuenta (o el de añadir documento, o el de nueva categoría), si el usuario navega a otra pantalla sin cerrar el formulario, este se queda abierto de fondo. Todos estos formularios deben cerrarse automáticamente al cambiar de vista (Movimientos/Programador/Categorias/Filtros) o de documento activo.

3. **Confirmar comportamiento de selección en el menú lateral**: al pinchar en un elemento del menú (Programador, Categorias, Filtros, una cuenta, etc.) debe resaltarse en blanco, y al pinchar en otro elemento debe desaparecer el resaltado del anterior (selección única, no acumulativa). Revisa que esto se cumpla en todos los elementos del menú lateral.

4. **Pregunta sobre app móvil** (no es una tarea, es solo contexto): la usuaria preguntó si es viable una versión móvil aprovechando que el archivo se guarda en una carpeta de iCloud. Es viable para uso secuencial (un dispositivo cada vez, esperando a que sincronice), pero no para edición simultánea en dos sitios a la vez sin riesgo de conflictos. No se pide implementar nada de esto todavía.

## Programador

5. **Reordenar el bloque de recurrencia** en el formulario de movimiento (al marcar "Movimiento recurrente"), con este orden exacto:
   - Periodicidad (número + unidad: Días/Meses/Años)
   - Fecha inicio — Fecha final (dos campos de fecha en la misma fila)
   - Casilla "Sin fecha final (se repite indefinidamente)": al marcarla, el campo Fecha final se desactiva/deshabilita, y la serie se repite sin límite. Al desmarcarla, se puede indicar una fecha final concreta, y la serie deja de generar nuevas ocurrencias a partir de esa fecha (afecta a la autogeneración semanal, a la vista Programador y a la proyección de la gráfica de previsión).
   - "Fecha inicio" está vinculada al mismo campo "Fecha" general del movimiento (no es un campo independiente nuevo, es el mismo dato mostrado aquí para contexto).

6. **Colores de los títulos de agrupación**: tanto en Movimientos como en Programador, el texto de la cabecera de cada grupo (por mes, por cuenta, etc.) debe ir en negro/oscuro, nunca en azul.

7. **Centrar el punto de color con el elemento de selección**: en los desplegables de Categoría/Subcategoría del panel de Filtros, cada opción muestra un botón redondo de selección junto con un punto del color real de la categoría — ambos deben estar centrados verticalmente entre sí y con el texto.

8. **Confirmar comportamiento**: al crear o editar una operación programada con una fecha anterior al día de hoy, esa operación debe introducirse automáticamente como movimiento real en su cuenta correspondiente con esa misma fecha (no debe quedarse solo "pendiente de generar"). Este comportamiento ya debería derivarse de la lógica de vencimiento automático existente — solo confirmarlo.

## Filtros

9. Añade un botón "+" en la vista Filtros (junto al título) que lleve directamente a Movimientos con el panel de Filtros ya abierto, listo para configurar y guardar un filtro nuevo.

## Categorías

10. **Quitar el selector Gasto/Ingreso/Traspaso al crear una categoría nueva**: como la pantalla ya está dividida en pestañas (Gastos/Ingresos/Traspasos), la categoría nueva debe asignarse automáticamente al tipo de la pestaña activa en ese momento, sin volver a preguntarlo en el formulario.

11. **El formulario de "Nueva categoría" se abre en el panel lateral derecho**, igual que la edición de una categoría existente — no debe aparecer como un cuadro superpuesto dentro de la pantalla de Categorías.

12. **Subcategorías con su propio progreso**: al desplegar una categoría para ver sus subcategorías, cada una debe mostrar también su barra de progreso de presupuesto y su cifra de "consumido / presupuesto asignado" (en una versión más pequeña que la de la categoría principal), además de estar indentadas un poco más hacia la derecha que antes.

13. **Recordar color y categoría por nombre**: confirmar que, al escribir la descripción de un movimiento nuevo que coincide con una anterior, se autocompletan tanto la categoría como su color (el color ya viene incluido al recordar la categoría, no hace falta lógica aparte).

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-menu-lateral-programador-categorias.md
**Fecha:** 14 ago, 18:56  
**Resumen:** Barra lateral redimensionable, deshacer/rehacer, transferencias con nuevo destino

Nueva tanda de cambios y correcciones, adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada y aplica esto sobre el código real de la app.

## Correcciones de comportamiento (revisadas y confirmadas como fallos reales)

1. **El clic normal en un movimiento no abría el panel de edición.** Debía abrir directamente la edición (clic normal = editar), y solo Mayúsculas + clic debía seleccionar (con rango entre la última fila marcada y la actual). Revisa que esto se cumpla exactamente así.

2. **Lo mismo para las cuentas de la barra lateral**: un clic normal en una cuenta debe seleccionar solo esa cuenta (sustituyendo cualquier selección anterior), y solo Mayúsculas + clic debe ir añadiendo más cuentas a la selección.

3. **Campo de fecha duplicado** al marcar "Movimiento recurrente": no debe aparecer el campo "Fecha" general por separado si ya se muestra como "Fecha inicio" dentro del bloque de recurrencia — es el mismo dato, se debe mostrar una sola vez.

4. **El icono de guardar de cada documento no hacía nada.** Debe dar al menos una confirmación visual clara al pulsarlo (y en la app real, guardar de verdad ese documento en disco).

## Menú general (barra lateral izquierda)

5. **Redimensionable**: se debe poder arrastrar el borde derecho de la barra lateral para ampliarla o reducirla (con un mínimo y un máximo razonables, por ejemplo entre 170px y 420px).

6. **Colapsable**: añade un botón arriba de la barra lateral para plegarla a una franja estrecha (mostrando solo iconos) y volver a desplegarla.

7. **Logo y nombre de la app** arriba del todo de la barra lateral, junto al botón de plegar/desplegar (mismo patrón visual que la app "Enfoque" de referencia: icono + nombre a la izquierda, botón de colapsar a la derecha).

8. **Barra de herramientas superior** (Filtros, Exportar, Importar, +Movimiento): confirmar que está justificada a la derecha del todo, y añadir a la izquierda de esos botones: **Deshacer**, **Rehacer** y **Guardar** (icono de disquete), con sus iconos correspondientes. Deshacer/Rehacer deben actuar sobre un historial real de cambios (crear, editar, eliminar movimientos, cuentas, categorías, etc.), no solo maquetación.

9. **Ventana de inicio**: falta el texto de copyright (algo como "© [nombre] design. Version X.X.X") debajo del nombre de la app, tal como aparecía en el diseño original — actualmente no aparece en la ventana de bienvenida real.

## Movimiento / Transferencias

10. **Crear cuenta destino al vuelo**: en el selector "Destino (cuenta)" al convertir un movimiento en transferencia, añade una opción "+ Añadir nuevo destino..." que abra un pequeño formulario (nombre, tipo, saldo inicial) para crear esa cuenta ahí mismo si todavía no existe, y la deje seleccionada automáticamente al crearla. Debe funcionar también si el archivo destino es distinto del actual.

11. **Punto de color junto a Descripción**: debe quedar centrado verticalmente con la altura de la caja del campo Descripción en sí (el input), no con todo el bloque incluyendo su etiqueta.

12. **Fecha por defecto**: en cualquier formulario de movimiento, si se guarda sin haber indicado una fecha, debe usarse automáticamente la fecha del día en curso, sin necesidad de que el usuario tenga que corregirlo a mano.

## Programador

13. **Agrupar/ordenar también por Ingreso o Gasto**: añade esta opción junto a las de agrupar por Fecha o por Cuenta (con sus propios botones rápidos, y también como cabecera de columna ordenable "Tipo").

## Categorías

14. **Alinear las subcategorías con su categoría principal**: la barra de progreso y la cifra de "consumido / presupuesto" de cada subcategoría deben empezar y terminar exactamente en la misma posición horizontal que las de su categoría (misma plantilla de columnas, incluida la cifra final alineada a la derecha), pero con la barra más fina y el texto más pequeño. El nombre de la subcategoría puede llevar una pequeña sangría adicional respecto al de la categoría, sin que eso desplace la posición de la barra ni de la cifra.

15. **Iconos de editar y eliminar en las subcategorías**: añade los mismos iconos de lápiz y papelera que ya tiene la fila de categoría (en una versión ligeramente más pequeña), visibles solo al pasar el ratón por encima de la fila.

## Bug: filtrar/buscar por fecha no devuelve movimientos

16. La usuaria ha detectado que, al filtrar o buscar movimientos por fecha (rango desde/hasta, ya sea desde el panel de Filtros o desde el selector de rango "Movimientos" de la pantalla principal), en algunos casos no aparece ningún resultado aunque debería haberlos. No se ha podido reproducir el paso a paso exacto (puede que sea al usar el panel de Filtros solo, el botón "Movimientos" solo, o al combinar ambos a la vez). Revisa toda la lógica de comparación de fechas en los filtros:
    - Comprueba que las fechas se comparan siempre en el mismo formato (cadenas ISO `AAAA-MM-DD` comparadas como texto, evitando mezclar con objetos `Date` o formatos `DD/MM/AAAA` a medio camino).
    - Comprueba que el filtro de fecha del panel de Filtros y el rango de la pantalla principal ("Movimientos": semana en curso por defecto, o 1m/3m/6m, etc.) no se están aplicando ambos a la vez de forma contradictoria (por ejemplo, que el rango por defecto de "semana en curso" siga activo y se combine con `AND` con un rango de Filtros que no se solape con esa semana, dejando el resultado vacío sin que sea evidente para el usuario por qué).
    - Si ambos rangos coexisten, considera que uno sustituya al otro en vez de combinarse siempre con `AND`, o al menos muestra un aviso claro cuando el cruce de ambos filtros da como resultado cero movimientos, para que no parezca un fallo.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-sidebar-categorias-final.md
**Fecha:** 15 ago, 20:42  
**Resumen:** Menú lateral reestructurado, Previsión global, Categorías rediseño completo

Última tanda de cambios sobre el archivo real de la app. Adjunto ledger.jsx actualizado (partiendo del que me pasaste tú, con mis cambios aplicados) como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada.

## Selección y edición de movimientos (confirmar/corregir)

1. **Clic normal en un movimiento**: selecciona esa fila (resaltada, sustituyendo cualquier selección anterior) **y** abre su panel de edición a la derecha, al mismo tiempo. Si se vuelve a hacer clic sobre la misma fila ya seleccionada, se deselecciona y se cierra el panel.
2. **Mayúsculas + clic**: selecciona el rango completo entre la última fila marcada y la actual (sin abrir edición).
3. **Cmd/Ctrl + clic**: añade o quita esa fila suelta de la selección, una a una (sin abrir edición).
4. **Edición en masa**: vuelve a tener 4 campos disponibles — **Cuenta, Estado, Fecha y Categoría (con Subcategoría/Sub-subcategoría en cascada)** — aplicados directamente sin casillas de activación, igual que la edición individual pero limitada a esos campos.
5. **Recurrente al editar**: si se edita un movimiento ya existente y se marca "Movimiento recurrente", debe aparecer automáticamente en el Programador (usando ese mismo movimiento como ancla de la serie, no creando uno nuevo).

## Bug: solo se ven los movimientos de hoy al abrir el documento

6. Al abrir un documento, la tabla de Movimientos debe mostrar **todos** los movimientos por defecto, no solo los del día de hoy. Elimina cualquier filtro de rango por defecto (como la "semana en curso" que se pidió en una instrucción anterior) que esté limitando la vista inicial — el rango de fechas debe quedar siempre a elección del usuario (mediante el botón "Movimientos" o el panel de "Filtros"), nunca aplicado automáticamente al abrir.

## Filtros y fechas

7. En el panel de Filtros, los dos campos de fecha (desde/hasta) no deben aplicarse al escribir: añade un botón **"Mostrar"** a su derecha que aplique el rango solo al pulsarlo. Ambos campos empiezan con la fecha de hoy por defecto.
8. **Calendario propio**: sustituye todos los `<input type="date">` de la app (formulario de movimiento, fecha final de recurrencia, edición en masa, panel de Filtros, rango personalizado de la gráfica de previsión) por un componente de calendario propio, más grande y con estilo moderno (círculos redondeados, cabecera con mes/año y flechas de navegación, día de hoy marcado con un anillo, seleccionado relleno en azul, atajos "Hoy" y "Borrar"). El componente `DatePicker` ya incluido en el ledger.jsx adjunto sirve como referencia exacta de diseño y comportamiento — pórtalo tal cual a la implementación real.

## Barra de título de la ventana (macOS)

9. La barra de título nativa de la ventana (donde están los botones de semáforo) es demasiado clara y se confunde visualmente con el fondo blanco del contenido central. Oscurécela ligeramente para que se distinga con claridad de la zona de contenido.

## Barra lateral izquierda: reestructuración completa

10. **Icono de la barra lateral**: cambia el icono de plegar/desplegar por uno de "lista" (tres líneas con un punto a la izquierda de cada una), tal como se ve en el ledger.jsx adjunto (icono `List` de lucide-react).
11. **Documentos**: cabecera "DOCUMENTOS" con su "+" a la derecha. Cada documento es una pastilla de **dos líneas**: arriba el nombre con sus iconos de papelera/guardar/guardar como; debajo, **solo en el documento activo**, un icono de cadena con el texto "Vincular" para asociar otro documento.
12. **Grupos de cuentas**: cabecera "TODAS LAS CUENTAS" (icono de dólar en círculo) con su "+" a la derecha. Debajo, los cuatro grupos **Cuentas, Ahorro, Tarjetas, Efectivo**, cada uno con su icono, su nombre y su propio "+", listando las cuentas de ese tipo.
13. **Programador, Categorías y Filtros** van sin "+" en la barra lateral (a diferencia de Documentos y Grupos de cuentas, que sí lo llevan).
14. Añade una **línea separadora** entre cada bloque grande (Documentos / Grupos de cuentas / Programador-Categorías-Filtros).
15. **Iconos activos en azul**: los iconos de Programador, Categorías y Filtros deben ponerse en azul (el mismo acento que ya usa "Todas las cuentas") cuando esa pantalla está activa, y volver a gris cuando no lo está — igual que ya funcionaba para "Todas las cuentas".
16. **Barra lateral colapsada**: al plegarla, debe mostrar toda la estructura anterior reducida a solo iconos (documentos, cada grupo de cuentas con línea separadora entre ellos, y Programador/Categorías/Filtros), no una lista genérica de 5 iconos sueltos.

## Barra de herramientas superior (pantalla de Movimientos)

17. Todos los botones (Deshacer, Rehacer, Guardar, borrador/limpiar, Movimientos, Filtros, Exportar, Importar) deben tener **la misma altura exacta** (30px), con el icono siempre a la izquierda de la palabra en línea, nunca encima.
18. Añade un **icono de borrador/escoba** (al principio de este grupo de botones) que limpie de golpe cualquier movimiento seleccionado y cualquier filtro activo (categorías, subcategorías, tipo, búsqueda, fechas).
19. El botón **"+ Movimiento"** debe quedar visualmente separado del resto de botones (con un margen o espacio claro), alineado a la derecha del todo.
20. Elimina el botón/opción **"Ver semana actual"** del resumen bajo el nombre de la cuenta — ese resumen (ingresos/gastos del mes en curso, para las cuentas seleccionadas) es automático y fijo, sin ninguna opción que el usuario deba activar.

## Iconos junto al título de cada pantalla

21. Añade el icono correspondiente justo antes del nombre de cada pantalla en su cabecera:
    - **Movimientos**: si hay una sola cuenta seleccionada, el icono de su tipo (billetera para corriente, cerdito para ahorro, tarjeta para tarjetas, billete para efectivo). Si no hay ninguna o hay varias seleccionadas, el icono de dólar en círculo.
    - **Programador**: icono de flechas en redondo (Repeat).
    - **Categorías**: el mismo icono de lista que se usa para plegar la barra lateral.
    - **Filtros**: el icono de deslizadores que ya se usaba.

## Categorías

22. **Iconos de editar y eliminar siempre visibles** en cada fila (categoría y subcategoría), no solo al pasar el ratón por encima.
23. **Color del importe**: la cifra del gasto acumulado se colorea por tramos según el porcentaje consumido de su presupuesto — **verde de 0 a 70%, naranja de 71 a 90%, rojo de 91 a 100%** (y por encima). Si no hay presupuesto asignado, esa cifra va en gris neutro. La cifra del presupuesto asignado (la parte "/ X€") va siempre en gris, y **no aparece en absoluto** si no hay presupuesto configurado.
24. **Indicador de Gasto/Ingreso/Traspaso**: quítalo de donde estuviera antes en la fila y ponlo al **final del todo** (después de los iconos de editar/eliminar), con el mismo formato visual que el icono de estado de los movimientos: un círculo verde con flecha hacia arriba para ingreso, un círculo rojo con flecha hacia abajo para gasto, y un círculo azul con una flecha hacia arriba y otra hacia abajo para traspasos.

## Bug: el contador del Programador no coincide con la lista real

25. En algún punto de la app, el número de "operaciones programadas" que se muestra (por ejemplo, un contador junto al nombre "Programador" en el menú) no coincide con las que realmente aparecen al abrir esa pantalla (se ha visto un caso de "7" en el contador y solo "2" en la lista real). El número mostrado debe calcularse exactamente igual que la lista: **una entrada por cada serie recurrente única** (agrupando por cuenta + descripción + categoría + subcategoría + tipo + importe + intervalo de repetición), no contando cada movimiento individual ya generado de esa serie.

## Bug: filas duplicadas en la tabla de Movimientos

26. Se ha visto un caso en el que un mismo movimiento aparece **duplicado**, dos filas seguidas idénticas (misma fecha, descripción, importe y saldo) dentro del mismo grupo mensual. Revisa la lógica de generación/renderizado de filas para asegurarte de que no se está insertando el mismo movimiento dos veces (por ejemplo, por una key de React mal calculada que provoque un doble render, o por una entrada duplicada real en el array de transacciones, posiblemente relacionada con la autogeneración de movimientos recurrentes).

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-programador-filtros-edicion-masa.md
**Fecha:** 16 ago, 08:53  
**Resumen:** Bug de series recurrentes, Filtros con Coincidencia, edición en masa con Varios valores

Última tanda de cambios y correcciones. Adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento (contiene ya implementados todos los puntos de abajo). Léelo entero antes de tocar nada.

## Bug grave: las operaciones programadas no se pueden eliminar de verdad, y el contador no coincide

Esto es la causa raíz de dos síntomas que parecían distintos pero son el mismo problema:

1. **Al eliminar una ocurrencia programada, vuelve a aparecer poco después.** Motivo: el sistema de autogeneración semanal recalcula la "siguiente ocurrencia" de cada serie a partir del movimiento con la fecha más reciente que tenga `recurring` asignado. Si solo se borra la ocurrencia visible, quedan atrás en el historial otras transacciones de esa misma serie que **siguen teniendo `recurring` asignado**, así que el sistema las vuelve a usar como ancla y genera una nueva ocurrencia — dando la sensación de que "no se puede borrar".

   **Solución**: al eliminar desde el Programador, hay que **detener la serie completa**, no solo borrar la fila visible:
   - Si la fila era una ocurrencia real (ya generada), elimínala.
   - Además, recorre todas las demás transacciones que pertenezcan a esa misma serie (incluidas las pasadas, ya con otro estado) y **quítales el campo `recurring`** (déjalas como movimientos normales, no recurrentes). Así no queda ningún ancla desde la que se pueda regenerar nada.
   - Pide confirmación antes de hacerlo (es una acción destructiva sobre toda la serie, no solo una fila).

2. **El número de operaciones programadas en el menú lateral no coincide con las que se ven realmente al abrir el Programador** (ej. "9" en el menú, "1" real). Motivo: al agrupar las transacciones en series para contarlas, la clave de agrupación (cuenta + descripción + categoría + subcategoría + tipo + importe + intervalo) se construye con los valores "en crudo" de cada transacción. Si `categoryId`/`subcategoryId` son `undefined` en unas copias y `null` en otras, o si `amount` se guarda a veces como texto y a veces como número, transacciones que en realidad pertenecen a la misma serie acaban generando claves distintas, y el conteo se dispara.

   **Solución**: normaliza siempre la clave antes de compararla — `categoryId`/`subcategoryId` a `null` si son falsy, y `amount` pasado explícitamente por `Number(...)`. Usa **exactamente la misma función** para construir la clave en los tres sitios donde se necesita: el conteo del menú lateral, la lista del Programador, y el efecto de autogeneración semanal — para que nunca puedan desincronizarse entre sí.

## Bug: el clic en un movimiento no abría la edición

En el manejador de clic de una fila de movimiento, después de decidir abrir el panel de edición (`editTx`), había código posterior que volvía a cerrar el panel de forma incondicional (`setShowTxForm(false)`) en el mismo evento, anulando la apertura. Revisa la función que gestiona el clic sobre una fila y asegúrate de que, tras abrir la edición, no haya ninguna otra instrucción en el mismo manejador que la cierre de inmediato.

## Movimientos: clic fuera cierra el panel

Al hacer clic en una zona en blanco de la tabla de movimientos (fuera de cualquier fila y fuera del panel de edición), debe cerrarse el panel de edición y deseleccionarse cualquier movimiento.

## Movimientos: casilla de búsqueda visible

Añade un campo de búsqueda por descripción directamente en la barra de herramientas de Movimientos (con icono de lupa), sin tener que abrir el panel de "Filtros" para buscar.

## Movimientos: la goma de borrar también resetea la agrupación y el rango

Al pulsar el icono de la goma/escoba, además de limpiar la selección y los filtros, debe restablecer el orden/agrupación de la tabla a su estado por defecto (ordenado por fecha, descendente) y restablecer el rango de fechas del panel "Movimientos" a su valor por defecto, cerrando también los paneles de "Movimientos" y "Filtros" si estuvieran abiertos. Es un "volver a la vista inicial" completo, no solo limpiar filtros.

## Calendario propio en todos los campos de fecha

Sustituye cualquier `<input type="date">` que quede en la app (formulario de movimiento, fecha final de recurrencia, edición en masa, panel de Filtros, panel "Movimientos", rango personalizado de la gráfica de previsión) por el componente de calendario propio incluido en el ledger.jsx adjunto (`DatePicker`): más grande, con cabecera de mes/año navegable, círculos redondeados, hoy marcado con un anillo, seleccionado relleno en azul, atajos "Hoy" y "Borrar", y soporte de `placeholder` para mostrar "Varios valores" en la edición en masa (ver más abajo).

## Filtros: quitar presets de rango, mover "Guardar", añadir "Coincidencia"

- Quita los botones 1M / 3M / 6M / 1A / Fin de año del panel de Filtros — esos presets se quedan únicamente en el panel "Movimientos" (donde ya existen), no tiene sentido duplicarlos en Filtros.
- El botón "Guardar" (para guardar el filtro actual con nombre) se coloca junto al icono de la goma de borrar, con icono y texto, en vez de estar junto a las fechas.
- Añade un nuevo campo "Coincidencia" con tres opciones: Todas (por defecto — el movimiento debe cumplir todos los criterios activos, comportamiento actual), Cualquiera (basta con que cumpla uno de los criterios activos), Ninguna (excluye los movimientos que cumplan cualquiera de los criterios activos). Los "criterios activos" son solo los que el usuario ha configurado realmente (categoría, subcategoría, tipo, fechas, búsqueda) — si no hay ninguno activo, se muestran todos los movimientos sin más.

## Edición en masa: misma ventana que la individual, con "Varios valores"

Rediseño completo de la edición en masa:
- Usa el mismo formulario visual que la edición individual, con estos campos: Cuenta, Estado, Fecha, Importe, Categoría, Subcategoría, Sub-subcategoría y Comentario (no incluye Tipo, ya que cambiar el tipo en bloque con transferencias de por medio es demasiado complejo para esta versión).
- Al abrir la edición en masa, compara el valor de cada campo entre todos los movimientos seleccionados:
  - Si coincide en todos, el campo aparece relleno con ese valor común, normal.
  - Si difiere entre ellos, el campo aparece con el marcador de posición "Varios valores", atenuado (sin ningún valor concreto seleccionado).
- El usuario solo necesita tocar los campos que quiera cambiar. Al guardar, únicamente se aplican los campos que el usuario ha modificado explícitamente — los que se quedaron en "Varios valores" sin tocar no se alteran en ningún movimiento, y los que ya coincidían y no se tocaron tampoco cambian.
- Al cambiar la Categoría se resetea la Subcategoría y Sub-subcategoría (y quedan marcadas como también modificadas, mostrando su nuevo valor "Ninguna" en vez de "Varios valores"), igual que en el formulario individual.
- Pide confirmación antes de aplicar los cambios (ya existía, mantenla).
- Las transferencias seleccionadas dentro del lote no reciben los cambios de Cuenta ni Categoría/Subcategoría/Sub-subcategoría, aunque el usuario los haya tocado (igual que hasta ahora).

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-sidebar-prevision-categorias.md
**Fecha:** 16 ago, 13:26  
**Resumen:** Ventana de bienvenida, Previsión global sincronizada, Categorías rediseño completo

Nueva tanda de cambios muy detallada, adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada.

## Ventana de bienvenida (no reproducible en el prototipo, solo existe en la app real)

1. Numeración de versión: en la ventana de inicio, formato `N.VV.FFFF`. `N` = 0 hasta que se den por terminados todos los cambios de esta lista. `VV` empieza en 01 hoy y sube una cifra por cada versión nueva que se compile. `FFFF` = fecha de hoy en formato DDMM (por ejemplo, 1608 para el 16 de agosto).
2. Copyright: corrígelo a "© B-Nice design 2026", visible en algún punto del menú.
3. Añade una opción de menú nativo: Archivo → Abrir ventana de inicio, que reabre esa pantalla en cualquier momento.
4. Bug: al crear un documento nuevo, se siguen abriendo/mostrando los documentos anteriores. Al pulsar "nuevo", debe arrancar limpio, sin arrastrar los que ya estaban abiertos.

## Ventana principal — menú general

5. Oscurece ligeramente la barra superior nativa de la ventana (donde aparece centrado "Conta-Nice"), para que se distinga del contenido blanco de debajo.
6. Elimina del encabezado de Movimientos el rango de fechas ("01/08/26 - 31/08/26") y cualquier enlace "Ver semana actual" — ya no debe quedar rastro de ninguno de los dos.
7. Elimina el título grande "2026" (nombre del documento activo) que aparecía en la barra lateral, debajo del selector de documento — es redundante con la propia pestaña del documento.
8. En la barra de acciones principal (Movimientos, Filtros, Exportar, Importar, +Movimiento), mantén ese bloque siempre alineado a la derecha, sin que se baje de línea al redimensionar la ventana.
9. Vista de Movimientos por defecto: lista continua, sin agrupar por meses (sin cabeceras "Agosto de 2026", etc.). Solo debe agruparse por mes cuando el usuario pulse explícitamente la cabecera de la columna "Fecha" (o cualquier otra columna, agrupando entonces por ese criterio, tal como ya funciona).
10. Elimina los dos iconos de guardar situados al principio de la barra de herramientas y sustitúyelos por un único botón "Limpiar" (con icono y texto). Al pulsarlo debe restablecerse todo: filtros, selección, orden/agrupación de la tabla y rango de fechas — vuelta completa a la vista predeterminada.
11. Junto al título principal de cada pantalla (Movimientos, Programador, Categorías, Filtros, y el propio panel de Previsión), muestra siempre el icono correspondiente a esa sección — ya implementado en el ledger.jsx adjunto, tómalo como referencia exacta.
12. En la fila de cada documento de la barra lateral, el icono de cadena/vincular queda alineado a la derecha de esa misma fila (no en una segunda línea aparte), y solo visible en el documento activo.
13. Unifica la altura de todos los botones en todas las pantallas a un valor único, excepto los presets "1M", "3M", "6M", "1A" y "Fin de año", que deben conservar una altura más reducida (en el ledger.jsx adjunto están implementados como estilos `smallBtn` de 30px de alto para el resto, y `tinyBtn` de 24px para esos presets — usa exactamente esos dos tamaños).
14. Convierte "DOCUMENTOS" en una sección con el mismo formato visual y comportamiento que las demás secciones principales de la barra lateral (Programador, Categorías, Filtros): icono de documento delante del texto, fondo blanco + icono azul cuando está activa/desplegada, y al pulsarla se abren/cierran las opciones de añadir documento nuevo.
15. Renombra la sección "Grupos de cuentas" como "CUENTAS".
16. Dentro de "CUENTAS", renombra el grupo "Cuentas" (las de tipo corriente) como "BANCOS", con un icono de banco (en el ledger.jsx se usa el icono `Landmark` de lucide-react).

## Panel de "Previsión de balance": ahora es un panel global, no solo de Movimientos

17. El panel deja de estar anidado dentro de la pantalla de Movimientos: ahora es un panel que puede mostrarse encima de cualquier pantalla (Movimientos, Programador, Categorías, Filtros), controlado por un estado compartido único.
18. Dentro del panel: los selectores rápidos (1M/3M/6M/1A/Fin de año) van en una fila debajo del título "Previsión de balance", no en la misma línea. Todo el bloque de controles (selectores rápidos + campos Desde/Hasta + botón Mostrar) queda alineado a la izquierda.
19. Añade una "X" en la esquina superior derecha del panel, que únicamente lo oculta (no borra ni resetea nada de sus datos ni de su configuración — al reabrirlo debe mostrar la misma gráfica que tenía).
20. Añade en la barra de herramientas de todas las pantallas un botón con icono de gráfico ascendente (ejes + línea quebrada terminada en flecha hacia arriba) que muestra u oculta este panel.
21. Añade en la barra lateral una nueva sección "PREVISIONES", con el mismo icono de gráfico ascendente. Este botón, el de la barra de herramientas (punto 20) y la "X" del propio panel (punto 19) controlan el mismo estado: deben estar siempre sincronizados entre sí (si uno lo oculta, los otros dos reflejan inmediatamente que está oculto, y viceversa). El icono de "PREVISIONES" sigue el mismo criterio visual que el resto de secciones: gris en reposo, azul con fondo blanco cuando el panel está visible.

## Pantalla "Categorías": rediseño completo

Sustituye por completo el sistema de pestañas (Gastos/Ingresos/Traspasos) que había hasta ahora por lo siguiente, manteniendo el mismo estilo visual, estructura y comportamiento que el resto de la aplicación:

22. Añade los botones "Exportar" e "Importar" en la parte superior, justo antes del botón azul "+ Nueva categoría", con los mismos iconos, dimensiones y comportamiento que sus equivalentes en Movimientos. Ese bloque se mantiene alineado a la derecha incluso al redimensionar la ventana.
23. Añade una zona de búsqueda y filtros con los campos:
    - Descripción: busca por nombre tanto en categorías como en subcategorías.
    - Tipo: opciones "Todos los tipos", "Gastos", "Ingresos", "Transferencias".
    - Mostrar: opciones "Categorías" (solo categorías principales), "Subcategorías" (solo subcategorías, en listado plano), "Todas" (categorías y subcategorías juntas, conservando la jerarquía visual mediante las flechas de desplegar/contraer).
24. Estado inicial por defecto al abrir la pantalla: Tipo = "Todos los tipos", Mostrar = "Categorías" (por tanto, solo se ven las categorías principales de todos los tipos, sin subcategorías, hasta que el usuario cambie el filtro).
25. Añade un botón de icono "Limpiar" en la zona de filtros. Al pulsarlo, se eliminan la búsqueda, los filtros y cualquier ordenación aplicada, volviendo al estado por defecto del punto 24.
26. Formato del importe: `Gasto acumulado / Presupuesto total` (ej. `260,17 € / 1.000,00 €`). El gasto acumulado mantiene su estilo actual (color neutro). El presupuesto total va en negrita y cambia de color según el porcentaje consumido: verde hasta 70%, naranja entre 71% y 90%, rojo a partir de 91%. Si la categoría no tiene presupuesto asignado, en su lugar se muestra el texto "Sin asignar".
27. Selección y edición: al hacer clic en cualquier parte de una fila (categoría o subcategoría) — excepto la flecha de desplegar — se resalta la fila y se abre su panel de edición, con el mismo comportamiento que ya existe en Movimientos. La flecha de desplegar/contraer subcategorías nunca selecciona ni abre edición, solo expande o colapsa.
28. Columna "Tipo" al principio de la tabla, antes del nombre de la categoría, representada con un icono: círculo rojo con flecha hacia abajo (Gastos), círculo verde con flecha hacia arriba (Ingresos), círculo azul con dos flechas horizontales en sentidos opuestos (Transferencias) — mismo tamaño y alineación en todas las filas. (Nota: esto sustituye a la versión anterior de este mismo icono, que usaba flechas verticales para transferencias — ahora deben ser horizontales.)
29. Añade una fila de cabecera sobre el listado, con este orden de columnas: Tipo, Categoría, Progreso, Presupuesto, con el mismo formato visual que las cabeceras de columna de Movimientos.
30. Las 4 cabeceras son clicables y ordenan el listado, alternando ascendente/descendente con cada clic, mostrando visualmente cuál está activa:
    - Tipo: ordena Gastos → Ingresos → Transferencias (y a la inversa en descendente).
    - Categoría: alfabético por nombre.
    - Progreso: por porcentaje de presupuesto consumido.
    - Presupuesto: por importe presupuestado.
31. Al ordenar o filtrar con Mostrar="Todas" (categorías + subcategorías a la vez), las subcategorías deben permanecer siempre visualmente asociadas a su categoría principal — el orden se aplica a las categorías principales, y cada una conserva sus propias subcategorías anidadas debajo, sin mezclarlas sueltas en la ordenación general.
32. Los iconos de editar y eliminar solo aparecen al pasar el ratón por encima de la fila (categoría o subcategoría), y permanecen ocultos el resto del tiempo.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-sidebar-programador.md
**Fecha:** 16 ago, 17:01  
**Resumen:** Consistencia de barra lateral, Programador rediseño completo, importe personalizado

Última tanda de cambios, adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada.

## Barra lateral: consistencia y bug de selección múltiple

1. Los seis elementos principales de la barra lateral (Documentos, Cuentas, Programador, Categorías, Filtros, Previsiones) deben tener exactamente el mismo tamaño, formato y alineación entre sí: mismo alto de fila, mismo tamaño de icono (12px) y texto (11px, mayúsculas), mismo padding, mismo criterio de color (gris en reposo, icono azul + fondo blanco cuando está activo).
2. Bug: actualmente pueden quedar marcados varios de estos elementos a la vez, porque cada uno deriva su estado "activo" de una condición independiente (por ejemplo, el de Documentos de si el formulario está abierto, el de Cuentas de si `activeAccounts` está vacío, etc.), y esas condiciones no son mutuamente excluyentes entre sí. La solución es centralizar el resaltado en una sola variable de estado que indique qué sección está activa en la barra lateral (en el ledger.jsx adjunto se llama `sidebarSection`, con valores `"documentos" | "cuentas" | "recurring" | "categories" | "filters" | "previsiones"`), y que cada uno de los seis botones (incluida la selección de una cuenta individual dentro de "Cuentas") actualice esa misma variable al pulsarse. El resaltado de cada botón se decide comparando contra esa única variable, nunca contra múltiples condiciones sueltas.
3. Añade un poco más de separación vertical entre los tres bloques de la barra lateral: Documentos, Cuentas (con sus grupos), y el bloque de Programador/Categorías/Filtros/Previsiones.

## Categorías (ajustes menores sobre lo ya implementado)

4. Cambia el icono de la sección "Categorías" (tanto en la barra lateral como en el título de su pantalla) por un icono de etiqueta ("Tag"), en vez del icono de lista que se usó en la iteración anterior.
5. La flecha para desplegar/contraer subcategorías debe estar disponible siempre que una categoría tenga subcategorías, independientemente del filtro "Mostrar" seleccionado (antes solo aparecía con "Mostrar: Todas" — ahora debe verse también con "Mostrar: Categorías", permitiendo desplegar puntualmente aunque el filtro por defecto no las muestre).

## Pantalla "Programador": rediseño completo

Igual que se hizo con Movimientos y Categorías, aplica esta misma estructura a Programador, manteniendo el estilo visual y comportamiento coherente con el resto de la app:

6. Añade los botones "Exportar" e "Importar" en la parte superior, justo antes del botón azul "+ Nueva operación", con los mismos iconos, dimensiones y comportamiento que sus equivalentes en Movimientos y Categorías. Bloque alineado a la derecha, incluso al redimensionar la ventana. Nota: en el ledger.jsx adjunto, el botón "Importar" está presente visualmente pero sin lógica de importación conectada, porque no se ha definido el formato de columnas del CSV para operaciones recurrentes — defínelo con sentido común (Fecha, Cuenta, Tipo, Periodicidad, Descripción, Importe, etc., similar al de Movimientos) y conéctalo.
7. Añade una zona de filtros con los campos, en este orden: Descripción, Cuenta, Tipo, Agrupar.
8. "Descripción": busca operaciones recurrentes por su descripción.
9. "Cuenta": selección múltiple de cuentas, con una opción "Todas" que aparece marcada por defecto. Comportamiento: seleccionar "Todas" desmarca las demás; seleccionar una cuenta concreta desmarca "Todas"; se pueden marcar varias cuentas concretas a la vez; si se desmarcan todas las cuentas concretas, vuelve a quedar "Todas" seleccionada automáticamente. El listado se filtra por las cuentas marcadas.
10. "Tipo": Todos los tipos / Gastos / Ingresos / Transferencias, por defecto "Todos los tipos". Nota: con el modelo de datos actual, las transferencias no se registran como series recurrentes, así que la opción "Transferencias" no mostrará resultados por ahora — es una limitación conocida, no un fallo de esta pantalla.
11. "Agrupar": criterio de agrupación del listado (Ninguna/Fecha/Cuenta/Tipo/Periodicidad/Recurrencia), por defecto "Ninguna".
12. Botón de icono "Limpiar" en la zona de filtros: al pulsarlo, se eliminan la búsqueda, los filtros, las agrupaciones y las ordenaciones aplicadas, volviendo a la vista predeterminada exacta: Descripción vacía, Cuenta "Todas", Tipo "Todos los tipos", Agrupar "Ninguna", ordenado por fecha, sin ninguna agrupación activa.
13. Icono correspondiente delante del título "Programador" (ya implementado: flechas en redondo).
14. Debajo del título, subtítulo "Movimientos recurrentes", y en la misma línea: total de ocurrencias de ingresos previstas para el mes en curso (en verde, con icono de ingreso), total de ocurrencias de gastos previstas para el mes en curso (en rojo, con icono de gasto), y el rango de fechas del mes en curso. Estos importes se calculan proyectando las ocurrencias reales de cada serie dentro del mes (no solo la "próxima" de cada serie), aplicando los importes personalizados por fecha cuando existan.
15. El contador junto a "PROGRAMADOR" en la barra lateral debe coincidir siempre con el número real de series recurrentes (no con el número de ocurrencias generadas) — ya implementado correctamente en el ledger.jsx (usa el mismo cálculo deduplicado por serie que la propia lista).
16. Columna "Tipo": sustituye cualquier texto por el icono correspondiente (círculo rojo + flecha abajo para Gastos, círculo verde + flecha arriba para Ingresos, círculo azul + dos flechas horizontales opuestas para Transferencias) — mismo componente que ya se usa en Categorías.
17. Nueva columna "Recurrencia" justo antes de "Importe", que indica "Fija" o "Variable" (una serie es "Variable" si tiene al menos un importe personalizado configurado en alguna fecha; si no, es "Fija").
18. Orden final de columnas: Fecha, Cuenta, Tipo, Periodicidad, Descripción, Recurrencia, Importe.
19. Vista predeterminada: lista continua ordenada por fecha, sin ningún encabezado de agrupación.
20. Todas las cabeceras de columna son clicables: el primer clic ordena de mayor a menor (descendente) según esa columna y agrupa el listado por ese mismo criterio; un segundo clic invierte a ascendente. La columna y dirección activas se indican visualmente (negrita/color, igual que en Movimientos).
21. El botón "Limpiar" también debe eliminar cualquier ordenación/agrupación aplicada mediante las cabeceras.
22. Clic en cualquier parte de una fila selecciona y abre su panel de edición, igual que en Movimientos.
23. Los iconos de editar y eliminar solo se muestran al pasar el ratón por encima de la fila.

## Importe personalizado por fecha (funcionalidad nueva)

24. Dentro del panel de edición de un movimiento recurrente, la casilla ahora se llama simplemente "Importe personalizado" (sin ningún texto explicativo adicional).
25. Al marcarla, aparece una lista donde se pueden añadir varias entradas, cada una con Fecha (usando el calendario propio de la app) e Importe. Se pueden añadir filas nuevas, editar las existentes, y eliminar cada una individualmente.
26. Cuando una fecha de la serie coincide con una de estas entradas, esa ocurrencia usa el importe personalizado en lugar del importe general de la recurrencia — el resto de ocurrencias siguen usando el importe general configurado. Esto debe aplicarse consistentemente en: la generación automática semanal de ocurrencias, la previsión de la gráfica de balance, la vista de Programador, y al materializar manualmente una fila prevista del Programador.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

# instrucciones-previsión-revision-final.md
**Fecha:** 16 ago, 17:21  
**Resumen:** Jerarquía de tamaños en barra lateral, panel de Previsión anclado abajo

Última tanda de ajustes antes de dar por cerrada esta ronda de cambios. Adjunto ledger.jsx actualizado como referencia exacta de diseño y comportamiento. Léelo entero antes de tocar nada.

## Barra lateral: jerarquía de tamaños

1. Los seis títulos principales (DOCUMENTOS, CUENTAS, PROGRAMADOR, CATEGORÍAS, FILTROS, PREVISIONES) deben ser más grandes (texto 12px en negrita, icono 13px) que todo lo que cuelga de ellos.
2. Lo que cuelga de "DOCUMENTOS" (la lista de documentos) y de "CUENTAS" (los grupos Bancos/Ahorro/Tarjetas/Efectivo y las cuentas dentro de cada uno) debe ser visiblemente más pequeño que esos títulos principales, y debe tener más indentación hacia la derecha que antes (en el ledger.jsx adjunto se ha añadido `padding-left` extra a esas filas para conseguirlo).

## Panel de "Previsión de balance": mismo formato que las demás pantallas, gráfico anclado abajo

3. La cabecera del panel debe usar el mismo formato que el resto de pantallas (Movimientos, Programador, Categorías): un `<h2>` con el icono de la sección y el texto "Prevision de balance" a 17px, con el mismo padding que las demás (`20px 24px 4px`), en vez del estilo de cabecera compacta con fondo gris que tenía antes.
4. El panel completo tiene una altura fija (en el ledger.jsx se ha usado 440px como referencia, ajústalo si hace falta según el diseño final) y se organiza en tres bloques verticales:
   - Cabecera (fija arriba, no se desplaza).
   - Controles de rango + lista de movimientos previstos (esta lista es la que tiene scroll interno si hay muchas filas, ocupando el espacio disponible entre la cabecera y el gráfico).
   - El gráfico, que queda **anclado siempre abajo del todo**, visible sin necesidad de hacer scroll — igual que ya funcionaba el bloque "Total seleccionado" al final de la pantalla de Movimientos.
5. La lista de movimientos previstos (añadida en la tanda anterior) debe seguir mostrando: Fecha, Cuenta, Descripción e Importe de cada movimiento dentro del rango de fechas seleccionado (reales ya registrados + proyección de recurrencias, estas últimas algo atenuadas visualmente).

## Notas de una revisión interna del prototipo

6. Se ha revisado el ledger.jsx en busca de referencias rotas, funciones duplicadas y código muerto. Todo compila y funciona correctamente. Dos apuntes menores, no bloqueantes:
   - El botón "Importar" de la pantalla Programador todavía no tiene la lógica de importación conectada (falta definir el formato exacto de columnas del CSV para operaciones recurrentes — ver instrucción anterior).
   - Hay una variable de estado (`colorPickerOpen`) que quedó sin uso tras rediseños anteriores; se puede eliminar con seguridad si aparece durante la implementación, no afecta a nada.

## Pendiente de definir (no implementar todavía)

7. El icono de "vincular documento" (cadena) sigue pendiente de una explicación más clara por parte de la usuaria sobre qué debe hacer exactamente al pulsarlo — no toques su comportamiento actual hasta recibir una instrucción específica al respecto en la próxima tanda.

Como siempre, ve aplicando por bloques y cuéntame qué vas haciendo en cada uno.


---

