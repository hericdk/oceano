# Avatares da Navegadora

Avatares 2D no formato do [Mesh Avatar Studio](https://github.com/shinshin86/mesh-avatar-studio)
(runtime `mesh-avatar` 0.4.0, MIT, em `vendor/mesh-avatar/`).

- `cara/`: a personagem do Oceano (malha de pontos). `cara-pixel/`: a mesma Kara em pixel art.
- `boneco-3d/`: exemplo 3D em VRM 1.0, gerado por `gerar.mjs` (nada de fora). Prova que ossos, molas e expressões funcionam.
- Avatares 3D importados (`.vrm` ou `.glb`) ficam no IndexedDB deste computador. Código em `js/avatar3d.js`.

- `gato/`: modelo de pixel art (`sprite.json` + `folha.png`). A animação está torta de propósito: é o primeiro exercício para quem chega. Não conserte sem combinar.

Para um avatar novo: criar no Mesh Avatar Studio a partir de uma ilustração, exportar a pasta
(`rig.json`, `avatar.json`, `built/`) para cá e trocar `AVATAR` em `js/assistente.js`.

## Avatar 3D
- `.vrm`: usa ossos, molas (mechas) e expressões do arquivo. Pode ser feito no Blender com um complemento de VRM.
- `.glb` sem ossos: a malha é deformada no vertex shader (cabeça, respiração, balanço com mola), como o 2D faz com a ilustração. Formas do Blender com nomes como `aa`, `blink` ou `smile` também são usadas.
- A interface é a mesma do runtime 2D (`advance`, `setEmotion`, `speakKana`…), então voz, conversa e visual pixel não mudam. Gerar o exemplo de novo: `node simulador/avatares/boneco-3d/gerar.mjs`.
- O notch do Mac continua no último avatar 2D.
