<p align="center"><img src="../imagens/cara.gif" width="320" alt="Kara, navigator Oceano, sedang berkedip"></p>

> Hai! Aku Kara, navigator-mu. Yang pertama di sebuah browser dengan agen AI terintegrasi sejak awal. Dan coba tebak: yang pertama dibuat dengan vibe coding juga 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <b>Bahasa Indonesia</b> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

Browser minimalis, terbuka, dan bergaya pixel art, untuk kamu yang bermain, berkarya, dan memrogram.
Berbasis Chromium, dengan penghitungan penggunaan anonim hanya jika kamu mengizinkan, dengan tema dan mod Lua (bahasa yang diciptakan di PUC-Rio),
sebuah halaman awal yang berupa meja jendela di atas laut berpiksel, dan alat-alat berkarya
di dalam browser itu sendiri.

> **Status:** sedang dikembangkan. → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## Kenapa ini ada

> Oceano tidak ingin jadi sekadar browser lain. Ia ingin jadi tempat orang-orang berkarya, belajar, dan menunjukkan apa yang mereka impikan.

Oceano dibuat dari piksel, bukan laut yang sebenarnya, tapi ia ingin memberi perasaan yang sama saat memandang laut:
keluasan, kebebasan, cakrawala yang penuh kemungkinan. Ke mana aku bisa pergi? Sampai mana aku bisa tumbuh?
Ke mana aku bisa sampai? Ia ada untuk membantu orang menjawab itu, dan karena itulah ia gratis.

Ia dibuat untuk yang berkarya dan yang merekam video, terutama yang baru mulai: memperkenalkan
usaha sendiri, sebuah ide, sebuah mimpi, membuat vlog. Setiap alat harus mengajarkan sesuatu, dan komunitas
(kelompok bertukar pengetahuan, dengan irama forum) harus membantu setiap orang tumbuh. Inilah premis
yang memandu seluruh proyek: baca [manifesto](../MANIFESTO.md).

Browser jadi mirip satu sama lain dan penuh hal yang tidak diminta siapa pun. Oceano menginginkan
yang sebaliknya: kecil, indah, bisa diverifikasi, dan dibuat untuk diutak-atik. Tidak mengumpulkan lebih baik daripada melindungi;
semuanya ada di komputermu; tidak ada akun yang wajib.

Ini proyek jangka menengah dan panjang. Rencanaku adalah mengabdikan diri padanya selama bertahun-tahun, seperti
Sean Murray mengabdikan diri pada No Man's Sky: rilis lebih awal, mendengarkan yang memakainya, dan terus memperbaiki, versi
demi versi, sampai menjadi browser yang dijanjikannya. Dan melakukannya secara terbuka, supaya orang lain
bisa mempelajari, terinspirasi, dan membawa ide-ide ini lebih jauh.

Visi lengkapnya ada di [`docs/VISAO.md`](../VISAO.md).

### Empat pertanyaan, dijawab oleh penciptanya

**Apakah ini mengajarkan sesuatu kepada yang memakainya?**

Dulu kupikir belajar musik itu sulit. Dengan sebuah synthesizer, aku menemukan bahwa tidak. Aku ingin memberi akses yang setara supaya orang lain juga bisa belajar.

**Apakah cocok untuk yang baru mulai dan tampil bagus di video?**

Ya! Dan makin banyak orang membuat video yang menunjukkan apa yang bisa dilakukan di sini, makin banyak orang akan mulai menciptakan sesuatu yang unik dan bebas.

**Apakah menghormati privasi dan aksesibilitas?**

Itu prinsip dasar sejak awal. Keduanya penting dan perlu, dan aku mengandalkan dukungan semua orang di pengujian pertama beta ini.

**Apakah ini mendekatkan orang satu sama lain?**

Di masa depan, siapa tahu? Forum diskusi bergaya Reddit akan sangat positif. Dan kita sudah punya alat grafis suasana 3D yang sangat ringan: seluruh adegan laut, lengkap dengan langit, mercusuar, dan hujan, muat dalam 29 KB kode. Ini membuka potensi besar untuk mendekatkan orang 👀

> Kita punya potensi luar biasa untuk menciptakan sesuatu yang baru, aman, saling terhubung, bebas, dan dirancang untuk membantu orang-orang yang memakainya, sebagai simbol rasa syukur, empati, dan pertukaran. Dan aku berniat menjaga semua ini bebas dari iklan.

## Apa yang sudah ada

| Folder | Apa | Cara menjalankan |
|---|---|---|
| [`simulador/`](../../simulador/) | Seluruh antarmuka berjalan di satu halaman: tab, meja, tema, mod Lua/Teal, soundtrack, Strudel, PICO-8, pengingat minum air | `python3 simulador/serve.py 5216` lalu buka http://localhost:5216 |
| [`app/`](../../app/) | MVP di Electron: antarmuka yang sama dengan tab sungguhan (Chromium), profil terisolasi, pemblokir, mini player | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite: tab baru Oceano sebagai ekstensi Chrome | lihat `extensao/README.md` |
| [`docs/`](../) | Visi dan rencana | — |

Beberapa hal yang bisa dilakukan hari ini:

- **Halaman awal sebagai meja:** jendela yang bisa kamu seret, lipat, dan tutup di atas laut dengan mercusuar; setiap profil punya mejanya sendiri.
- **Tema** (`oceano-tema/1`, hanya JSON) yang mengubah warna, tingkat pikselasi, bahkan waktu hari di laut.
- **Mod Lua 5.4 / Teal** dalam sandbox dengan izin yang dideklarasikan.
- **Grup tab** tersimpan di halaman awal, dalam keadaan tertutup agar tidak memakai memori.
- **Pencarian dengan AI** (opsional, dengan kuncimu sendiri) yang menjawab dalam satu baris dan menunjukkan situs yang tepat.
- **Musik:** soundtrack generatif dan live coding dengan Strudel lewat [Stave](https://stave.live) (timeline, grid, piano roll, mixer, visual), dengan mode "langsung" dan latar transparan di atas laut.
- **Dasar-dasar browser:** riwayat, bookmark, cari di halaman, zoom, klik kanan, unduhan, cetak, tab yang bisa dikembalikan, dan daftar mundur dan maju.
- **Dua layar awal:** samudra dengan mercusuar dan pulau, dengan ikon yang bisa diganti, langit yang berubah, dan cuaca kotamu (opsional).
- **Tema komunitas:** lihat [`docs/TEMAS.md`](../TEMAS.md). **Mod:** [`docs/MODS.md`](../MODS.md). **Keamanan:** [`docs/SEGURANCA.md`](../SEGURANCA.md).
- **Privasi yang bisa diverifikasi:** `oceano://rede` menampilkan setiap koneksi dari browser itu sendiri.

## Si kucing

<p><img src="../imagens/gato.gif" width="240" alt="Kucing Oceano sedang mengutak-atik komputer"></p>

Kalau mau, avatarmu bisa berupa kucing. Kamu juga bisa membuat sendiri, dalam piksel, mesh, atau 3D.

## Merekam layar dengan aman

Oceano dirancang untuk tampil di video dan siaran langsung. Informasi lokal (situs yang kamu buka, alamat,
aturan proxy) tampil tersembunyi di balik blok berpiksel dengan gembok. Saat diklik, Oceano memberi tahu bahwa
itu bagian dari data keamananmu dan hanya menampilkannya jika kamu mengonfirmasi; saat browser ditutup, semuanya kembali
tersembunyi. Bagian yang membutuhkan server lokal, seperti editor avatar, dinyalakan dan
dimatikan oleh Oceano sendiri dan hanya berbicara dengan komputermu.

## Aksesibilitas

Aksesibilitas didahulukan daripada gaya. Setiap tema harus mudah dibaca: kontras minimum 4,5:1 untuk teks
(WCAG AA), status yang tidak bergantung hanya pada warna, dan garis tepi fokus yang terlihat. Editor tema memeriksa
kontras secara langsung dan memperingatkan sebelum menyimpan. Kalau kamu membuat tema, baca
[panduan aksesibilitas](../ACESSIBILIDADE-TEMAS.md).

## Lisensi

Kode Oceano adalah **perangkat lunak bebas**, di bawah [GNU AGPL v3.0 atau yang lebih baru](../../LICENSE):
kamu boleh menggunakan, mempelajari, memodifikasi, dan mendistribusikan; siapa pun yang mendistribusikan versi yang dimodifikasi harus
menjaga kodenya tetap terbuka, di bawah lisensi yang sama. Hal yang sama berlaku bagi siapa pun yang menawarkan versi yang dimodifikasi melalui jaringan.

- **Mod dan tema adalah milikmu.** Mod (skrip Lua/Teal yang memakai API mod) dan tema (berkas
  `oceano-tema`) tidak dianggap sebagai karya turunan Oceano dan boleh memakai lisensi apa pun.
  Lihat izin tambahan di [`AVISOS.md`](../../AVISOS.md).
- **Bagian pihak ketiga** mempertahankan lisensinya masing-masing (MIT, BSD, MPL-2.0, Apache-2.0, AGPL-3.0…).
  Daftar lengkap, beserta apa yang diminta masing-masing, ada di [`AVISOS.md`](../../AVISOS.md).

## Kredit

Oceano dibangun di atas kerja banyak orang. Terutama:

- **[Stave](https://stave.live)** karya Mrityunjay Bhardwaj ([kode di GitHub](https://github.com/MrityunjayBhardwaj/Stave), AGPL-3.0): studio musik di dalam Oceano (`oceano://stave`), dengan timeline, grid, piano roll, mixer, dan visual. Di Oceano, ia mendapat mode "langsung", latar transparan, dan perekaman video dengan musiknya.
- **[Strudel](https://strudel.cc)** karya Felix Roos, Alex McLean, dan komunitas ([kode](https://codeberg.org/uzu/strudel), AGPL-3.0): bahasa musik lewat kode yang menggerakkan Stave.
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)** karya shinshin86 (MIT): avatar animasi si Navigator dan editor avatar.
- **Lua** (PUC-Rio), **Teal** (Hisham Muhammad), **three.js**, **Chromium**, dan **Electron**.
- **Model 3D robot berkaki empat** (`simulador/robo/modelos/quadrupede.3mf`), lisensi BY-NC, sesuai data berkas itu sendiri: dipakai **hanya pada robot Quadrúpede**, dan tidak pada robot lain. Model ini tidak berada di bawah AGPL Oceano dan tidak boleh dipakai secara komersial.

- **[Whisper](https://github.com/openai/whisper)** dari OpenAI (MIT), dalam konversi ONNX dari [onnx-community](https://huggingface.co/onnx-community/whisper-base) (Apache-2.0): transkripsi suara, yang berjalan di komputer dan hanya diunduh jika orangnya memintanya.
- **[Open-Meteo](https://open-meteo.com)**: cuaca dan pencarian kota, tanpa kunci dan tanpa akun.

Daftar lengkap, beserta lisensinya, ada di [`AVISOS.md`](../../AVISOS.md) dan di halaman Tentang Navigator.

## Pembuat

Dibuat oleh **@hericdk** · Instagram [@hericdk](https://instagram.com/hericdk)

Akun-akun resmi Oceano masih akan lahir.
