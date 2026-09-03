/**
 * ============================================================================
 * AUTO-RESPUESTA (estilo "respuesta de vacaciones") LIMITADA A 3 DIRECCIONES
 * usando Google Apps Script + GmailApp.
 *
 * QUE HACE:
 * Cada vez que se ejecuta (mediante un disparador programado, ver mas abajo),
 * busca correos entrantes de las 3 direcciones indicadas que aun NO hayan
 * recibido respuesta automatica, y les responde dentro del mismo hilo con
 * la plantilla HTML de imagen vertical. Marca el hilo con una etiqueta para
 * no volver a responder dos veces al mismo hilo.
 *
 * IMPORTANTE - LO QUE ESTO NO ES:
 * Gmail/Apps Script no tiene un disparador nativo de tipo "cuando llega un
 * correo nuevo" (a diferencia de, por ejemplo, el envio de un formulario de
 * Google). Por eso esta funcion se ejecuta de forma PERIODICA mediante un
 * disparador basado en tiempo (cada X minutos), no de forma instantanea.
 * Hay por tanto un retraso de hasta el intervalo que configures (por
 * defecto 1 minuto, el minimo que permite Apps Script) entre que llega
 * el correo y se envia la respuesta.
 *
 * COMO USARLO:
 * 1) Ve a https://script.google.com -> "Nuevo proyecto".
 * 2) Pega TODO este archivo.
 * 3) Rellena la seccion "PERSONALIZA AQUI" (las 3 direcciones, asunto,
 *    y verifica la URL de la imagen dentro del HTML). Solo hay que
 *    editarlo en un sitio: las constantes al principio del archivo.
 * 4) IMPORTANTE, ANTES de activar el disparador: ejecuta UNA VEZ la
 *    funcion "marcarHistoricoComoRespondido". Esto evita que el script
 *    intente responder de golpe a correos antiguos que esas direcciones
 *    ya te hubieran mandado antes (eso es justo lo que causa el error
 *    "User-rate limit exceeded (Mail sending)" si te llegara a pasar).
 * 5) Ejecuta UNA VEZ la funcion "crearDisparador" (selecciona esa funcion
 *    en el desplegable de arriba y pulsa "Ejecutar"). Esto instala el
 *    disparador periodico. La primera vez pedira autorizacion -> acepta.
 * 6) Listo. A partir de ahi, "autoResponderVacaciones" se ejecutara sola
 *    cada 1 minuto sin que tengas que hacer nada mas ni tener el
 *    ordenador encendido (se ejecuta en los servidores de Google). Solo
 *    responde a correos de las ultimas 24 horas (ver "newer_than:1d" en
 *    el codigo), y a lo sumo 5 hilos por ejecucion, para evitar rafagas.
 * 7) Cuando quieras DESACTIVARLA (p.ej. al volver de vacaciones), ejecuta
 *    UNA VEZ la funcion "eliminarDisparadores".
 *
 * LIMITES QUE NO PUEDO CONFIRMARTE CON CERTEZA:
 * - Cuota diaria de envios/respuestas de Gmail via Apps Script para cuentas
 *   gratuitas: no tengo la cifra exacta vigente hoy verificada. Para el
 *   trafico de solo 3 remitentes no deberia ser un problema, pero si en
 *   algun momento deja de enviar, revisa la documentacion oficial de
 *   Apps Script (cuotas de servicios avanzados) o el propio mensaje de
 *   error en el registro de ejecuciones.
 * - Si alguna de esas 3 direcciones tiene tambien un auto-responder propio
 *   activado, podria generarse un intercambio de respuestas automaticas
 *   entre ambos sistemas. Esta plantilla evita responder dos veces AL MISMO
 *   HILO (via la etiqueta), lo que limita el riesgo, pero no puedo
 *   garantizarte que sea imposible en todos los escenarios.
 * ============================================================================
 */

// ============================================================
// PERSONALIZA AQUI (un unico sitio: lo usan todas las funciones)
// ============================================================
var DIRECCIONES_PERMITIDAS = [
  "correo1@ejemplo.com",
  "correo2@ejemplo.com",
  "correo3@ejemplo.com"
];

var ASUNTO_RESPUESTA = "Respuesta automatica";

var NOMBRE_ETIQUETA = "Auto-respondido-vacaciones";


function autoResponderVacaciones() {

  var direccionesPermitidas = DIRECCIONES_PERMITIDAS;
  var asunto = ASUNTO_RESPUESTA;
  var nombreEtiqueta = NOMBRE_ETIQUETA;

  // Texto plano de respaldo: lo ven los clientes que no muestran HTML.
  var cuerpoTextoPlano = "Este correo requiere un cliente compatible con HTML para verse correctamente.";

  // ============================================================
  // CUERPO HTML (misma plantilla que email-template-imagen-vertical.html)
  // ============================================================
  var cuerpoHTML = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Plantilla email - imagen vertical a pantalla completa</title>

<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
<o:AllowPNG/>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->

<style>
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
    width: 100% !important;
  }
  * {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
  table, td {
    border-collapse: collapse !important;
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  img {
    -ms-interpolation-mode: bicubic;
    border: 0;
    line-height: 100%;
    outline: none;
    text-decoration: none;
    display: block;
  }
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
  }
  #MessageViewBody, #MessageWebViewDiv {
    width: 100% !important;
  }

  .bg-color { background-color: #e8e1e1; }

  .hero-img {
    width: 100%;
    max-width: 480px;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  @media screen and (min-width: 600px) {
    .email-wrapper { height: 100vh !important; }
    .hero-img {
      width: auto !important;
      max-width: none !important;
      height: 100vh !important;
      max-height: 100vh !important;
    }
  }

  @media screen and (max-width: 599px) {
    .hero-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
  }
</style>
</head>

<body class="bg-color" style="margin:0; padding:0; background-color:#e8e1e1;">

<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  &nbsp;
</div>

<center class="bg-color" style="width:100%; background-color:#e8e1e1;">

  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8e1e1">
  <tr>
  <td align="center">
  <![endif]-->

  <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8e1e1" style="background-color:#e8e1e1;">
    <tr>
      <td align="center" valign="middle" style="padding:0;">

        <img src="https://www.b-nice.es/images/vacaciones_v.jpg"
             alt="Descripcion de la imagen"
             class="hero-img"
             width="480"
             height="753"
             style="width:100%; max-width:480px; height:auto; display:block; margin:0 auto; border:0;" />

      </td>
    </tr>
  </table>

  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->

</center>

</body>
</html>`;

  // ============================================================
  // LOGICA: buscar hilos de esas direcciones sin responder aun
  // ============================================================
  var etiqueta = GmailApp.getUserLabelByName(nombreEtiqueta);
  if (!etiqueta) {
    etiqueta = GmailApp.createLabel(nombreEtiqueta);
  }

  var consultaRemitentes = direccionesPermitidas
    .map(function (d) { return "from:" + d; })
    .join(" OR ");

  // IMPORTANTE: "newer_than:1d" limita la busqueda a las ultimas 24 horas.
  // Sin este limite, GmailApp.search() revisa TODO tu historial de correo,
  // y si alguna de las 3 direcciones ya te habia escrito antes, la primera
  // ejecucion intentaria responder a todos esos hilos antiguos de golpe,
  // lo que dispara el limite de envio de Gmail ("User-rate limit exceeded").
  // Antes de activar esto, ejecuta UNA VEZ "marcarHistoricoComoRespondido"
  // (mas abajo) para que el historial antiguo no se procese nunca.
  var query = "(" + consultaRemitentes + ") -label:" + nombreEtiqueta.replace(/\s+/g, "-") + " newer_than:1d";

  // Limite de hilos a procesar por ejecucion (evita ráfagas de envio).
  var maximoPorEjecucion = 5;
  var hilos = GmailApp.search(query, 0, maximoPorEjecucion);
  var respondidos = 0;

  hilos.forEach(function (hilo) {
    var mensajes = hilo.getMessages();
    var ultimoMensaje = mensajes[mensajes.length - 1];
    var remitente = ultimoMensaje.getFrom().toLowerCase();

    var coincide = direccionesPermitidas.some(function (d) {
      return remitente.indexOf(d.toLowerCase()) !== -1;
    });

    if (coincide) {
      ultimoMensaje.reply(cuerpoTextoPlano, {
        htmlBody: cuerpoHTML,
        subject: asunto
      });
      hilo.addLabel(etiqueta);
      respondidos++;
      Utilities.sleep(1000); // pequeña pausa entre envios, por seguridad
    }
  });

  Logger.log("Hilos respondidos en esta ejecucion: " + respondidos);
}

/**
 * EJECUTA ESTA FUNCION UNA SOLA VEZ, ANTES de fiarte del disparador
 * automatico, si alguna de las 3 direcciones ya te habia escrito antes
 * hoy (o en cualquier momento). Pone la etiqueta a TODOS los hilos
 * antiguos que coincidan, SIN enviar ningun correo, para que
 * "autoResponderVacaciones" nunca intente responderlos.
 */
function marcarHistoricoComoRespondido() {
  var direccionesPermitidas = DIRECCIONES_PERMITIDAS;
  var nombreEtiqueta = NOMBRE_ETIQUETA;

  var etiqueta = GmailApp.getUserLabelByName(nombreEtiqueta);
  if (!etiqueta) {
    etiqueta = GmailApp.createLabel(nombreEtiqueta);
  }

  var consultaRemitentes = direccionesPermitidas
    .map(function (d) { return "from:" + d; })
    .join(" OR ");
  var query = "(" + consultaRemitentes + ") -label:" + nombreEtiqueta.replace(/\s+/g, "-");

  var hilos = GmailApp.search(query, 0, 500);
  hilos.forEach(function (hilo) {
    hilo.addLabel(etiqueta);
  });

  Logger.log("Hilos marcados como ya respondidos (sin enviar nada): " + hilos.length);
}

/**
 * Ejecuta esta funcion UNA SOLA VEZ para instalar el disparador periodico.
 * Cambia "everyMinutes(1)" si quieres otra frecuencia (valores permitidos
 * por Apps Script: 1, 5, 10, 15 o 30 minutos; no admite segundos).
 */
function crearDisparador() {
  eliminarDisparadores(); // evita duplicar el disparador si ya existia uno
  ScriptApp.newTrigger("autoResponderVacaciones")
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log("Disparador creado: autoResponderVacaciones se ejecutara cada 1 minuto.");
}

/**
 * Ejecuta esta funcion para DESACTIVAR la auto-respuesta (p.ej. al volver
 * de vacaciones). Elimina todos los disparadores de este proyecto.
 */
function eliminarDisparadores() {
  var disparadores = ScriptApp.getProjectTriggers();
  disparadores.forEach(function (d) {
    ScriptApp.deleteTrigger(d);
  });
  Logger.log("Disparadores eliminados: " + disparadores.length);
}
