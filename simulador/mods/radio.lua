-- Rádio do Mar · chiptune gerado na hora, sem arquivo de áudio
-- TOCAR/PAUSA à esquerda, >> troca de faixa. Ligue o som na barra do navegador.

largura, altura = 72, 40

local ESCALA = { 0, 2, 4, 7, 9 }   -- pentatônica: qualquer sequência soa bem
local tocando, faixa, passo, quadros = false, 1, 0, 0
local barras = { 0, 0, 0, 0, 0, 0, 0, 0 }

-- cada faixa é uma sequência de 16 passos sorteada a partir do número dela
local function sorteio(i)
  return (math.sin(faixa * 97.31 + i * 13.73) * 43758.5453) % 1
end

local function freq(grau, oitava)
  return 220 * 2 ^ ((ESCALA[grau] + 12 * oitava) / 12)
end

local function proxima()
  faixa, passo = faixa + 1, 0
  sfx("clique")
end

function _update()
  local mx, _, dentro = mouse()
  if btnp(4) then
    if dentro and mx >= 48 then proxima() else tocando = not tocando end
  end
  if btnp(5) then proxima() end

  for i = 1, #barras do barras[i] = math.max(0, barras[i] - 0.7) end
  if not tocando then return end

  quadros = quadros + 1
  if quadros % 5 ~= 0 then return end     -- 6 passos por segundo
  passo = passo % 16 + 1
  local r = sorteio(passo)
  if r > 0.25 then
    local grau = 1 + flr(r * 23) % 5
    local oitava = r > 0.85 and 1 or 0
    local f = freq(grau, oitava)
    sfx({ onda = faixa % 2 == 0 and "triangulo" or "quadrada", de = f, ate = f, dur = 0.14, vol = 0.09 })
    barras[1 + (grau + oitava * 5) % 8] = 12
  end
  if passo % 4 == 1 then
    local baixo = freq(1, -1)
    sfx({ onda = "triangulo", de = baixo, ate = baixo * 0.97, dur = 0.22, vol = 0.14 })
    barras[1] = 14
  end
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  print("RADIO DO MAR", 2, 2, cor.suave)
  for i, b in ipairs(barras) do
    local x = 4 + (i - 1) * 8
    local h = flr(b)
    if h > 0 then rectfill(x, 26 - h, x + 5, 26, i % 3 == 0 and cor.destaque or cor.acento) end
    line(x, 27, x + 5, 27, cor.borda)
  end
  print("FAIXA " .. faixa, 2, 9, cor.texto)

  rectfill(2, 30, 44, 37, tocando and cor.destaque or cor.acento)
  print(tocando and "PAUSA" or "TOCAR", 13, 32, cor.fundo)
  rectfill(48, 30, 69, 37, cor.elevado)
  print(">>", 55, 32, cor.texto)
end
