-- Surfistas · tema vivo da faixa embaixo das abas
-- Ondas de pixel que vêm e vão; surfistas descem a face da onda com movimento suave (sem trancos).

largura, altura = "auto", 12
fps = 20                   -- faixa calma: 20 quadros por segundo bastam e gastam um terço a menos

local surfistas = {}
local BASE = 8                 -- nível médio do mar na faixa

-- altura da onda num ponto: duas ondas lentas somadas, para nunca ficar repetitiva
local function onda(x, tt)
  return math.sin(x / 14 - tt * 1.4) * 1.6 + math.sin(x / 31 + tt * 0.7) * 0.9
end

-- easing suave (ida e volta): o surfista acelera e freia sem saltos
local function suave(v) return v * v * (3 - 2 * v) end

function _init()
  local n = math.max(2, flr(W / 120))
  for i = 1, n do
    surfistas[i] = { base = (i - 0.5) * W / n, amp = 18 + rnd(18), fase = rnd(1), periodo = 6 + rnd(5), c = rnd(1) < 0.5 and cor.sol or cor.destaque }
  end
end

function _update() end

function _draw()
  local tt = t()
  cls(cor.painel)
  -- mar em colunas de trechos: só desenha uma linha vertical por coluna de 2 px (metade das chamadas)
  for x = 0, W - 1, 2 do
    local y = flr(BASE - onda(x, tt) + 0.5)
    rectfill(x, y, x + 1, H - 1, cor.fundo)
    line(x, y, x + 1, y, cor.acento)
  end
  -- espuma na crista das ondas mais altas
  for x = 0, W - 1, 6 do
    if onda(x, tt) > 1.9 then pset(x, flr(BASE - onda(x, tt)) - 1, cor.texto) end
  end
  for _, s in ipairs(surfistas) do
    -- vai e volta na face da onda, com easing
    local f = ((tt / s.periodo) + s.fase) % 1
    local ida = f < 0.5 and suave(f * 2) or suave((1 - f) * 2)
    local x = flr(s.base + (ida - 0.5) * s.amp)
    local y = flr(BASE - onda(x, tt) + 0.5) - 1
    local dir = f < 0.5 and 1 or -1
    line(x - 2, y, x + 2, y, cor.suave)          -- prancha
    pset(x, y - 1, s.c); pset(x, y - 2, s.c)        -- corpo
    pset(x + dir, y - 2, s.c)                      -- braço para o lado em que vai
    pset(x, y - 3, cor.texto)                      -- cabeça
  end
end
