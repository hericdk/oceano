-- Bolhas · widget escrito em Teal (Lua com tipos)
-- Teal foi criado pelo brasileiro Hisham Muhammad. Erros de tipo
-- aparecem no console antes do mod rodar, com linha e coluna.

largura, altura = 40, 36

local record Bolha
  x: number
  y: number
  r: integer
  v: number
end

local bolhas: {Bolha} = {}

local function nova(y: number): Bolha
  return { x = 4 + rnd(W - 8), y = y, r = 1 + flr(rnd(3)), v = 0.2 + rnd(0.4) }
end

function _init()
  for _ = 1, 8 do
    table.insert(bolhas, nova(rnd(H)))
  end
end

function _update()
  for i, b in ipairs(bolhas) do
    b.y = b.y - b.v
    b.x = b.x + math.sin(t() * 2 + i) * 0.15
    if b.y < -3 then bolhas[i] = nova(H + 3) end
  end
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  for _, b in ipairs(bolhas) do
    circ(b.x, b.y, b.r, cor.acento)
    pset(b.x - 1, b.y - 1, cor.texto)
  end
end
