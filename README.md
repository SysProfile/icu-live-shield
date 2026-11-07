# ICU.Live Shield

Extensión para Chrome, Edge, Opera y Firefox que le permite al dueño de un canal de YouTube mostrar en ICU.Live su
**cantidad exacta de suscriptores**, en lugar del número redondeado que YouTube muestra públicamente. Un canal que la
usa y cuyo número coincide con el público lleva el escudo 🛡️ en el monitor de ICU.Live.

## Qué hace

- Funciona solamente en **YouTube Studio** (`studio.youtube.com`), en el navegador del dueño del canal.
- No hace pedidos propios a YouTube: mira la respuesta que YouTube Studio ya recibe cuando muestra el recuento de
  suscriptores y toma **sólo** dos datos: el total de suscriptores y el ID del canal (`UC…`).
- Cuando el número cambia, lo envía a `https://cdn.icu.live/shield/`. Si ICU.Live no responde, el dato se descarta.
- No lee ningún otro dato del canal ni de la cuenta de Google, ni otras páginas. No pide claves ni contraseñas.

## Cómo se vincula

1. En el panel de ICU.Live, en **Escudo**, el dueño del canal genera un código de vinculación (vence a los 15 minutos).
2. Lo pega en la extensión, o abre el enlace del QR en el navegador donde la tiene instalada.
3. ICU.Live sólo acepta los números de YouTube Studio del canal vinculado.

## LED del ícono

Sólo mientras se está viendo YouTube Studio; en cualquier otro sitio el ícono va sin LED y **Enviar / No enviar** no se puede tocar.

- **Rojo:** vinculada y enviando; el último número fue aceptado.
- **Ámbar y gris titilando:** se está viendo YouTube Studio fuera de *Estadísticas → Recuento de suscriptores en tiempo real*; así no se envía nada.
- **Gris:** sin vincular, el último envío falló o está en **No enviar**.

## Pestaña despierta

Mientras la pestaña está en el recuento de suscriptores y la extensión envía, la extensión le pide al navegador que no
la descarte y toma un *Web Lock* para que no la congele. Si igual se duerme, ICU.Live apaga el escudo a los 3 minutos
sin datos.

## Cómo se pausa

El botón **No enviar** deja de mandar el número sin desvincular la extensión; **Enviar** lo reanuda.

## Cómo se desvincula

Con el botón **Desvincular** de la extensión, desde el panel de ICU.Live, o desinstalando la extensión.

## Archivos

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Permisos: `storage` (guardar el vínculo), `alarms` (mantener el titileo del LED) y `https://cdn.icu.live/shield/*` (enviar el número). |
| `inject.js` | Dentro de YouTube Studio: toma el total de suscriptores de la respuesta de Studio. |
| `bridge.js` | Le pasa ese número a la extensión. |
| `bg.js` | Guarda el vínculo y envía el número a ICU.Live. |
| `link-page.js` | Vincula la extensión desde el enlace del QR. |
| `popup.html`, `popup.js` | Ventana de la extensión: vincular, estado y desvincular. |

## Licencia

Código publicado para que cualquiera pueda revisar qué hace. Todos los derechos reservados: ver [LICENSE](LICENSE).
Las sugerencias son bienvenidas como *issues*.
