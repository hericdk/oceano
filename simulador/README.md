# Simulador do Oceano

Protótipo da interface do navegador Oceano (fase 0): UI pixel art, mar em Three.js,
temas `.oceano` e mods em Lua rodando em sandbox. Tudo local, nenhuma conexão externa.

```bash
python3 serve.py 5216
```

Abra http://localhost:5216. O plano técnico fica em http://localhost:5216/docs/plano.html.

Editor de temas: `oceano://temas/editar` (ou Temas → Criar tema).

## Estrutura

- `js/main.js`: abas, navegação `oceano://`, eventos, gerenciador de mods, modo jogo
- `js/paginas.js`: páginas internas (nova-aba, mods, editar, temas, jogo, rede, sobre, offline)
- `js/mar.js`: mar em Three.js (ondas Gerstner, dia/noite, farol), reduzido à paleta com pixelização Bayer
- `js/lua.js`: runtime dos mods (wasmoon/Lua 5.4), API, permissões, limite de 40 ms por chamada
- `js/sfx.js`: sons chiptune sintetizados (WebAudio)
- `js/assistente.js`: Navegadora (simulação) na barra lateral: avatar, voz, cérebro por regras e ferramentas no formato de *tool use*
- `js/trilha.js`: aba Trilha na barra lateral: música "vibe trip" sem fim, composta na hora com os sons do ½ sampler (síntese offline, sem arquivos). Seções de 8 compassos, o navegador toca junto (páginas e abas viram notas), o modo jogo afunda a música, Alt+M toca/pausa, grava .wav (`js/trilha-gravador.js`)
  - Amostra de vídeo (YouTube/Instagram) pelo motor local do ½ sampler (`../../half-sampler/serve.py`, porta 5217: yt-dlp + Demucs, tudo neste computador, sem cookies): onda do vídeo, trecho, BPM/tom detectados, fatias de 16 por compasso no tempo da trilha, separação em bateria/baixo/voz/outros.
- `js/temas.js`: formato `oceano-tema/1`, validação, importação de paletas (.hex, .gpl, JSON) e contraste
- `temas/*.json`: temas no formato `oceano-tema/1` (paleta de até 16 cores, tokens de UI e o campo opcional `mar`: pixelizar, cores, pixel, ondas…)
- `mods/*.lua`, `mods/*.tl` + `mods/index.json`: mods de exemplo (Lua e Teal) e suas permissões
- `mods/oceano.d.tl`: tipos da API para mods em Teal
- `avatares/`: avatares 2D da Navegadora (veja `avatares/LEIA.md`)
- `vendor/`: three.js 0.170, mesh-avatar 0.4.0 (MIT), wasmoon 1.16, compilador Teal 0.24.8 (`tl.lua`, MIT), fontes Pixelify Sans e Silkscreen (sem CDN)

## Sandbox dos mods

Cada mod roda num motor Lua separado, sem `io`, `os.execute`, `require`, `load` ou `debug`.
As funções só existem se a permissão estiver declarada; senão, a chamada dá erro.
Uma chamada que passa de 40 ms (ex.: loop infinito) pausa o mod.
A Lua usada é a oficial da PUC-Rio (5.4), aqui compilada para WebAssembly; no navegador final, embutida em C.

## Créditos

- Lua: PUC-Rio (MIT). Teal: Hisham Muhammad (MIT, `vendor/tl.LICENSE`).
- Água do mar: técnicas de Mark Finch, "Effective Water Simulation from Physical Models" (GPU Gems, cap. 1),
  como organizadas no repositório [shader-skills](https://github.com/gokayfem/shader-skills) (MIT). Código reescrito.
- Ruído de gradiente intercalado: Jorge Jimenez (SIGGRAPH 2014).
- Avatar da Navegadora: runtime [Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio) (MIT).
