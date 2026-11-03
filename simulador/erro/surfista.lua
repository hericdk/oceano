-- Surfista · a tela de erro do Oceano: aparece só em erro 404 e sem internet. Fica fora da lista de mods e não muda com tema.
-- Espaço, ↑ ou toque para pular. Pegue conchas, desvie das pedras.

largura, altura = 160, 90

local CHAO = 66
local surfista = {
  "..11..",
  "..11..",
  ".1111.",
  "1.11.1",
  "..11..",
  ".1..1.",
  "222222",
}

local y, vy, pedras, conchas, pontos, recorde, vivo, vel, espera

local function reiniciar()
  y, vy = CHAO, 0
  pedras, conchas = {}, {}
  pontos, vivo, vel, espera = 0, true, 1.2, 40
end

function _init()
  recorde = 0
  reiniciar()
end

local function pulou()
  return btnp(4) or btnp(2)
end

function _update()
  if not vivo then
    if pulou() then reiniciar() end
    return
  end

  vel = vel + 0.0008
  if pulou() and y >= CHAO then
    vy = -3.2
    sfx("pulo")
  end
  vy = vy + 0.18
  y = math.min(y + vy, CHAO)
  if y == CHAO then vy = 0 end

  espera = espera - 1
  if espera <= 0 then
    if rnd(1) < 0.65 then
      table.insert(pedras, { x = W + 4, h = 5 + flr(rnd(6)) })
    else
      table.insert(conchas, { x = W + 4, y = 40 + flr(rnd(16)) })
    end
    espera = 35 + flr(rnd(45))
  end

  -- o surfista ocupa x 20..25 e y-7..y
  for i = #pedras, 1, -1 do
    local p = pedras[i]
    p.x = p.x - vel
    if p.x < -8 then
      table.remove(pedras, i)
      pontos = pontos + 1
    elseif p.x < 25 and p.x + 6 > 20 and y > 68 - p.h then
      vivo = false
      recorde = math.max(recorde, pontos)
      sfx("erro")
    end
  end

  for i = #conchas, 1, -1 do
    local c = conchas[i]
    c.x = c.x - vel
    if c.x < -4 then
      table.remove(conchas, i)
    elseif c.x < 25 and c.x + 3 > 20 and c.y + 3 > y - 7 and c.y < y then
      table.remove(conchas, i)
      pontos = pontos + 5
      sfx("moeda")
    end
  end
end

local function desenhar_sprite(spr, x, y, cores)
  for linha = 1, #spr do
    for col = 1, #spr[linha] do
      local ch = spr[linha]:sub(col, col)
      if ch ~= "." then pset(x + col - 1, y + linha - 1, cores[ch]) end
    end
  end
end

function _draw()
  cls(cor.fundo)
  circfill(132, 18, 8, cor.sol)

  -- duas camadas de onda
  -- em faixas de 4 px: cada chamada de desenho custa, e o limite é de 40 ms por quadro
  local agora = t()
  rectfill(0, 62, W - 1, H - 1, cor.elevado)
  for x = 0, W - 1, 8 do
    local fundo = flr(60 + math.sin(x / 14 + agora) * 2)
    rectfill(x, fundo, x + 7, 62, cor.elevado)
  end
  rectfill(0, 70, W - 1, H - 1, cor.acento)
  for x = 0, W - 1, 4 do
    local frente = flr(68 + math.sin(x / 9 + agora * 3) * 1.5)
    rectfill(x, frente + 1, x + 3, 70, cor.acento)
    rectfill(x, frente, x + 3, frente, cor.texto)
  end

  for _, p in ipairs(pedras) do
    rectfill(flr(p.x), 68 - p.h, flr(p.x) + 5, 70, cor.borda)
    line(flr(p.x) + 1, 68 - p.h, flr(p.x) + 4, 68 - p.h, cor.suave)
  end
  for _, c in ipairs(conchas) do
    circfill(flr(c.x) + 1, c.y + 1, 1, cor.destaque)
  end

  desenhar_sprite(surfista, 20, flr(y) - 6, { ["1"] = cor.texto, ["2"] = cor.destaque })

  print("PONTOS " .. pontos, 3, 3, cor.texto)
  local r = "RECORDE " .. recorde
  print(r, W - #r * 4 - 2, 3, cor.suave)

  if not vivo then
    rectfill(24, 30, W - 25, 50, cor.painel)
    rect(24, 30, W - 25, 50, cor.borda)
    print("CAIU!", (W - 20) // 2, 34, cor.destaque)
    print("ESPACO PARA VOLTAR", (W - 72) // 2, 42, cor.texto)
  end
end
