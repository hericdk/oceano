<p align="center"><img src="../imagens/cara.gif" width="320" alt="Kara,Oceano 的领航员,正在眨眼"></p>

> 嗨!我是 Kara,你的领航员。我是第一款从一开始就内置 AI 智能体的浏览器。而且你猜怎么着:我也是第一个用 vibe coding 做出来的 😉

<p align="center"><a href="../../README.md">Português</a> · <a href="README.en.md">English</a> · <a href="README.es.md">Español</a> · <a href="README.fr.md">Français</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <b>中文</b> · <a href="README.hi.md">हिन्दी</a> · <a href="README.ar.md">العربية</a> · <a href="README.ru.md">Русский</a> · <a href="README.id.md">Bahasa Indonesia</a> · <a href="README.tr.md">Türkçe</a> · <a href="README.zh-Hant.md">繁體中文</a> · <a href="README.bn.md">বাংলা</a> · <a href="README.ur.md">اردو</a> · <a href="README.te.md">తెలుగు</a> · <a href="README.mr.md">मराठी</a> · <a href="README.ta.md">தமிழ்</a> · <a href="README.sw.md">Kiswahili</a> · <a href="README.ha.md">Hausa</a> · <a href="README.am.md">አማርኛ</a> · <a href="README.yo.md">Yorùbá</a> · <a href="README.zu.md">isiZulu</a> · <a href="README.so.md">Soomaali</a> · <a href="README.ne.md">नेपाली</a> · <a href="README.my.md">မြန်မာ</a> · <a href="README.km.md">ខ្មែរ</a> · <a href="README.lo.md">ລາວ</a> · <a href="README.fil.md">Filipino</a> · <a href="README.vi.md">Tiếng Việt</a> · <a href="README.ps.md">پښتو</a> · <a href="README.fa.md">فارسی</a> · <a href="README.ht.md">Kreyòl ayisyen</a> · <a href="README.mg.md">Malagasy</a></p>

# Oceano

一款极简、开源、像素风的浏览器,献给爱玩游戏、爱创作、爱编程的人。
基于 Chromium,只有在你允许时才会进行匿名使用统计,支持主题和 Lua 模组(Lua 是巴西 PUC-Rio 创造的语言),
主页是一张摆在像素海面上的窗口桌面,创作工具就在浏览器里面。

> **状态:** 开发中。 → macOS (Apple Silicon) · Windows · Linux: [Releases](https://github.com/hericdk/oceano/releases/latest)

## 为什么要做它

> Oceano 不想只是又一个浏览器。它想成为一个让大家创作、学习、展示梦想的地方。

Oceano 是用像素做成的,它不是真正的大海,但它想带来望向大海时的那种感觉:
辽阔、自由、满是可能性的地平线。我能去哪里?我能成长到什么程度?
我能走到多远?它的存在就是为了帮助大家回答这些问题,所以它是免费的。

它是为创作者和录制视频的人做的,尤其是刚起步的人:介绍自己的小生意、一个想法、一个梦想,或者拍 vlog。每个工具都应该教会你点什么,
而社区(交流知识的小组,节奏像论坛)应该帮助每个人成长。这个前提指引着整个项目:请阅读[宣言](../MANIFESTO.md)。

浏览器变得越来越像,还塞满了没人要的东西。Oceano 想反其道而行:小巧、好看、可验证、适合动手改。
不收集比保护更好;一切都留在你的电脑上;不强制注册任何账号。

这是一个中长期项目。我打算投入很多年,就像
Sean Murray 投入 No Man's Sky 那样:早点发布,倾听用户,一个版本接一个版本地持续改进,
直到它成为自己承诺的那款浏览器。而且要公开地做,让其他人
可以学习、获得灵感,并把这些想法继续推进下去。

完整的愿景在 [`docs/VISAO.md`](../VISAO.md)。

### 四个问题,由创作者来回答

**它能教给使用者一些东西吗?**

我以前觉得学音乐很难。用了合成器之后,我发现并不难。我想让大家平等地获得机会,让更多人也能学会。

**它适合新手,而且在视频里好看吗?**

适合!而且越多人做视频展示这里能做什么,就会有越多人开始创作独一无二、自由的作品。

**它尊重隐私和无障碍吗?**

从一开始这就是基本原则。两者都重要、都必不可少,这个 beta 的最初测试阶段,我需要大家的支持。

**它能拉近人与人的距离吗?**

将来也许可以?一个 Reddit 风格的讨论论坛会非常好。而且我们已经有一个体积极小的 3D 氛围图形工具:包含天空、灯塔和雨的整个海景场景,只用 29 KB 代码就装得下。这为拉近人与人的距离打开了巨大的潜力 👀

> 我们有不可思议的潜力,去创造一种全新、安全、互联、自由,并且为使用它的人着想的东西,作为感恩、共情和交流的象征。我还打算让这一切都没有广告。

## 目前已有的内容

| 文件夹 | 内容 | 如何运行 |
|---|---|---|
| [`simulador/`](../../simulador/) | 整个界面运行在一个页面里:标签页、桌面、主题、Lua/Teal 模组、背景音乐、Strudel、PICO-8、喝水提醒 | `python3 simulador/serve.py 5216` 然后打开 http://localhost:5216 |
| [`app/`](../../app/) | Electron 版 MVP:同样的界面,带真正的标签页(Chromium)、隔离的配置文件、拦截器、迷你播放器 | `cd app && npm install && npm start` |
| [`extensao/`](../../extensao/) | Oceano Lite:把 Oceano 的新标签页做成 Chrome 扩展 | 见 `extensao/README.md` |
| [`docs/`](../) | 愿景与计划 | — |

现在就能做的一些事:

- **主页就是一张桌面:** 窗口可以在有灯塔的大海上拖动、收起和关闭;每个配置文件都有自己的桌面。
- **主题**(`oceano-tema/1`,纯 JSON)可以改变颜色、像素化程度,甚至大海的时间段。
- **Lua 5.4 / Teal 模组**,运行在声明了权限的沙盒里。
- **标签页分组**保存在主页上,处于关闭状态,不占内存。
- **AI 搜索**(可选,使用你自己的密钥),一行就给出回答,并指向合适的网站。
- **音乐:** 生成式背景音乐,以及通过 [Stave](https://stave.live) 用 Strudel 进行 live coding(时间线、网格、钢琴卷帘、调音台、视觉效果),带"实时"模式,还有叠在大海上的透明背景。
- **浏览器的基本功能:** 历史记录、收藏夹、页内查找、缩放、右键菜单、下载、打印、可恢复的标签页,以及后退和前进列表。
- **两个起始画面:** 有灯塔的海洋和岛屿,图标可以更换,天空会变化,还有你所在城市的天气(可选)。
- **社区主题:** 见 [`docs/TEMAS.md`](../TEMAS.md)。**模组:** [`docs/MODS.md`](../MODS.md)。**安全:** [`docs/SEGURANCA.md`](../SEGURANCA.md)。
- **可验证的隐私:** `oceano://rede` 会显示浏览器自身的每一个连接。

## 小猫

<p><img src="../imagens/gato.gif" width="240" alt="Oceano 的小猫正在操作电脑"></p>

如果你愿意,你的头像可以是这只小猫。你也可以自己创建,像素风、网格或 3D 都行。

## 安全地录屏

Oceano 就是为出现在视频和直播里而设计的。本地信息(你打开过的网站、地址、
代理规则)会藏在一块带锁的像素化方块后面。点击之后,Oceano 会提示
这属于你的安全数据,只有你确认才会显示;关闭浏览器时,一切又会
重新隐藏。需要本地服务器的部分,比如头像编辑器,由 Oceano 自己开启和
关闭,并且只与你的电脑通信。

## 无障碍

无障碍比风格更重要。每个主题都应该易于阅读:文字对比度至少 4.5:1
(WCAG AA),状态不能只靠颜色区分,并且要有清晰可见的焦点轮廓。主题编辑器会实时检查
对比度,并在保存前提醒你。如果你做主题,请阅读
[无障碍指南](../ACESSIBILIDADE-TEMAS.md)。

## 许可证

Oceano 的代码是**自由软件**,采用 [GNU GPL v3.0 或更高版本](../../LICENSE):
你可以使用、研究、修改和分发;分发修改版的人必须
保持代码开源,并使用相同的许可证。

- **模组和主题属于你。** 模组(使用模组 API 的 Lua/Teal 脚本)和主题(`oceano-tema`
  文件)不被视为 Oceano 的衍生作品,可以使用任何许可证。
  请看 [`AVISOS.md`](../../AVISOS.md) 中的附加许可。
- **第三方部分**保留它们各自的许可证(MIT、BSD、MPL-2.0、Apache-2.0、AGPL-3.0……)。
  完整列表以及每项的要求,见 [`AVISOS.md`](../../AVISOS.md)。

## 致谢

Oceano 建立在很多人的工作之上。特别感谢:

- **[Stave](https://stave.live)**,作者 Mrityunjay Bhardwaj([GitHub 代码](https://github.com/MrityunjayBhardwaj/Stave),AGPL-3.0):Oceano 里的音乐工作室(`oceano://stave`),带有时间线、网格、钢琴卷帘、调音台和视觉效果。在 Oceano 里,它增加了"实时"模式、透明背景,以及带音乐的视频录制。
- **[Strudel](https://strudel.cc)**,作者 Felix Roos、Alex McLean 和社区([代码](https://codeberg.org/uzu/strudel),AGPL-3.0):驱动 Stave 的代码音乐语言。
- **[Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)**,作者 shinshin86(MIT):领航员的动画头像和头像编辑器。
- **Lua**(PUC-Rio)、**Teal**(Hisham Muhammad)、**three.js**、**Chromium** 和 **Electron**。
- **四足机器人 3D 模型**(`simulador/robo/modelos/quadrupede.3mf`),BY-NC 许可,依据文件自身的数据:它**只用于四足机器人**,不用于其他机器人。它不在 Oceano 的 GPL 之下,也不能商用。

- **[Whisper](https://github.com/openai/whisper)**,OpenAI(MIT),使用 [onnx-community](https://huggingface.co/onnx-community/whisper-base)(Apache-2.0)的 ONNX 转换版本:语音转文字,在电脑本地运行,只有用户主动要求时才会下载。
- **[Open-Meteo](https://open-meteo.com)**:天气和城市搜索,无需密钥,无需账号。

完整列表及许可证见 [`AVISOS.md`](../../AVISOS.md) 和"关于领航员"页面。

## 作者

由 **@hericdk** 创作 · Instagram [@hericdk](https://instagram.com/hericdk)

Oceano 的官方账号还在筹备中。
