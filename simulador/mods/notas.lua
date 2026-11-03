-- Notas · widget da barra lateral
-- Clique no quadro e digite. O texto fica guardado neste computador.

largura, altura = 72, 64

local COLUNAS, LINHAS, LIMITE = 17, 8, 240
local texto = ""

function _init()
  texto = ler("texto") or ""
end

function _update()
  local mudou = false
  local k = tecla()
  while k do
    if k == "\b" then
      -- apaga um caractere inteiro (letras acentuadas ocupam mais de um byte)
      local ultimo = utf8.offset(texto, -1)
      if ultimo then texto = texto:sub(1, ultimo - 1) end
    elseif utf8.len(texto) < LIMITE then
      texto = texto .. k
    end
    mudou = true
    k = tecla()
  end
  if mudou then guardar("texto", texto) end
end

local function quebrar(s)
  local linhas, atual = {}, ""
  for _, codigo in utf8.codes(s) do
    local ch = utf8.char(codigo)
    if ch == "\n" then
      table.insert(linhas, atual)
      atual = ""
    else
      atual = atual .. ch
      if utf8.len(atual) >= COLUNAS then
        table.insert(linhas, atual)
        atual = ""
      end
    end
  end
  table.insert(linhas, atual)
  return linhas
end

function _draw()
  cls(cor.painel)
  rect(0, 0, W - 1, H - 1, cor.borda)
  print("NOTAS", 2, 2, cor.suave)
  line(1, 8, W - 2, 8, cor.borda)

  if texto == "" then
    print("CLIQUE E", 2, 12, cor.suave)
    print("DIGITE", 2, 18, cor.suave)
    return
  end

  local linhas = quebrar(texto)
  local primeira = math.max(1, #linhas - LINHAS + 1)
  for i = primeira, #linhas do
    print(linhas[i], 2, 11 + (i - primeira) * 6, cor.texto)
  end
  if flr(t() * 2) % 2 == 0 then
    local cx = 2 + utf8.len(linhas[#linhas]) * 4
    local cy = 11 + (#linhas - primeira) * 6
    rectfill(cx, cy, cx + 2, cy + 4, cor.acento)
  end
end
