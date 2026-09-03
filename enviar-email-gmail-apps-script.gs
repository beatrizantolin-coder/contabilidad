/**
 * ============================================================================
 * ENVIAR LA PLANTILLA "email-template-imagen-vertical.html" POR GMAIL
 * usando Google Apps Script (GmailApp.sendEmail).
 *
 * COMO USARLO:
 * 1) Ve a https://script.google.com -> "Nuevo proyecto".
 * 2) Borra el contenido por defecto y pega TODO este archivo.
 * 3) Rellena las variables de la seccion "PERSONALIZA AQUI" (asunto,
 *    destinatarios, y sustituye la URL de la imagen dentro del HTML).
 * 4) En la barra superior, selecciona la funcion "enviarCorreosHTML" y
 *    pulsa "Ejecutar" (icono de play).
 * 5) La primera vez, Google pedira autorizacion para enviar correos en tu
 *    nombre (usa tu propia cuenta de Gmail) -> acepta.
 * 6) Revisa la carpeta "Enviados" de Gmail para confirmar el envio.
 *
 * NOTA SOBRE LIMITES DE ENVIO: las cuentas de Gmail gratuitas tienen una
 * cuota diaria de envios via Apps Script/GmailApp. No tengo un dato
 * verificado y actualizado de la cifra exacta vigente hoy -> para 3 correos
 * no supone ningun problema, pero si en el futuro envias mas volumen,
 * confirma la cuota actual en la documentacion oficial de Apps Script
 * (Servicios avanzados / Cuotas).
 * ============================================================================
 */

function enviarCorreosHTML() {

  // ============================================================
  // PERSONALIZA AQUI
  // ============================================================
  var asunto = "Tu asunto aqui";

  var destinatarios = [
    "correo1@ejemplo.com",
    "correo2@ejemplo.com",
    "correo3@ejemplo.com"
  ];

  // Texto plano de respaldo: lo ven los clientes que no muestran HTML.
  var cuerpoTextoPlano = "Este correo requiere un cliente compatible con HTML para verse correctamente.";

  // ============================================================
  // CUERPO HTML
  // IMPORTANTE: sustituye "URL_DE_TU_IMAGEN_AQUI.jpg" (linea marcada mas
  // abajo con "<<<") por la URL publica HTTPS real de tu imagen, y ajusta
  // width/height si tu imagen no es exactamente 480x853.
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

  .bg-color { background-color: #F5F0E6; }

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

<body class="bg-color" style="margin:0; padding:0; background-color:#F5F0E6;">

<div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
  &nbsp;
</div>

<center class="bg-color" style="width:100%; background-color:#F5F0E6;">

  <!--[if mso]>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F0E6">
  <tr>
  <td align="center">
  <![endif]-->

  <table role="presentation" class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F0E6" style="background-color:#F5F0E6;">
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
  // <<< La URL de la imagen a sustituir esta en la etiqueta <img src="..."> de arriba.

  destinatarios.forEach(function (destinatario) {
    GmailApp.sendEmail(destinatario, asunto, cuerpoTextoPlano, {
      htmlBody: cuerpoHTML
    });
  });

  Logger.log("Enviados " + destinatarios.length + " correos.");
}
