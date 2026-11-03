# Modelos 3D do simulador de robôs: guia para IAs

Este guia é para IAs conectadas ao Oceano que vão ajudar a pessoa com os modelos do simulador (`oceano://robo`).

## As regras

- **Modelos enviados pela pessoa:** podem ser lidos e mudados, sempre com o ok dela. São os robôs criados na oficina (`original: false`).
- **Modelos originais:** ficam como estão. São os quatro robôs de fábrica (Hexápode, Quadrúpede, Gato e Microduck). Só podem ser lidos e duplicados. Para mudar um deles, duplique e mude a cópia.
- **Tudo fica no navegador:** os modelos não saem deste computador por estes comandos, e nenhum comando lê ou grava arquivos do sistema.
- **Modelo incluído no simulador:** `quadrupede.3mf` tem licença própria (veja `AVISOS.md`) e só vale no robô Quadrúpede. A cópia dele continua sendo um Quadrúpede, então o nome pedido é ignorado nesse caso.

## Como pedir

A Navegadora usa a ferramenta `robo_modelo`, com o campo `acao`. O simulador precisa estar aberto em `oceano://robo`.

| `acao` | O que faz | Campos | Pede o ok da pessoa |
|---|---|---|---|
| `listar` | Lista os robôs e o arquivo de cada um | nenhum | não |
| `ler` | Mostra peças, partes do robô e montagem | `id` | não |
| `duplicar` | Cria um robô novo, copiando modelo e montagem | `id`, `nome` (opcional) | sim |
| `montagem` | Troca a montagem de um robô | `id`, `inst` | sim |
| `trocar` | Troca o arquivo por um STL em texto, de até 5 MB | `id`, `nome`, `stl` | sim |

Mudar um original devolve o erro `modelo original: duplique primeiro e mude a cópia`.

## Como é uma montagem

O modelo é só a forma. Quem anda é o esqueleto da base, e cada peça é presa a uma parte dele. `inst` é uma lista de até 500 peças, escrita como texto em JSON:

```json
[{ "part": "caixa", "link": "corpo", "p": [0, 0, 0], "r": [0, 0, 0], "s": [1, 1, 1] }]
```

- `part`: nome da peça, vindo de `pecas` em `ler`.
- `link`: parte do robô, vinda do campo `k` de `elos` em `ler`. Use `corpo` ou algo como `FE:1`.
- `p`: posição, com 3 números.
- `r`: rotação, com 3 números.
- `s`: escala, com 3 números (opcional).

## O que levar em conta

- Um STL único não dobra: para as pernas se mexerem, são necessárias peças separadas.
- Trocar o arquivo apaga a montagem daquele robô, porque as peças mudaram.
- O peso das peças ainda não entra na física. O teste de "aguenta ou não" usa a massa da base, então avise a pessoa disso ao falar do resultado.
- Quando a física disser `aguenta`, lembre que é uma simulação: confira na bancada antes de confiar.
