<p align="center"><img src="../imagens/cara.gif" width="320" alt="Cara, Oceano's navigator, blinking"></p>

> Hi! I'm Cara, your navigator. The first of a browser with AI agents built in from the start. And guess what: the first one that was vibe coded too 😉

<p align="center"><a href="../../README.md">Português</a> · <b>English</b> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

A minimalist, open, pixel art browser for people who play, create and code.
Based on Chromium, with anonymous usage counting only if you allow it, with themes and mods in Lua (the language created at PUC-Rio),
a home page that is a desk of windows over a pixelated sea, and creation tools
inside the browser itself.

> **Status:** in development. → macOS (Apple Silicon): [Releases](https://github.com/hericdk/oceano/releases/latest)

## Why it exists

> Oceano doesn't want to be just another browser. It wants to be a place where people create, learn and show what they dream of.

Oceano is made of pixels, it's not the real sea, but it wants to give the same feeling of looking at it: the
vastness, the freedom, the horizon full of possibilities. Where can I go? How far can I grow?
Where can I get to? It exists to help people answer that, and that's why it's free.

It's made for people who create and for people who record videos, especially for those just starting out: presenting a
business of your own, an idea, a dream, making a vlog. Every tool should teach something, and the community
(knowledge-sharing groups, with the rhythm of a forum) should help each person grow. That is the premise
that guides the whole project: read the [manifesto](../MANIFESTO.md).

Browsers have become similar to each other and full of things nobody asked for. Oceano wants the
opposite: small, beautiful, verifiable and made for tinkering. Not collecting is better than protecting;
everything stays on your computer; no account is required.

This is a medium and long-term project. The idea is to dedicate myself to it for many years, the way
Sean Murray dedicated himself to No Man's Sky: release early, listen to the people who use it and keep improving, version
after version, until it becomes the browser it promises to be. And to do it in the open, so other
people can study it, get inspired and carry the ideas forward.

The full vision is in [`docs/VISAO.md`](../VISAO.md).

### Four questions, answered by the person who made it

**Does it teach something to the people who use it?**

I used to think learning music was hard. With a synthesizer, I found out it isn't. I want to give equal access so other people can learn too.

**Does it work for beginners and look good in a video?**

Yes! And the more people make videos showing what you can do here, the more people will start creating something unique and free.

**Does it respect privacy and accessibility?**

It's a core principle from the start. Both are important and necessary, and I'm counting on everyone's support in the first tests of this beta.

**Does it bring people closer to each other?**

In the future, who knows? A Reddit-style discussion forum would be really positive. And we already have a graphical 3D ambience tool that weighs almost nothing: the whole sea scene, with sky, lighthouse and rain, fits in 29 KB of code. That opens up huge potential to bring people closer 👀

> We have incredible potential to create something new, safe, interconnected, free and designed to help the people who use it, as a symbol of gratitude, empathy and exchange. And I intend to keep all of it free of ads.

## What already exists

| Folder | What | How to run |
|---|---|---|
| [`simulador/`](../../simulador/) | The whole interface running on a page: tabs, desk, themes, Lua/Teal mods, soundtrack, Strudel, PICO-8, water reminder | `python3 simulador/serve.py 5216` and open http://localhost:5216 |
| [`app/`](../../app/) | Electron MVP: the same interface with real tabs (Chromium), isolated profiles, blocker, mini player | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite: Oceano's new tab as a Chrome extension | see `extensao/README.md` |
| [`docs/`](../) | Vision and plan | — |

Some things you can do today:

- **Home page as a desk:** windows you drag, collapse and close over the sea with the lighthouse; each profile has its own desk.
- **Themes** (`oceano-tema/1`, JSON only) that change the colors, the pixelation and even the time of day of the sea.
- **Mods in Lua 5.4 / Teal** in a sandbox with declared permissions.
- **Tab groups** saved on the home page, closed so they don't use memory.
- **AI search** (optional, with your own key) that answers in one line and points to the right sites.
- **Music:** generative soundtrack and live coding with Strudel through [Stave](https://stave.live) (timeline, grid, piano roll, mixer, visuals), with a "live" mode and a transparent background over the sea.
- **The basics of a browser:** history, bookmarks, find in page, zoom, right click, downloads, printing, tabs that come back and a list in back and forward.
- **Two home screens:** the ocean with a lighthouse and the island, with icons to switch, a sky that changes and the weather in your city (optional).
- **Community themes:** see [`docs/TEMAS.md`](../TEMAS.md). **Mods:** [`docs/MODS.md`](../MODS.md). **Security:** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Verifiable privacy:** `oceano://rede` shows every connection the browser itself makes.

## The cat

<p><img src="../imagens/gato.gif" width="240" alt="Oceano's cat working on the computer"></p>

If you prefer, your avatar can be the cat. You can also create your own, in pixel, mesh or 3D.

## Recording your screen safely

Oceano was designed to show up in videos and livestreams. Local information (sites you opened, addresses,
proxy rules) appears hidden behind a pixelated block with a padlock. When you click it, Oceano warns you that
this is part of your security data and only shows it if you confirm; when you close the browser, everything goes
back to being hidden. Parts that need a local server, like the avatar editor, are turned on and
off by Oceano itself and only talk to your computer.

## Accessibility

Accessibility comes before style. Every theme should be easy to read: a minimum contrast of 4.5:1 for text
(WCAG AA), states that don't depend on color alone and a visible focus outline. The theme editor checks
contrast live and warns you before saving. If you create themes, read the
[accessibility guide](../ACESSIBILIDADE-TEMAS.md).

## License

Oceano's code is **free software**, under the [GNU GPL v3.0 or later](../../LICENSE):
you can use, study, modify and distribute it; anyone who distributes a modified version must
keep the code open, under the same license.

- **Mods and themes are yours.** Mods (Lua/Teal scripts that use the mods API) and themes (`oceano-tema`
  files) are not considered derivative works of Oceano and can have any license.
  See the additional permission in [`AVISOS.md`](../../AVISOS.md).
- **Third-party parts** keep their own licenses (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  The full list, with what each one requires, is in [`AVISOS.md`](../../AVISOS.md).

## Credits

Oceano is built on the work of a lot of people. In particular:

- **[Stave](https://stave.live)** by Mrityunjay Bhardwaj ([code on GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): the music studio inside Oceano (`oceano://stave`), with timeline, grid, piano roll, mixer and visuals. In Oceano it gained the "live" mode, the transparent background and video recording with the music.
- **[Strudel](https://strudel.cc)** by Felix Roos, Alex McLean and community ([code](https://codeberg.org/uzu/strudel), AGPL-3.0): the music-by-code language that powers Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** by shinshin86 (MIT): the Navigator's animated avatar and the avatar editor.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** and **Electron**.
- **3D model of the quadruped robot** (`simulador/robo/modelos/quadrupede.3mf`), BY-NC license, according to the file's own data: it is used **only on the Quadruped robot**, and not on the other robots. It is not under Oceano's GPL and cannot be used commercially.

- **[Whisper](https://github.com/openai/whisper)** by OpenAI (MIT), in the ONNX conversion by [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): voice transcription, which runs on your computer and is only downloaded if the person asks for it.
- **[Open-Meteo](https://open-meteo.com)**: the weather and the city search, with no key and no account.

The full list, with the licenses, is in [`AVISOS.md`](../../AVISOS.md) and on the About the Navigator page.

## Author

Created by **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Oceano's official accounts are yet to be born.
