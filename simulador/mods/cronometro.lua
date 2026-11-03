-- Cronômetro de Speedrun · widget da barra lateral
-- Clique em INICIAR/PARCIAL (ou espaço com o widget em foco) e em PARA/ZERA (ou X).
-- O melhor tempo fica guardado neste computador.

largura, altura = 72, 60

local inicio, parado, rodando = 0, 0, false
local parciais = {}
local recorde

local function decorrido()
  if rodando then return t() - inicio end
  return parado
end

local function formatar(s)
  local m = flr(s / 60)
  return string.format("%02d:%05.2f", m, s - m * 60)
end

function _init()
  recorde = ler("recorde")
end

local function marcar()
  if not rodando then
    inicio = t() - parado
    rodando = true
    sfx("clique")
  else
    table.insert(parciais, 1, decorrido())
    if #parciais > 3 then table.remove(parciais) end
    sfx("moeda")
  end
end

local function parar_ou_zerar()
  if rodando then
    rodando = false
    parado = decorrido()
    if not recorde or parado < recorde then
      recorde = parado
      guardar("recorde", recorde)
      sfx("powerup")
    end
  else
    parado, parciais = 0, {}
  end
end

function _update()
  local mx, _, dentro = mouse()
  if btnp(4) then
    if dentro and mx >= 46 then parar_ou_zerar() else marcar() end
  end
  if btnp(5) then parar_ou_zerar() end
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  print("SPEEDRUN", 2, 2, cor.suave)
  print(formatar(decorrido()), 4, 9, rodando and cor.texto or cor.acento, 2)

  for i, p in ipairs(parciais) do
    print(i .. " " .. formatar(p), 2, 16 + i * 6, cor.suave)
  end
  if recorde then print("MELHOR " .. formatar(recorde), 2, 41, cor.destaque) end

  rectfill(2, 48, 44, 57, cor.acento)
  print(rodando and "PARCIAL" or "INICIAR", 9, 51, cor.fundo)
  rectfill(46, 48, 69, 57, cor.elevado)
  print(rodando and "PARA" or "ZERA", 50, 51, cor.texto)
end
