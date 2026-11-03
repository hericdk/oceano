# Avisos de licença

Copyright (C) 2026 @hericdk

O Oceano é distribuído sob a GNU General Public License, versão 3 ou (à sua escolha) qualquer
versão posterior. O texto completo está em [`LICENSE`](LICENSE).

## Permissão adicional para mods e temas (GPLv3, seção 7)

Como permissão adicional, os seguintes itens **não** são considerados obras baseadas no Oceano e
podem ser distribuídos sob qualquer licença, inclusive fechada:

1. **Mods**: scripts em Lua ou Teal carregados pelo Oceano e que interagem com ele apenas pela API
   pública de mods (o objeto `oceano` e as permissões declaradas no manifesto do mod).
2. **Temas**: arquivos de dados no formato `oceano-tema` (JSON).
3. **Cartuchos e conteúdo do usuário**: jogos, músicas, padrões do Strudel e outros arquivos
   criados por quem usa o Oceano.

Esta permissão não se aplica a modificações do próprio código do Oceano.

## Partes de terceiros

Cada componente abaixo continua sob a licença dele. As licenças permissivas (MIT, BSD, Apache)
pedem só que o aviso de copyright acompanhe o código. MPL-2.0 pede que alterações nos arquivos
daquele componente fiquem abertas. A AGPL-3.0 pede que, ao distribuir o Oceano com esse
componente, o código-fonte dele também seja oferecido (os links estão abaixo), e que alterações
feitas nele sejam publicadas sob a AGPL.

| Componente | Onde | Licença | Código-fonte |
|---|---|---|---|
| Chromium (via Electron) | `app/` | BSD-3-Clause | https://www.chromium.org |
| Electron | `app/` | MIT | https://github.com/electron/electron |
| @ghostery/adblocker-electron | `app/` | MPL-2.0 | https://github.com/ghostery/adblocker |
| @anthropic-ai/sdk | `app/` (busca com IA) | Apache-2.0 | https://github.com/anthropics/anthropic-sdk-typescript |
| three.js 0.170 | `simulador/` | MIT | https://github.com/mrdoob/three.js |
| wasmoon 1.16 / Lua 5.4 (PUC-Rio) | `simulador/` | MIT | https://github.com/ceifa/wasmoon · https://www.lua.org |
| Teal 0.24.8 | `simulador/vendor/tl.lua` | MIT | https://github.com/teal-language/tl |
| Mesh Avatar Studio 0.4.0 | `simulador/vendor/mesh-avatar/` | MIT | https://github.com/shinshin86/mesh-avatar-studio |
| three-vrm 3.5.5 | `simulador/vendor/three-vrm/` | MIT | https://github.com/pixiv/three-vrm |
| GLTFLoader e BufferGeometryUtils (three.js r170) | `simulador/vendor/three-vrm/` | MIT | https://github.com/mrdoob/three.js |
| Whisper base (OpenAI), conversão ONNX da onnx-community | baixado sob pedido em `userData/transcricao` | MIT, Apache-2.0 | https://github.com/openai/whisper · https://huggingface.co/onnx-community/whisper-base |
| Pixelify Sans, Silkscreen | `simulador/` | SIL OFL 1.1 | https://fontsource.org |
| Stave 0.5.0 (Mrityunjay Bhardwaj) | `simulador/stave/` (compilado) | AGPL-3.0 | https://github.com/MrityunjayBhardwaj/Stave |
| ↳ dentro do Stave: Strudel, hydra, p5.js, Monaco e outros | `simulador/stave/` | AGPL-3.0, LGPL, MIT | https://codeberg.org/uzu/strudel · https://github.com/hydra-synth/hydra-synth |

O Stave roda isolado numa página própria (`/stave`, aberto em `oceano://stave`). Ele é compilado a
partir do repositório original com as mudanças do Oceano (o "ao vivo" que toca sem apertar Play, o
botão de fundo transparente, o endereço `/stave` e a retirada da estatística da Vercel). Essas mudanças
estão em [`terceiros/stave-oceano.patch`](terceiros/stave-oceano.patch), e o build em
[`terceiros/construir-stave.sh`](terceiros/construir-stave.sh), como a AGPL pede. A GPL-3.0 do Oceano e a
AGPL-3.0 dele são compatíveis (seção 13 de ambas): cada parte continua com a sua licença.

### MicromediaFlash

O editor de animação **MicromediaFlash** (@hericdk, licença AGPL-3.0) roda isolado numa página própria
(`/micromediaflash`, aberto em `oceano://micromediaflash`). É um projeto separado, com a licença dele; o
Oceano só o serve e oferece os arquivos (`app/micromediaflash.js`, `simulador/js/micromediaflash.js`).
O código dele não vem neste repositório: para usar, baixe [hericdk/micromediaflash](https://github.com/hericdk/micromediaflash)
numa pasta ao lado do Oceano (`../micromediaflash`). Sem ela, a página explica isso.

### Dados de clima

Com a opção de clima da cidade ligada, os dados vêm do [Open-Meteo](https://open-meteo.com) (CC BY 4.0).

### Simulador de robótica

O **simulador de robótica** (`simulador/robo`, aberto em `oceano://robo`) é gerado pelo `empacotar.py` do projeto
original e roda sem internet. Bibliotecas incluídas: three.js 0.160 (MIT), Rapier 0.14 (Apache-2.0),
TensorFlow.js 4.22 (Apache-2.0), Dexie 4.0 (Apache-2.0), fflate 0.8 (MIT), uPlot 1.6 (MIT), mp4-muxer 5.1 (MIT) e a
fonte Handjet (OFL-1.1). As medidas e os limites do robô Microduck vêm de pollen-robotics/microduck_rl (Apache-2.0).
A lista fica em `simulador/robo/vendor/LICENCAS.md`.

### Vozes neurais

- As vozes `voz-*.bin` e as amostras em `simulador/vendor/voz/` vêm do Kokoro-82M (Apache-2.0).

### Modelo 3D do robô

- `simulador/robo/modelos/quadrupede.3mf`: licença BY-NC, conforme os dados do próprio arquivo. É usado apenas no robô Quadrúpede. Não está sob a GPL do Oceano. Modelos importados mostram na tela o autor e a licença que trouxerem.
