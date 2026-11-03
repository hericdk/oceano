-- Relógio de Maré · widget da nova aba
-- Mostra a hora e uma maré que sobe e desce num ciclo de ~12h25.

largura, altura = 72, 36

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)

  local h = oceano.hora()
  local txt = string.format("%02d:%02d", h.hora, h.min)
  print(txt, (W - #txt * 8) // 2 + 1, 4, cor.texto, 2)

  -- maré: seno de um ciclo de 745 minutos
  local fase = (h.hora * 60 + h.min) / 745 * math.pi * 2
  local nivel = math.sin(fase)
  local rotulo = nivel > 0 and "MARE ALTA" or "MARE BAIXA"
  print(rotulo, (W - #rotulo * 4) // 2 + 1, 16, cor.suave)

  for x = 1, W - 2 do
    local y = flr(28 + math.sin(x / 5 + t() * 2) * 1.5 - nivel * 3)
    line(x, y, x, H - 2, cor.acento)
    pset(x, y, cor.texto)
  end
end
