-- Sons do Mar · automação de sons
-- Sons chiptune gerados por código: o mod descreve o som, sem arquivo de áudio.

oceano.on("clique", function() sfx("clique") end)
oceano.on("aba_aberta", function() sfx("bolha") end)
oceano.on("aba_fechada", function() sfx("fechar") end)
oceano.on("modo_jogo", function(ligado)
  sfx(ligado and "powerup" or "desligar")
end)

-- um som próprio, descrito numa tabela
oceano.on("navegar", function()
  sfx({ onda = "triangulo", de = 520, ate = 880, dur = 0.08, vol = 0.25 })
end)
