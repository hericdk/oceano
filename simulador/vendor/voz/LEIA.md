# Voz neural

- `voz-brilho.bin`: mistura de vozes do Kokoro-82M (Apache-2.0): 72% pf_dora, 18% af_nicole, 7% af_bella, 3% jf_gongitsune.
- `voz-mari.bin`: mistura de vozes do Kokoro-82M (Apache-2.0): 70% if_sara, 30% af_nicole, lendo com a pronúncia do português. É a única feminina daqui sem a pf_dora, que já é a base da Brilho.
- `voz-alex.bin`, `voz-noel.bin`: as vozes pm_alex e pm_santa do Kokoro-82M (Apache-2.0).
- `amostras/<idioma>/`: frases curtas geradas com o Kokoro neste projeto, para ouvir antes de baixar o modelo, em cada idioma do primeiro slide.
- `vocab.json`: tabela de sons do Kokoro.
- `espeak-ng.*`: pronúncia em WebAssembly (espeak-ng, GPL-3.0; porte @echogarden/espeak-ng-emscripten 0.3.5).
- `ort*`: ONNX Runtime Web 1.31.1 (MIT).
- O modelo (86 MB, `model_q8f16.onnx`) não fica aqui: é baixado uma vez e conferido pelo SHA-256 (veja `js/voz-worker.js`).
