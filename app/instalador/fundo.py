#!/usr/bin/env python3
"""Desenha o fundo pixel da janela do instalador (.dmg): céu de dia, sol, nuvens,
mar em dither com as cores do tema Oceano, farol, um barquinho, a seta e o texto.

Gera fundo.png (640×400) e fundo@2x.png (1280×800) e junta os dois em fundo.tiff,
que o Finder usa no tamanho certo em tela normal e Retina.
"""
import math, os, struct, subprocess, sys, zlib

AQUI = os.path.dirname(os.path.abspath(__file__))
L, A = 320, 200            # grade em "pixels grandes" (cada um = 2 px na janela)

COR = {                    # paleta do tema Oceano (simulador/temas/oceano.json)
    "noite": (0x07, 0x0b, 0x1f), "fundo": (0x0e, 0x1a, 0x3d), "fundo2": (0x16, 0x30, 0x6b),
    "azul": (0x1f, 0x4f, 0x9e), "azul2": (0x2f, 0x7f, 0xd1), "ceu": (0x5b, 0xb6, 0xf0),
    "claro": (0xa6, 0xe3, 0xff), "espuma": (0xf4, 0xfb, 0xff), "areia": (0xf3, 0xd4, 0x9b),
    "areia2": (0xc9, 0x8f, 0x5a), "coral": (0xff, 0x6f, 0x59), "sol": (0xff, 0xd1, 0x66),
}

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

# fonte 3×5 dos mods (simulador/js/lua.js)
FONTE = {
    "A": "010101111101101", "C": "011100100100011", "D": "110101101101110", "E": "111100110100111",
    "G": "011100101101011", "I": "111010010010111", "L": "100100100100111", "M": "101111111101101",
    "N": "110101101101101", "O": "010101101101010", "P": "110101110100100", "R": "110101110101101",
    "S": "011100010001110", "T": "111010010010010", "U": "101101101101111", "V": "101101101010010",
    "-": "000000111000000", ".": "000000000000010", " ": "000000000000000",
    "0": "111101101101111", "1": "010110010010111",
}

tela = [[COR["espuma"]] * L for _ in range(A)]


def pix(x, y, c):
    if 0 <= x < L and 0 <= y < A:
        tela[y][x] = c


def mistura(x, y, c1, c2, t):
    """dither ordenado: t=0 → só c1, t=1 → só c2"""
    return c2 if (BAYER[y % 4][x % 4] + 0.5) / 16 < t else c1


def texto(s, x, y, c, escala=1):
    for ch in s:
        g = FONTE[ch]
        for i, b in enumerate(g):
            if b == "1":
                for dy in range(escala):
                    for dx in range(escala):
                        pix(x + (i % 3) * escala + dx, y + (i // 3) * escala + dy, c)
        x += 4 * escala


def largura(s, escala=1):
    return len(s) * 4 * escala - escala


HORIZONTE = 140

def onda(x):
    return HORIZONTE + round(math.sin(x / 9) * 1.2 + math.sin(x / 23 + 1) * 0.8)


def desenhar():
    # céu: branco no alto, azul claro perto do horizonte
    for y in range(HORIZONTE + 3):
        t = y / HORIZONTE
        for x in range(L):
            tela[y][x] = mistura(x, y, COR["espuma"], COR["claro"], min(1, t * 1.1))

    # sol
    sx, sy, r = 272, 34, 13
    for y in range(sy - r - 4, sy + r + 5):
        for x in range(sx - r - 4, sx + r + 5):
            d = math.hypot(x - sx, y - sy)
            if d <= r:
                pix(x, y, COR["sol"])
            elif d <= r + 3 and BAYER[y % 4][x % 4] < (r + 3 - d) * 5:
                pix(x, y, COR["sol"])

    # nuvens (pílulas brancas com sombra embaixo)
    for cx, cy, w in ((48, 44, 34), (150, 30, 26), (220, 56, 22)):
        for y in range(cy - 5, cy + 6):
            for x in range(cx - w // 2 - 6, cx + w // 2 + 7):
                dx = max(0, abs(x - cx) - w // 2)
                if math.hypot(dx, (y - cy) * 1.3) <= 6:
                    pix(x, y, COR["claro"] if y >= cy + 3 else COR["espuma"])

    # mar: faixas que escurecem até o fundo, com dither entre elas
    tons = [COR["ceu"], COR["azul2"], COR["azul"], COR["fundo2"], COR["fundo"]]
    for x in range(L):
        topo = onda(x)
        for y in range(topo, A):
            t = (y - topo) / (A - topo) * (len(tons) - 1)
            i = min(int(t), len(tons) - 2)
            tela[y][x] = mistura(x, y, tons[i], tons[i + 1], t - i)
        pix(x, topo, COR["espuma"])
        if (x * 7 + topo) % 11 == 0:
            pix(x, topo + 1, COR["espuma"])
    # espuma solta e brilho do sol na água
    for k in range(70):
        x, y = (k * 97) % L, HORIZONTE + 6 + (k * 53) % 40
        pix(x, y, COR["claro"]); pix(x + 1, y, COR["claro"])
    for y in range(HORIZONTE + 3, HORIZONTE + 30, 3):
        meia = 10 - (y - HORIZONTE) // 4
        for x in range(sx - meia, sx + meia, 2):
            if (x + y) % 4 == 0:
                pix(x, y, COR["sol"])

    # ilha e farol (à direita)
    ix, iy = 296, HORIZONTE + 1
    for y in range(iy - 4, iy + 3):
        for x in range(ix - 20, ix + 21):
            if (x - ix) ** 2 / 400 + (y - iy - 2) ** 2 / 30 <= 1:
                pix(x, y, COR["areia2"] if y >= iy else COR["areia"])
    for y in range(iy - 30, iy - 3):
        meia = 2 + (y - (iy - 30)) // 12
        faixa = ((y - (iy - 30)) // 5) % 2
        for x in range(ix - meia, ix + meia + 1):
            pix(x, y, COR["coral"] if faixa else COR["espuma"])
    for x in range(ix - 3, ix + 4):
        pix(x, iy - 31, COR["fundo"])
    for y in range(iy - 36, iy - 31):
        for x in range(ix - 2, ix + 3):
            pix(x, y, COR["sol"] if abs(x - ix) < 2 else COR["fundo"])
    for x in range(ix - 3, ix + 4):
        pix(x, iy - 37, COR["fundo"])

    # barquinho com pescador (à esquerda)
    bx, by = 26, HORIZONTE + 6
    for x in range(bx, bx + 14):
        pix(x, by, COR["coral"])
    for x in range(bx + 1, bx + 13):
        pix(x, by + 1, COR["areia2"])
    for y in range(by - 4, by):
        pix(bx + 5, y, COR["fundo"])
    pix(bx + 5, by - 5, COR["fundo"])
    for i in range(6):
        pix(bx + 6 + i, by - 5 - i // 2, COR["fundo"])
    for y in range(by - 7, by + 6):
        pix(bx + 12, y, COR["fundo2"])

    # seta tracejada do app para Aplicativos (ícones em x=80 e x=240, y=85 na grade)
    ay = 85
    for x in range(124, 192):
        if (x // 4) % 2 == 0:
            for dy in (-1, 0, 1):
                pix(x, ay + dy, COR["fundo2"])
    for i in range(9):
        for dy in (-1, 0, 1):
            pix(192 + i, ay - 8 + i + dy, COR["fundo2"])
            pix(192 + i, ay + 8 - i + dy, COR["fundo2"])

    # textos
    titulo = "ARRASTE O OCEANO PARA APLICATIVOS"
    texto(titulo, (L - largura(titulo, 2)) // 2, 10, COR["fundo"], 2)
    rodape = "MODS EM LUA - A LINGUAGEM CRIADA NA PUC-RIO"
    texto(rodape, (L - largura(rodape)) // 2, A - 12, COR["claro"])


def png(caminho, escala):
    w, h = L * escala, A * escala
    linhas = []
    for y in range(h):
        linha = bytearray([0])
        for x in range(w):
            linha += bytes(tela[y // escala][x // escala])
        linhas.append(bytes(linha))
    def bloco(tipo, dados):
        return struct.pack(">I", len(dados)) + tipo + dados + struct.pack(">I", zlib.crc32(tipo + dados) & 0xFFFFFFFF)
    with open(caminho, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + bloco(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + bloco(b"IDAT", zlib.compress(b"".join(linhas), 9)) + bloco(b"IEND", b""))


def main(saida=AQUI):
    desenhar()
    um, dois = os.path.join(saida, "fundo.png"), os.path.join(saida, "fundo@2x.png")
    png(um, 2)
    png(dois, 4)
    tiff = os.path.join(saida, "fundo.tiff")
    subprocess.run(["tiffutil", "-cathidpicheck", um, dois, "-out", tiff], check=True, capture_output=True)
    return tiff


if __name__ == "__main__":
    print(main(sys.argv[1] if len(sys.argv) > 1 else AQUI))
