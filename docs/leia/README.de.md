<p align="center"><img src="../imagens/cara.gif" width="320" alt="Cara, die Navigatorin von Oceano, beim Blinzeln"></p>

> Hi! Ich bin Cara, deine Navigatorin. Die erste in einem Browser mit KI-Agenten, die von Anfang an eingebaut sind. Und rate mal: Der erste, der im Vibe Coding entstanden ist, auch 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <b>Deutsch</b> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

Ein minimalistischer, offener Browser in Pixel Art, für alle, die spielen, kreieren und programmieren.
Basiert auf Chromium, mit anonymer Nutzungszählung nur, wenn du es erlaubst, mit Themes und Mods in Lua (der an der PUC-Rio entwickelten Sprache),
einer Startseite, die ein Schreibtisch aus Fenstern über einem verpixelten Meer ist, und Werkzeugen zum Kreieren
direkt im Browser selbst.

> **Stand:** in Entwicklung. → macOS (Apple Silicon): [Releases](https://github.com/hericdk/oceano/releases/latest)

## Warum es das gibt

> Oceano will nicht nur ein weiterer Browser sein. Er will ein Ort sein, an dem Menschen kreieren, lernen und zeigen, wovon sie träumen.

Oceano besteht aus Pixeln, er ist nicht das echte Meer, aber er will dasselbe Gefühl geben, wenn man es ansieht: die
Weite, die Freiheit, der Horizont voller Möglichkeiten. Wohin kann ich gehen? Wie weit kann ich wachsen?
Wo kann ich ankommen? Er existiert, um Menschen zu helfen, das zu beantworten, und deshalb ist er kostenlos.

Er ist für alle gemacht, die kreieren und Videos aufnehmen, vor allem für Einsteiger: ein eigenes
Geschäft vorstellen, eine Idee, einen Traum, einen Vlog machen. Jedes Werkzeug soll etwas beibringen, und die Community
(Gruppen zum Wissensaustausch, im Rhythmus eines Forums) soll jedem Menschen helfen zu wachsen. Das ist die Prämisse,
die das ganze Projekt leitet: Lies das [Manifest](../MANIFESTO.md).

Browser sind sich ähnlich geworden und voll mit Dingen, die niemand verlangt hat. Oceano will das
Gegenteil: klein, schön, überprüfbar und zum Basteln gemacht. Nicht zu sammeln ist besser als zu schützen;
alles bleibt auf deinem Computer; kein Konto ist Pflicht.

Das ist ein mittel- und langfristiges Projekt. Die Idee ist, mich viele Jahre lang damit zu beschäftigen, so wie
Sean Murray sich No Man's Sky gewidmet hat: früh veröffentlichen, auf die hören, die es nutzen, und weiter verbessern, Version
für Version, bis es der Browser wird, der er verspricht zu sein. Und das offen zu tun, damit andere
Menschen es studieren, sich inspirieren lassen und die Ideen weitertragen können.

Die ganze Vision steht in [`docs/VISAO.md`](../VISAO.md).

### Vier Fragen, beantwortet von dem, der ihn gemacht hat

**Bringt das denen, die es nutzen, etwas bei?**

Ich dachte immer, Musik zu lernen sei schwer. Mit einem Synthesizer habe ich entdeckt, dass das nicht stimmt. Ich will gleichen Zugang schaffen, damit auch andere Menschen lernen können.

**Funktioniert es für Einsteiger und macht es sich gut in einem Video?**

Ja! Und je mehr Leute Videos machen, die zeigen, was hier möglich ist, desto mehr Menschen fangen an, etwas Einzigartiges und Freies zu kreieren.

**Respektiert es Privatsphäre und Barrierefreiheit?**

Das ist von Anfang an ein Grundprinzip. Beides ist wichtig und notwendig, und ich zähle auf die Unterstützung von allen bei den ersten Tests dieser Beta.

**Bringt es Menschen einander näher?**

In Zukunft, wer weiß? Ein Diskussionsforum im Stil von Reddit wäre sehr positiv. Und wir haben schon ein grafisches Werkzeug für 3D-Atmosphäre, das extrem wenig wiegt: Die ganze Meeresszene, mit Himmel, Leuchtturm und Regen, passt in 29 KB Code. Das eröffnet ein riesiges Potenzial, Menschen einander näher zu bringen 👀

> Wir haben ein unglaubliches Potenzial, etwas Neues, Sicheres, Vernetztes, Freies zu schaffen, gedacht, um den Menschen zu helfen, die es nutzen, als Symbol für Dankbarkeit, Empathie und Austausch. Und ich will das alles frei von Werbung halten.

## Was es schon gibt

| Ordner | Was | Wie man es startet |
|---|---|---|
| [`simulador/`](../../simulador/) | Die ganze Oberfläche läuft in einer Seite: Tabs, Schreibtisch, Themes, Mods in Lua/Teal, Soundtrack, Strudel, PICO-8, Wassererinnerung | `python3 simulador/serve.py 5216` und öffne http://localhost:5216 |
| [`app/`](../../app/) | MVP in Electron: dieselbe Oberfläche mit echten Tabs (Chromium), isolierten Profilen, Blocker, Mini-Player | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite: der neue Tab von Oceano als Chrome-Erweiterung | siehe `extensao/README.md` |
| [`docs/`](../) | Vision und Plan | — |

Ein paar Dinge, die du heute schon tun kannst:

- **Startseite als Schreibtisch:** Fenster, die du über dem Meer mit dem Leuchtturm ziehen, einklappen und schließen kannst; jedes Profil hat seinen eigenen Schreibtisch.
- **Themes** (`oceano-tema/1`, nur JSON), die die Farben, die Verpixelung und sogar die Tageszeit des Meeres ändern.
- **Mods in Lua 5.4 / Teal** in einer Sandbox mit deklarierten Berechtigungen.
- **Tab-Gruppen**, die auf der Startseite gespeichert und geschlossen werden, damit sie keinen Speicher verbrauchen.
- **KI-Suche** (optional, mit deinem eigenen Schlüssel), die in einer Zeile antwortet und auf die richtigen Seiten verweist.
- **Musik:** generativer Soundtrack und Live Coding mit Strudel über [Stave](https://stave.live) (Timeline, Raster, Piano Roll, Mixer, Visuals), mit „Live"-Modus und transparentem Hintergrund über dem Meer.
- **Die Grundlagen eines Browsers:** Verlauf, Lesezeichen, Auf der Seite suchen, Zoom, Rechtsklick, Downloads, Drucken, Tabs, die zurückkommen, und eine Liste bei Zurück und Vor.
- **Zwei Startbildschirme:** der Ozean mit Leuchtturm und die Insel, mit Symbolen zum Wechseln, einem Himmel, der sich verändert, und dem Wetter deiner Stadt (optional).
- **Community-Themes:** siehe [`docs/TEMAS.md`](../TEMAS.md). **Mods:** [`docs/MODS.md`](../MODS.md). **Sicherheit:** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Überprüfbare Privatsphäre:** `oceano://rede` zeigt jede Verbindung des Browsers selbst.

## Die Katze

<p><img src="../imagens/gato.gif" width="240" alt="Die Katze von Oceano bei der Arbeit am Computer"></p>

Wenn du willst, kann dein Avatar die Katze sein. Du kannst auch deinen eigenen erstellen, in Pixel, Mesh oder 3D.

## Den Bildschirm sicher aufnehmen

Oceano wurde dafür gedacht, in Videos und Livestreams aufzutauchen. Lokale Informationen (Seiten, die du geöffnet hast, Adressen,
Proxy-Regeln) erscheinen versteckt hinter einem verpixelten Block mit Schloss. Wenn du darauf klickst, warnt Oceano dich, dass
das zu deinen Sicherheitsdaten gehört, und zeigt es nur, wenn du bestätigst; wenn du den Browser schließt, ist wieder alles
versteckt. Teile, die einen lokalen Server brauchen, wie der Avatar-Editor, werden von Oceano selbst ein- und
ausgeschaltet und sprechen nur mit deinem Computer.

## Barrierefreiheit

Barrierefreiheit kommt vor dem Stil. Jedes Theme soll leicht lesbar sein: Mindestkontrast von 4,5:1 für Text
(WCAG AA), Zustände, die nicht nur von der Farbe abhängen, und ein sichtbarer Fokusrahmen. Der Theme-Editor prüft den
Kontrast live und warnt dich vor dem Speichern. Wenn du Themes erstellst, lies den
[Leitfaden zur Barrierefreiheit](../ACESSIBILIDADE-TEMAS.md).

## Lizenz

Der Code von Oceano ist **freie Software** unter der [GNU GPL v3.0 oder später](../../LICENSE):
Du darfst ihn nutzen, studieren, verändern und weitergeben; wer eine veränderte Version weitergibt, muss
den Code offen halten, unter derselben Lizenz.

- **Mods und Themes gehören dir.** Mods (Lua/Teal-Skripte, die die Mod-API nutzen) und Themes (`oceano-tema`-
  Dateien) gelten nicht als abgeleitete Werke von Oceano und können jede Lizenz haben.
  Siehe die zusätzliche Erlaubnis in [`AVISOS.md`](../../AVISOS.md).
- **Teile von Dritten** behalten ihre Lizenzen (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  Die vollständige Liste, mit dem, was jede verlangt, steht in [`AVISOS.md`](../../AVISOS.md).

## Danksagungen

Oceano ist auf der Arbeit vieler Menschen aufgebaut. Besonders:

- **[Stave](https://stave.live)** von Mrityunjay Bhardwaj ([Code auf GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): das Musikstudio in Oceano (`oceano://stave`), mit Timeline, Raster, Piano Roll, Mixer und Visuals. In Oceano hat es den „Live"-Modus, den transparenten Hintergrund und die Videoaufnahme mit der Musik bekommen.
- **[Strudel](https://strudel.cc)** von Felix Roos, Alex McLean und der Community ([Code](https://codeberg.org/uzu/strudel), AGPL-3.0): die Sprache für Musik per Code, die Stave antreibt.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** von shinshin86 (MIT): der animierte Avatar der Navigatorin und der Avatar-Editor.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** und **Electron**.
- **3D-Modell des vierbeinigen Roboters** (`simulador/robo/modelos/quadrupede.3mf`), BY-NC-Lizenz, laut den Daten der Datei selbst: Es wird **nur beim Vierbeiner-Roboter** verwendet, und nicht bei den anderen Robotern. Es steht nicht unter der GPL von Oceano und darf nicht kommerziell genutzt werden.

- **[Whisper](https://github.com/openai/whisper)** von OpenAI (MIT), in der ONNX-Konvertierung von [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): die Sprachtranskription, die auf dem Computer läuft und nur heruntergeladen wird, wenn die Person es verlangt.
- **[Open-Meteo](https://open-meteo.com)**: das Wetter und die Städtesuche, ohne Schlüssel und ohne Konto.

Die vollständige Liste, mit den Lizenzen, steht in [`AVISOS.md`](../../AVISOS.md) und auf der Seite Über die Navigatorin.

## Autor

Erschaffen von **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Die offiziellen Konten von Oceano müssen noch entstehen.
