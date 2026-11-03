<p align="center"><img src="../imagens/cara.gif" width="320" alt="Kara, la navegadora de Oceano, parpadeando"></p>

> ¡Hola! Soy Kara, tu navegadora. La primera de un navegador con agentes de IA integrados desde el principio. Y adivina qué: el primero hecho en vibe coding también 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <b>Español</b> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

Un navegador minimalista, abierto y en pixel art, para quienes juegan, crean y programan.
Basado en Chromium, con conteo anónimo de uso solo si lo autorizas, con temas y mods en Lua (el lenguaje creado en la PUC-Rio),
una página de inicio que es una mesa de ventanas sobre un mar pixelado, y herramientas de creación
dentro del propio navegador.

> **Estado:** en desarrollo. → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## Por qué existe

> Oceano no quiere ser solo otro navegador. Quiere ser un lugar donde las personas creen, aprendan y muestren lo que sueñan.

Oceano está hecho de píxeles, no es el mar de verdad, pero quiere dar la misma sensación de mirarlo: la
inmensidad, la libertad, el horizonte lleno de posibilidades. ¿A dónde puedo ir? ¿Hasta dónde puedo crecer?
¿A dónde logro llegar? Existe para ayudar a las personas a responder eso, y por eso es gratis.

Está hecho para quienes crean y para quienes graban videos, sobre todo para quienes están empezando: presentar un
negocio propio, una idea, un sueño, hacer un vlog. Cada herramienta debe enseñar algo, y la comunidad
(grupos de intercambio de conocimiento, al ritmo de un foro) debe ayudar a cada persona a crecer. Esa es la premisa
que guía todo el proyecto: lee el [manifiesto](../MANIFESTO.md).

Los navegadores se volvieron parecidos entre sí y están llenos de cosas que nadie pidió. Oceano quiere lo
contrario: pequeño, bonito, verificable y hecho para trastear. No recolectar es mejor que proteger;
todo se queda en tu computadora; ninguna cuenta es obligatoria.

Este es un proyecto de mediano y largo plazo. La idea es dedicarme a él durante muchos años, como
Sean Murray se dedicó a No Man's Sky: lanzar pronto, escuchar a quienes lo usan y seguir mejorando, versión
tras versión, hasta convertirse en el navegador que promete ser. Y hacerlo de forma abierta, para que otras
personas puedan estudiarlo, inspirarse y llevar las ideas más lejos.

La visión completa está en [`docs/VISAO.md`](../VISAO.md).

### Cuatro preguntas, respondidas por quien lo creó

**¿Esto le enseña algo a quien lo usa?**

Yo creía que aprender música era difícil. Con un sintetizador, descubrí que no. Quiero dar acceso igualitario para que otras personas también puedan aprender.

**¿Funciona para quien está empezando y se ve bien en un video?**

¡Sí! Y cuantas más personas hagan videos mostrando lo que se puede hacer aquí, más gente va a empezar a crear algo único y libre.

**¿Respeta la privacidad y la accesibilidad?**

Es un principio base desde el inicio. Las dos cosas son importantes y necesarias, y cuento con el apoyo de todos en las primeras pruebas de esta beta.

**¿Acerca a las personas entre sí?**

En el futuro, ¿quién sabe? Un foro de discusiones al estilo de Reddit sería muy positivo. Y ya tenemos una herramienta gráfica de ambientación 3D que pesa poquísimo: toda la escena del mar, con cielo, faro y lluvia, cabe en 29 KB de código. Eso abre un potencial enorme para acercar a las personas 👀

> Tenemos un potencial increíble para crear algo nuevo, seguro, interconectado, libre y pensado para ayudar a las personas que lo usen, como símbolo de gratitud, empatía e intercambio. Y pretendo mantener todo esto libre de publicidad.

## Lo que ya existe

| Carpeta | Qué | Cómo ejecutar |
|---|---|---|
| [`simulador/`](../../simulador/) | Toda la interfaz corriendo en una página: pestañas, mesa, temas, mods en Lua/Teal, banda sonora, Strudel, PICO-8, recordatorio de agua | `python3 simulador/serve.py 5216` y abre http://localhost:5216 |
| [`app/`](../../app/) | MVP en Electron: la misma interfaz con pestañas reales (Chromium), perfiles aislados, bloqueador, mini reproductor | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite: la nueva pestaña de Oceano como extensión de Chrome | mira `extensao/README.md` |
| [`docs/`](../) | Visión y plan | — |

Algunas cosas que se pueden hacer hoy:

- **Página de inicio como mesa:** ventanas que arrastras, recoges y cierras sobre el mar con faro; cada perfil tiene su mesa.
- **Temas** (`oceano-tema/1`, solo JSON) que cambian los colores, el pixelado e incluso la hora del día del mar.
- **Mods en Lua 5.4 / Teal** en un sandbox con permisos declarados.
- **Grupos de pestañas** guardados en la página de inicio, cerrados para no gastar memoria.
- **Búsqueda con IA** (opcional, con tu propia clave) que responde en una línea e indica los sitios correctos.
- **Música:** banda sonora generativa y live coding con Strudel a través de [Stave](https://stave.live) (línea de tiempo, cuadrícula, piano roll, mezclador, visuales), con modo "en vivo" y fondo transparente sobre el mar.
- **Lo básico de un navegador:** historial, favoritos, buscar en la página, zoom, clic derecho, descargas, imprimir, pestañas que vuelven y lista en atrás y adelante.
- **Dos pantallas de inicio:** el océano con faro y la isla, con íconos para cambiar, cielo que varía y clima de tu ciudad (opcional).
- **Temas de la comunidad:** mira [`docs/TEMAS.md`](../TEMAS.md). **Mods:** [`docs/MODS.md`](../MODS.md). **Seguridad:** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Privacidad verificable:** `oceano://rede` muestra cada conexión del propio navegador.

## El gato

<p><img src="../imagens/gato.gif" width="240" alt="El gato de Oceano trabajando en la computadora"></p>

Si prefieres, tu avatar puede ser el gato. También puedes crear el tuyo, en pixel, malla o 3D.

## Grabar la pantalla con seguridad

Oceano fue pensado para aparecer en videos y directos. La información local (sitios que abriste, direcciones,
reglas de proxy) aparece escondida detrás de un bloque pixelado con candado. Al hacer clic, Oceano avisa que
eso forma parte de tus datos de seguridad y solo lo muestra si confirmas; al cerrar el navegador, todo vuelve
a quedar oculto. Las partes que necesitan un servidor local, como el editor de avatar, las enciende y
apaga el propio Oceano y solo hablan con tu computadora.

## Accesibilidad

La accesibilidad va antes que el estilo. Todo tema debe ser fácil de leer: contraste mínimo de 4,5:1 para el texto
(WCAG AA), estados que no dependan solo del color y contorno de foco visible. El editor de temas revisa el
contraste en vivo y avisa antes de guardar. Si creas temas, lee la
[guía de accesibilidad](../ACESSIBILIDADE-TEMAS.md).

## Licencia

El código de Oceano es **software libre**, bajo la [GNU GPL v3.0 o posterior](../../LICENSE):
puedes usarlo, estudiarlo, modificarlo y distribuirlo; quien distribuya una versión modificada debe
mantener el código abierto, bajo la misma licencia.

- **Los mods y los temas son tuyos.** Los mods (scripts Lua/Teal que usan la API de mods) y los temas (archivos
  `oceano-tema`) no se consideran obras derivadas de Oceano y pueden tener cualquier licencia.
  Mira el permiso adicional en [`AVISOS.md`](../../AVISOS.md).
- **Las partes de terceros** mantienen sus licencias (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  La lista completa, con lo que pide cada una, está en [`AVISOS.md`](../../AVISOS.md).

## Créditos

Oceano está hecho sobre el trabajo de mucha gente. En especial:

- **[Stave](https://stave.live)** de Mrityunjay Bhardwaj ([código en GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): el estudio de música dentro de Oceano (`oceano://stave`), con línea de tiempo, cuadrícula, piano roll, mezclador y visuales. En Oceano ganó el modo "en vivo", el fondo transparente y la grabación de video con la música.
- **[Strudel](https://strudel.cc)** de Felix Roos, Alex McLean y la comunidad ([código](https://codeberg.org/uzu/strudel), AGPL-3.0): el lenguaje de música por código que mueve a Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** de shinshin86 (MIT): el avatar animado de la Navegadora y el editor de avatar.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** y **Electron**.
- **Modelo 3D del robot cuadrúpedo** (`simulador/robo/modelos/quadrupede.3mf`), licencia BY-NC, según los datos del propio archivo: se usa **solo en el robot Cuadrúpedo**, y no en los otros robots. No está bajo la GPL de Oceano y no puede tener uso comercial.

- **[Whisper](https://github.com/openai/whisper)** de OpenAI (MIT), en la conversión ONNX de [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): la transcripción de voz, que corre en tu computadora y solo se descarga si la persona lo pide.
- **[Open-Meteo](https://open-meteo.com)**: el clima y la búsqueda de ciudades, sin clave y sin cuenta.

La lista completa, con las licencias, está en [`AVISOS.md`](../../AVISOS.md) y en la página Sobre la Navegadora.

## Autor

Creado por **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Las cuentas oficiales de Oceano todavía van a nacer.
