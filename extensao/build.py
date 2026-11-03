#!/usr/bin/env python3
"""Monta a extensão Oceano Lite em extensao/oceano-lite/ e gera o .zip.

O código é o mesmo do simulador (../simulador): este script só copia os arquivos,
acrescenta o manifesto, a página da nova aba e os ícones.
"""
import json, os, shutil, struct, zlib, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
SIM = os.path.join(os.path.dirname(AQUI), "simulador")
SAIDA = os.path.join(AQUI, "oceano-lite")

COPIAR = [
    "css/oceano.css",
    "js/main.js", "js/paginas.js", "js/mar.js", "js/lua.js", "js/temas.js", "js/sfx.js", "js/icones.js",
    "vendor/three.module.min.js", "vendor/wasmoon.js", "vendor/glue.wasm", "vendor/tl.lua", "vendor/tl.LICENSE",
]
PASTAS = ["mods", "temas", "vendor/fonts"]

# o mesmo ícone "oceano" de js/icones.js
ICONE = ["..###..", ".#...#.", "#.....#", "#.##..#", "##..###", ".#####.", "..###.."]
FUNDO, TINTA = (0x0E, 0x1A, 0x3D), (0x5B, 0xB6, 0xF0)


def png(tamanho):
    escala = max(1, tamanho // 9)
    if tamanho // escala < 9:
        escala = tamanho // 7
    margem = (tamanho - 7 * escala) // 2
    canto = max(1, tamanho // 16)          # cantos "mordidos" de pixel art
    linhas = []
    for y in range(tamanho):
        linha = bytearray([0])
        for x in range(tamanho):
            fora = (x < canto or x >= tamanho - canto) and (y < canto or y >= tamanho - canto)
            gx, gy = (x - margem) // escala, (y - margem) // escala
            tinta = 0 <= gx < 7 and 0 <= gy < 7 and x >= margem and y >= margem and ICONE[gy][gx] == "#"
            r, g, b = TINTA if tinta else FUNDO
            linha += bytes([r, g, b, 0 if fora else 255])
        linhas.append(bytes(linha))
    def bloco(tipo, dados):
        return struct.pack(">I", len(dados)) + tipo + dados + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n"
            + bloco(b"IHDR", struct.pack(">IIBBBBB", tamanho, tamanho, 8, 6, 0, 0, 0))
            + bloco(b"IDAT", zlib.compress(b"".join(linhas), 9))
            + bloco(b"IEND", b""))


def main():
    if os.path.exists(SAIDA):
        shutil.rmtree(SAIDA)
    os.makedirs(SAIDA)
    for rel in COPIAR:
        os.makedirs(os.path.dirname(os.path.join(SAIDA, rel)), exist_ok=True)
        shutil.copy2(os.path.join(SIM, rel), os.path.join(SAIDA, rel))
    for pasta in PASTAS:
        shutil.copytree(os.path.join(SIM, pasta), os.path.join(SAIDA, pasta))
    shutil.copy2(os.path.join(AQUI, "src", "manifest.json"), SAIDA)
    shutil.copy2(os.path.join(AQUI, "src", "novaaba.html"), SAIDA)
    shutil.copy2(os.path.join(AQUI, "src", "lite.css"), os.path.join(SAIDA, "css", "lite.css"))
    os.makedirs(os.path.join(SAIDA, "icones"))
    for t in (16, 32, 48, 128):
        with open(os.path.join(SAIDA, "icones", f"{t}.png"), "wb") as f:
            f.write(png(t))

    versao = json.load(open(os.path.join(AQUI, "src", "manifest.json")))["version"]
    zip_path = os.path.join(AQUI, f"oceano-lite-{versao}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for raiz, _, arquivos in os.walk(SAIDA):
            for a in sorted(arquivos):
                caminho = os.path.join(raiz, a)
                z.write(caminho, os.path.relpath(caminho, SAIDA))
    total = sum(os.path.getsize(os.path.join(r, a)) for r, _, fs in os.walk(SAIDA) for a in fs)
    print(f"oceano-lite/ pronto ({total / 1024:.0f} KB) · {os.path.basename(zip_path)} ({os.path.getsize(zip_path) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
