-- Peixes na Barra · tema vivo
-- Uma faixa animada embaixo das abas. A largura acompanha a janela.

largura, altura = "auto", 7

local peixes = {}

function _init()
  for i = 1, 10 do
    peixes[i] = {
      x = rnd(W),
      y = 1 + flr(rnd(3)),
      v = 0.15 + rnd(0.45),
      c = rnd(1) < 0.5 and cor.destaque or cor.sol,
    }
  end
end

function _update()
  for _, p in ipairs(peixes) do
    p.x = p.x + p.v
    if p.x > W + 3 then p.x, p.y = -3, 1 + flr(rnd(3)) end
  end
end

function _draw()
  cls(cor.painel)
  for x = 0, W - 1 do
    local y = H - 1 - flr((math.sin(x / 6 + t() * 2) + 1) * 0.75)
    line(x, y, x, H - 1, cor.borda)
  end
  for _, p in ipairs(peixes) do
    local x = flr(p.x)
    -- corpo de 2 pixels e cauda em V
    pset(x, p.y, p.c); pset(x - 1, p.y, p.c)
    pset(x - 2, p.y - 1, p.c); pset(x - 2, p.y + 1, p.c)
  end
end
