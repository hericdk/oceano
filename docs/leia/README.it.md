<p align="center"><img src="../imagens/cara.gif" width="320" alt="Kara, la navigatrice di Oceano, che sbatte le palpebre"></p>

> Ciao! Io sono Kara, la tua navigatrice. La prima di un browser con agenti di IA integrati fin dall'inizio. E indovina un po': anche il primo fatto in vibe coding 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <b>Italiano</b> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

Un browser minimalista, aperto e in pixel art, per chi gioca, crea e programma.
Basato su Chromium, con conteggio anonimo dell'uso solo se lo autorizzi, con temi e mod in Lua (il linguaggio creato alla PUC-Rio),
una pagina iniziale che è una scrivania di finestre sopra un mare pixelato, e strumenti di creazione
dentro il browser stesso.

> **Stato:** in sviluppo. → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## Perché esiste

> Oceano non vuole essere solo un altro browser. Vuole essere un posto dove le persone creano, imparano e mostrano ciò che sognano.

Oceano è fatto di pixel, non è il mare vero, ma vuole dare la stessa sensazione di guardarlo: l'
immensità, la libertà, l'orizzonte pieno di possibilità. Dove posso andare? Fin dove posso crescere?
Dove riesco ad arrivare? Esiste per aiutare le persone a rispondere a questo, e per questo è gratis.

È fatto per chi crea e per chi registra video, soprattutto per chi sta cominciando: presentare un
lavoro proprio, un'idea, un sogno, fare un vlog. Ogni strumento deve insegnare qualcosa, e la community
(gruppi di scambio di conoscenze, al ritmo di un forum) deve aiutare ogni persona a crescere. Questa è la premessa
che guida tutto il progetto: leggi il [manifesto](../MANIFESTO.md).

I browser sono diventati simili tra loro e pieni di cose che nessuno ha chiesto. Oceano vuole il
contrario: piccolo, bello, verificabile e fatto per essere smanettato. Non raccogliere è meglio che proteggere;
tutto resta sul tuo computer; nessun account è obbligatorio.

Questo è un progetto a medio e lungo termine. L'idea è dedicarmici per molti anni, come
Sean Murray si è dedicato a No Man's Sky: uscire presto, ascoltare chi lo usa e continuare a migliorare, versione
dopo versione, fino a diventare il browser che promette di essere. E farlo in modo aperto, perché altre
persone possano studiarlo, ispirarsi e portare avanti le idee.

La visione completa è in [`docs/VISAO.md`](../VISAO.md).

### Quattro domande, con le risposte di chi l'ha creato

**Insegna qualcosa a chi lo usa?**

Pensavo che imparare la musica fosse difficile. Con un sintetizzatore ho scoperto che non lo è. Voglio dare un accesso uguale per tutti, così anche altre persone possono imparare.

**Funziona per chi sta cominciando e fa bella figura in un video?**

Sì! E più persone faranno video per mostrare cosa si può fare qui, più gente comincerà a creare qualcosa di unico e libero.

**Rispetta la privacy e l'accessibilità?**

È un principio di base fin dall'inizio. Entrambe sono importanti e necessarie, e conto sul sostegno di tutti nei primi test di questa beta.

**Avvicina le persone tra loro?**

In futuro, chissà? Un forum di discussione in stile Reddit sarebbe molto positivo. E abbiamo già uno strumento grafico di ambientazione 3D che pesa pochissimo: l'intera scena del mare, con cielo, faro e pioggia, sta in 29 KB di codice. Questo apre un potenziale enorme per avvicinare le persone 👀

> Abbiamo un potenziale incredibile per creare qualcosa di nuovo, sicuro, interconnesso, libero e pensato per aiutare le persone che lo useranno, come simbolo di gratitudine, empatia e scambio. E ho intenzione di tenere tutto questo libero dalla pubblicità.

## Cosa esiste già

| Cartella | Cosa | Come avviare |
|---|---|---|
| [`simulador/`](../../simulador/) | L'intera interfaccia in esecuzione in una pagina: schede, scrivania, temi, mod in Lua/Teal, colonna sonora, Strudel, PICO-8, promemoria per bere acqua | `python3 simulador/serve.py 5216` e apri http://localhost:5216 |
| [`app/`](../../app/) | MVP in Electron: la stessa interfaccia con schede vere (Chromium), profili isolati, blocco, mini player | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite: la nuova scheda di Oceano come estensione di Chrome | vedi `extensao/README.md` |
| [`docs/`](../) | Visione e piano | — |

Alcune cose che si possono fare oggi:

- **Pagina iniziale come scrivania:** finestre che trascini, riduci e chiudi sopra il mare con il faro; ogni profilo ha la sua scrivania.
- **Temi** (`oceano-tema/1`, solo JSON) che cambiano i colori, la pixelatura e perfino l'ora del giorno del mare.
- **Mod in Lua 5.4 / Teal** in una sandbox con permessi dichiarati.
- **Gruppi di schede** salvati nella pagina iniziale, chiusi per non consumare memoria.
- **Ricerca con IA** (opzionale, con la tua chiave) che risponde in una riga e indica i siti giusti.
- **Musica:** colonna sonora generativa e live coding con Strudel tramite [Stave](https://stave.live) (timeline, griglia, piano roll, mixer, visual), con modalità "dal vivo" e sfondo trasparente sopra il mare.
- **Le basi di un browser:** cronologia, preferiti, cerca nella pagina, zoom, clic destro, download, stampa, schede che tornano e lista in indietro e avanti.
- **Due schermate iniziali:** l'oceano con il faro e l'isola, con icone per cambiare, un cielo che varia e il meteo della tua città (opzionale).
- **Temi della community:** vedi [`docs/TEMAS.md`](../TEMAS.md). **Mod:** [`docs/MODS.md`](../MODS.md). **Sicurezza:** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Privacy verificabile:** `oceano://rede` mostra ogni connessione del browser stesso.

## Il gatto

<p><img src="../imagens/gato.gif" width="240" alt="Il gatto di Oceano che lavora al computer"></p>

Se preferisci, il tuo avatar può essere il gatto. Puoi anche creare il tuo, in pixel, mesh o 3D.

## Registrare lo schermo in sicurezza

Oceano è stato pensato per comparire in video e dirette. Le informazioni locali (siti che hai aperto, indirizzi,
regole del proxy) appaiono nascoste dietro un blocco pixelato con un lucchetto. Cliccando, Oceano ti avvisa che
quella roba fa parte dei tuoi dati di sicurezza e la mostra solo se confermi; quando chiudi il browser, tutto torna
nascosto. Le parti che richiedono un server locale, come l'editor di avatar, vengono accese e
spente da Oceano stesso e parlano solo con il tuo computer.

## Accessibilità

L'accessibilità viene prima dello stile. Ogni tema deve essere facile da leggere: contrasto minimo di 4,5:1 per il testo
(WCAG AA), stati che non dipendono solo dal colore e contorno di focus visibile. L'editor dei temi controlla il
contrasto dal vivo e ti avvisa prima di salvare. Se crei temi, leggi la
[guida all'accessibilità](../ACESSIBILIDADE-TEMAS.md).

## Licenza

Il codice di Oceano è **software libero**, sotto la [GNU GPL v3.0 o successiva](../../LICENSE):
puoi usarlo, studiarlo, modificarlo e distribuirlo; chi distribuisce una versione modificata deve
mantenere il codice aperto, sotto la stessa licenza.

- **Mod e temi sono tuoi.** I mod (script Lua/Teal che usano l'API dei mod) e i temi (file
  `oceano-tema`) non sono considerati opere derivate di Oceano e possono avere qualsiasi licenza.
  Vedi il permesso aggiuntivo in [`AVISOS.md`](../../AVISOS.md).
- **Le parti di terzi** mantengono le loro licenze (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  L'elenco completo, con ciò che chiede ciascuna, è in [`AVISOS.md`](../../AVISOS.md).

## Crediti

Oceano è costruito sul lavoro di molte persone. In particolare:

- **[Stave](https://stave.live)** di Mrityunjay Bhardwaj ([codice su GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): lo studio musicale dentro Oceano (`oceano://stave`), con timeline, griglia, piano roll, mixer e visual. In Oceano ha ottenuto la modalità "dal vivo", lo sfondo trasparente e la registrazione video con la musica.
- **[Strudel](https://strudel.cc)** di Felix Roos, Alex McLean e della community ([codice](https://codeberg.org/uzu/strudel), AGPL-3.0): il linguaggio di musica tramite codice che muove Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** di shinshin86 (MIT): l'avatar animato della Navigatrice e l'editor di avatar.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium** ed **Electron**.
- **Modello 3D del robot quadrupede** (`simulador/robo/modelos/quadrupede.3mf`), licenza BY-NC, secondo i dati del file stesso: è usato **solo nel robot Quadrupede**, e non negli altri robot. Non è sotto la GPL di Oceano e non può avere uso commerciale.

- **[Whisper](https://github.com/openai/whisper)** di OpenAI (MIT), nella conversione ONNX di [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): la trascrizione vocale, che gira sul computer e viene scaricata solo se la persona lo chiede.
- **[Open-Meteo](https://open-meteo.com)**: il meteo e la ricerca delle città, senza chiave e senza account.

L'elenco completo, con le licenze, è in [`AVISOS.md`](../../AVISOS.md) e nella pagina Informazioni sulla Navigatrice.

## Autore

Creato da **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Gli account ufficiali di Oceano devono ancora nascere.
