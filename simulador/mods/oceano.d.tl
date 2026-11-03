-- Tipos da API dos mods do Oceano, para mods escritos em Teal.
global largura: any
global altura: integer
global W: integer
global H: integer
global N_CORES: integer
global record Cores
  fundo: integer
  painel: integer
  elevado: integer
  borda: integer
  texto: integer
  suave: integer
  acento: integer
  destaque: integer
  sol: integer
end
global cor: Cores
global _init: function()
global _update: function()
global _draw: function()
global cls: function(c?: integer)
global pset: function(x: number, y: number, c: integer)
global line: function(x0: number, y0: number, x1: number, y1: number, c: integer)
global rect: function(x0: number, y0: number, x1: number, y1: number, c: integer)
global rectfill: function(x0: number, y0: number, x1: number, y1: number, c: integer)
global circ: function(x: number, y: number, r: number, c: integer)
global circfill: function(x: number, y: number, r: number, c: integer)
global btn: function(i: integer): boolean
global btnp: function(i: integer): boolean
global mouse: function(): integer, integer, boolean, boolean
global tecla: function(): string
global guardar: function(chave: string, valor: string | number | boolean)
global ler: function(chave: string): any
global record Som
  onda: string
  de: number
  ate: number
  dur: number
  vol: number
  notas: {number}
end
global sfx: function(som: string | Som)
global t: function(): number
global rnd: function(n?: number): number
global flr: function(n: number): integer
global log: function(...: any)
global record Hora
  hora: integer
  min: integer
  seg: integer
end
global record Oceano
  on: function(evento: string, fn: function(...: any))
  modo_jogo: function(ligado: boolean)
  congelar_abas: function()
  notificar: function(texto: string)
  hora: function(): Hora
end
global oceano: Oceano
