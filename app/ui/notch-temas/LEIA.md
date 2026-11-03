# Temas do notch

Um tema do notch é uma pasta com um `tema.json` e, se quiser, uma folha de sprites em PNG. Não tem código:
o Oceano só lê a imagem e as cores, então qualquer pessoa pode fazer e trocar temas sem risco.

Os temas que vêm com o Oceano ficam aqui. Os seus vão na pasta `notch-temas` dos dados do Oceano
(Configurações → Notch → "abrir a pasta dos temas"); cada tema numa pasta própria com o nome do `id`.

## tema.json

```json
{
  "formato": "oceano-notch/1",
  "id": "meu-tema",
  "nome": "Meu tema",
  "autor": "seu nome",
  "estilo": "livre",
  "cores": { "fundo": "#000000", "texto": "#ffffff", "destaque": "#0040ff" },
  "fundoEditavel": true,
  "personagem": {
    "folha": "folha.png",
    "quadro": [84, 64],
    "fps": 6,
    "estados": { "parado": [[0, 2]], "pensando": [[0, 0], [1, 0]], "falando": [[0, 0], [1, 0]] },
    "boca": [36, 31],
    "rosto": [20, 4, 44, 36]
  }
}
```

- `id`: letras minúsculas, números e hífen (até 40). Igual ao nome da pasta.
- `estilo`: `"janela"` (o painel vira uma janelinha do Oceano, nas cores do tema escolhido no navegador) ou
  `"livre"` (painel liso na cor `cores.fundo`).
- `cores` (opcional, só no estilo livre): `fundo`, `texto` e `destaque`, em `#rrggbb`.
- `fundoEditavel`: deixa a pessoa trocar a cor do fundo nas Configurações.
- `personagem`: `"avatar"` usa o avatar da Navegadora; ou uma folha de sprites:
  - `folha`: PNG com os quadros lado a lado (até 2048 × 2048 px);
  - `quadro`: largura e altura de cada quadro, em pixels;
  - `estados`: para `parado`, `pensando` e `falando`, a lista de quadros `[coluna, linha]` da folha;
  - `boca` (opcional): ponto `[x, y]` no quadro onde a boca abre quando a Navegadora fala;
  - `rosto` (opcional): retângulo `[x, y, largura, altura]` do quadro mostrado no notch fechado.

Desenhe em pixel art e sem suavização: o Oceano mostra a folha em pixels grandes, sem borrar.
