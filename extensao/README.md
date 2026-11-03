# Oceano Lite (extensão de Chrome)

A nova aba do Oceano dentro do Chrome: mar pixelizado, temas `.oceano` com editor,
mods em Lua e Teal e a barra lateral de widgets. Usa o mesmo código do simulador.

- Nenhuma conexão de rede e nenhuma telemetria.
- Uma única permissão: `search`, para buscar com o buscador padrão do Chrome.
- Temas, mods e notas ficam no armazenamento local da extensão.

## Montar

```bash
python3 build.py
```

Gera `oceano-lite/` (a pasta da extensão) e `oceano-lite-<versão>.zip` (para a Chrome Web Store).
Rode de novo sempre que mudar algo em `../simulador`.

## Instalar para testar

1. Abra `chrome://extensions`.
2. Ligue o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e escolha a pasta `oceano-lite/`.
4. Abra uma nova aba.

## O que fica de fora (só no navegador completo)

Abas e barra de endereço próprias, modo jogo, log de rede (`oceano://rede`) e bloqueador.
