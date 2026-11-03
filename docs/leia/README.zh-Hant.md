<p align="center"><img src="../imagens/cara.gif" width="320" alt="Cara,Oceano 的領航員,正在眨眼"></p>

> 嗨!我是 Cara,你的領航員。我是第一款從一開始就內建 AI 代理的瀏覽器。而且你猜怎麼著:我也是第一個用 vibe coding 做出來的 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <b>繁體中文</b> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

一款極簡、開源、像素風的瀏覽器,獻給愛玩遊戲、愛創作、愛寫程式的人。
基於 Chromium,只有在你允許時才會進行匿名使用統計,支援主題和 Lua 模組(Lua 是巴西 PUC-Rio 創造的語言),
首頁是一張擺在像素海面上的視窗桌面,創作工具就在瀏覽器裡面。

> **狀態:** 開發中。 → macOS (Apple Silicon): [Releases](https://github.com/hericdk/oceano/releases/latest)

## 為什麼要做它

> Oceano 不想只是另一個瀏覽器。它想成為一個讓大家創作、學習、展示夢想的地方。

Oceano 是用像素做成的,它不是真正的大海,但它想帶來望向大海時的那種感覺:
遼闊、自由、充滿可能性的地平線。我能去哪裡?我能成長到什麼程度?
我能走到多遠?它的存在就是為了幫助大家回答這些問題,所以它是免費的。

它是為創作者和錄製影片的人做的,尤其是剛起步的人:介紹自己的小事業、一個想法、一個夢想,或是拍 vlog。每個工具都應該教你一點什麼,
而社群(交流知識的小組,節奏像論壇)應該幫助每個人成長。這個前提指引著整個專案:請閱讀[宣言](../MANIFESTO.md)。

瀏覽器變得越來越像,還塞滿了沒人要的東西。Oceano 想反其道而行:小巧、好看、可驗證、適合動手改。
不蒐集比保護更好;一切都留在你的電腦上;不強制註冊任何帳號。

這是一個中長期專案。我打算投入很多年,就像
Sean Murray 投入 No Man's Sky 那樣:早點發布,傾聽使用者,一個版本接一個版本地持續改進,
直到它成為自己承諾的那款瀏覽器。而且要公開地做,讓其他人
可以學習、獲得靈感,並把這些想法繼續推進下去。

完整的願景在 [`docs/VISAO.md`](../VISAO.md)。

### 四個問題,由創作者來回答

**它能教給使用者一些東西嗎?**

我以前覺得學音樂很難。用了合成器之後,我發現並不難。我想讓大家平等地取得機會,讓更多人也能學會。

**它適合新手,而且在影片裡好看嗎?**

適合!而且越多人做影片展示這裡能做什麼,就會有越多人開始創作獨一無二、自由的作品。

**它尊重隱私和無障礙嗎?**

從一開始這就是基本原則。兩者都重要、都必不可少,這個 beta 的最初測試階段,我需要大家的支持。

**它能拉近人與人的距離嗎?**

將來也許可以?一個 Reddit 風格的討論論壇會非常好。而且我們已經有一個體積極小的 3D 氛圍圖形工具:包含天空、燈塔和雨的整個海景場景,只用 29 KB 程式碼就裝得下。這為拉近人與人的距離打開了巨大的潛力 👀

> 我們有不可思議的潛力,去創造一種全新、安全、互聯、自由,並且為使用它的人著想的東西,作為感恩、同理和交流的象徵。我還打算讓這一切都沒有廣告。

## 目前已有的內容

| 資料夾 | 內容 | 如何執行 |
|---|---|---|
| [`simulador/`](../../simulador/) | 整個介面執行在一個頁面裡:分頁、桌面、主題、Lua/Teal 模組、背景音樂、Strudel、PICO-8、喝水提醒 | `python3 simulador/serve.py 5216` 然後開啟 http://localhost:5216 |
| [`app/`](../../app/) | Electron 版 MVP:同樣的介面,帶真正的分頁(Chromium)、隔離的設定檔、攔截器、迷你播放器 | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite:把 Oceano 的新分頁做成 Chrome 擴充功能 | 見 `extensao/README.md` |
| [`docs/`](../) | 願景與計畫 | — |

現在就能做的一些事:

- **首頁就是一張桌面:** 視窗可以在有燈塔的大海上拖動、收合和關閉;每個設定檔都有自己的桌面。
- **主題**(`oceano-tema/1`,純 JSON)可以改變顏色、像素化程度,甚至大海的時段。
- **Lua 5.4 / Teal 模組**,執行在宣告了權限的沙盒裡。
- **分頁群組**儲存在首頁上,處於關閉狀態,不佔記憶體。
- **AI 搜尋**(可選,使用你自己的金鑰),一行就給出回答,並指向合適的網站。
- **音樂:** 生成式背景音樂,以及透過 [Stave](https://stave.live) 用 Strudel 進行 live coding(時間軸、網格、鋼琴捲簾、混音台、視覺效果),帶「即時」模式,還有疊在大海上的透明背景。
- **瀏覽器的基本功能:** 歷史記錄、書籤、頁內尋找、縮放、右鍵選單、下載、列印、可還原的分頁,以及上一頁和下一頁清單。
- **兩個起始畫面:** 有燈塔的海洋和島嶼,圖示可以更換,天空會變化,還有你所在城市的天氣(可選)。
- **社群主題:** 見 [`docs/TEMAS.md`](../TEMAS.md)。**模組:** [`docs/MODS.md`](../MODS.md)。**安全:** [`docs/SEGURANCA.md`](../SEGURANCA.md)。
- **可驗證的隱私:** `oceano://rede` 會顯示瀏覽器自身的每一個連線。

## 小貓

<p><img src="../imagens/gato.gif" width="240" alt="Oceano 的小貓正在操作電腦"></p>

如果你願意,你的頭像可以是這隻小貓。你也可以自己建立,像素風、網格或 3D 都行。

## 安全地錄製螢幕

Oceano 就是為出現在影片和直播裡而設計的。本機資訊(你開啟過的網站、位址、
代理規則)會藏在一塊帶鎖的像素化方塊後面。點擊之後,Oceano 會提示
這屬於你的安全資料,只有你確認才會顯示;關閉瀏覽器時,一切又會
重新隱藏。需要本機伺服器的部分,例如頭像編輯器,由 Oceano 自己開啟和
關閉,並且只與你的電腦通訊。

## 無障礙

無障礙比風格更重要。每個主題都應該易於閱讀:文字對比度至少 4.5:1
(WCAG AA),狀態不能只靠顏色區分,並且要有清楚可見的焦點輪廓。主題編輯器會即時檢查
對比度,並在儲存前提醒你。如果你做主題,請閱讀
[無障礙指南](../ACESSIBILIDADE-TEMAS.md)。

## 授權

Oceano 的程式碼是**自由軟體**,採用 [GNU GPL v3.0 或更新版本](../../LICENSE):
你可以使用、研究、修改和散布;散布修改版的人必須
保持程式碼開源,並使用相同的授權。

- **模組和主題屬於你。** 模組(使用模組 API 的 Lua/Teal 腳本)和主題(`oceano-tema`
  檔案)不被視為 Oceano 的衍生作品,可以使用任何授權。
  請看 [`AVISOS.md`](../../AVISOS.md) 中的附加許可。
- **第三方部分**保留它們各自的授權(MIT、BSD、MPL-2.0、Apache-2.0、AGPL-3.0……)。
  完整清單以及每項的要求,見 [`AVISOS.md`](../../AVISOS.md)。

## 致謝

Oceano 建立在很多人的成果之上。特別感謝:

- **[Stave](https://stave.live)**,作者 Mrityunjay Bhardwaj([GitHub 程式碼](https://github.com/MrityunjayBhardwaj/Stave),AGPL-3.0):Oceano 裡的音樂工作室(`oceano://stave`),帶有時間軸、網格、鋼琴捲簾、混音台和視覺效果。在 Oceano 裡,它增加了「即時」模式、透明背景,以及帶音樂的影片錄製。
- **[Strudel](https://strudel.cc)**,作者 Felix Roos、Alex McLean 和社群([程式碼](https://codeberg.org/uzu/strudel),AGPL-3.0):驅動 Stave 的程式碼音樂語言。
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)**,作者 shinshin86(MIT):領航員的動畫頭像和頭像編輯器。
- **Lua**(PUC-Rio)、**Teal**(Hisham Muhammad)、**three.js**、**Chromium** 和 **Electron**。
- **四足機器人 3D 模型**(`simulador/robo/modelos/quadrupede.3mf`),BY-NC 授權,依據檔案本身的資料:它**只用於四足機器人**,不用於其他機器人。它不在 Oceano 的 GPL 之下,也不能商用。

- **[Whisper](https://github.com/openai/whisper)**,OpenAI(MIT),使用 [onnx-community](https://huggingface.co/onnx-community/whisper-base)(Apache-2.0)的 ONNX 轉換版本:語音轉文字,在電腦本機執行,只有使用者主動要求時才會下載。
- **[Open-Meteo](https://open-meteo.com)**:天氣和城市搜尋,無需金鑰,無需帳號。

完整清單及授權見 [`AVISOS.md`](../../AVISOS.md) 和「關於領航員」頁面。

## 作者

由 **@hericdk** 創作 · Instagram [@hericdk](https://instagram.com/hericdk)

Oceano 的官方帳號還在籌備中。
