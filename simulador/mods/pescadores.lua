-- Pescadores · tema vivo da faixa embaixo das abas
-- Barquinhos balançando; cada pescador joga a linha e puxa o peixe que passa no anzol.

largura, altura = "auto", 12
fps = 20                   -- faixa calma: 20 quadros por segundo bastam e gastam um terço a menos

local AGUA = 7             -- linha da superfície
local barcos, peixes = {}, {}
local pescados = 0

local function novo_peixe(x)
  local v = 0.1 + rnd(0.25)
  return {
    x = x or (rnd(1) < 0.5 and -4 or W + 4),
    y = AGUA + 2 + flr(rnd(3)),
    v = rnd(1) < 0.5 and v or -v,
    c = rnd(1) < 0.5 and cor.destaque or cor.sol,
  }
end

function _init()
  local n = math.max(2, flr(W / 90))
  for i = 1, n do
    barcos[i] = {
      x = (i - 0.5) * W / n + rnd(20) - 10,
      v = (rnd(1) < 0.5 and -1 or 1) * (0.02 + rnd(0.03)),
      linha = 0,                      -- quanto da linha está dentro d'água
      fundo = 2 + flr(rnd(3)),        -- profundidade onde o anzol para
      espera = flr(rnd(90)),
      presa = nil,
      festa = 0,                      -- quadros comemorando a pescaria
    }
  end
  for i = 1, math.max(4, flr(W / 40)) do peixes[i] = novo_peixe(rnd(W)) end
end

local function anzol(b) return flr(b.x) + 7, AGUA + b.linha end

function _update()
  for _, p in ipairs(peixes) do
    p.x = p.x + p.v
    if p.x > W + 4 then p.x = -4 elseif p.x < -4 then p.x = W + 4 end
  end

  for _, b in ipairs(barcos) do
    b.x = b.x + b.v
    if b.x < 2 or b.x > W - 12 then b.v = -b.v end
    if b.festa > 0 then b.festa = b.festa - 1 end

    if b.presa then
      -- puxando: a linha sobe e o peixe vem junto
      if flr(t() * 30) % 3 == 0 then b.linha = b.linha - 1 end
      if b.linha <= 0 then
        b.linha, b.presa, b.festa = 0, nil, 40
        pescados = pescados + 1
        table.insert(peixes, novo_peixe())
        b.espera = 60 + flr(rnd(120))
      end
    elseif b.espera > 0 then
      b.espera = b.espera - 1
    elseif b.linha < b.fundo then
      if flr(t() * 30) % 6 == 0 then b.linha = b.linha + 1 end
    else
      -- anzol na água: fisga o primeiro peixe que encostar
      local ax, ay = anzol(b)
      for i, p in ipairs(peixes) do
        if math.abs(p.x - ax) < 1 and math.abs(p.y - ay) <= 1 then
          b.presa = table.remove(peixes, i)
          break
        end
      end
    end
  end
end

local function desenhar_peixe(x, y, c, v)
  local d = v >= 0 and 1 or -1      -- para onde o peixe nada; a cauda fica atrás
  pset(x, y, c); pset(x - d, y, c)
  pset(x - 2 * d, y - 1, c); pset(x - 2 * d, y + 1, c)
end

function _draw()
  cls(cor.painel)
  rectfill(0, AGUA + 1, W - 1, H - 1, cor.fundo)
  -- a superfície em trechos: uma linha por trecho na mesma altura, em vez de um ponto por pixel
  -- (cada chamada de desenho atravessa da Lua para o navegador; 600 pontos por quadro pesavam)
  local x0, y0 = 0, nil
  for x = 0, W do
    local y = x < W and AGUA + flr(math.sin(x / 5 + t() * 2) * 0.6 + 0.5) or nil
    if y ~= y0 then
      if y0 then line(x0, y0, x - 1, y0, cor.acento) end
      x0, y0 = x, y
    end
  end

  for _, p in ipairs(peixes) do desenhar_peixe(flr(p.x), p.y, p.c, p.v) end

  for i, b in ipairs(barcos) do
    local x = flr(b.x)
    local y = AGUA - 1 + flr(math.sin(t() * 2 + i) * 0.6 + 0.5)    -- balanço
    -- casco
    line(x, y, x + 7, y, cor.suave)
    line(x + 1, y + 1, x + 6, y + 1, cor.suave)
    -- pescador (pula quando pega um peixe)
    local py = y - 2 - (b.festa > 0 and flr(b.festa / 5) % 2 or 0)
    pset(x + 3, py - 1, cor.texto)
    pset(x + 3, py, cor.texto)
    -- vara e linha
    line(x + 4, py - 1, x + 7, y - 4, cor.texto)
    if b.linha > 0 or b.presa then
      local ax, ay = anzol(b)
      line(ax, y - 3, ax, ay, cor.borda)
      if b.presa then desenhar_peixe(ax, ay, b.presa.c, 1) end
    end
  end

  local en = oceano_idioma and oceano_idioma() == "en"
  local txt = pescados .. (en and " FISH" or (pescados == 1 and " PEIXE" or " PEIXES"))
  print(txt, W - #txt * 4 - 2, 1, cor.suave)
end
