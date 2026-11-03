#!/usr/bin/env python3
"""Lista cartuchos de PICO-8 da BBS da Lexaloffle (a BBS não libera CORS, então o navegador pede por aqui).

Usado pelo serve.py nas rotas /pico8/bbs (listas e busca) e /pico8/capas/<arquivo>.png (miniaturas guardadas
nesta pasta). Rodando direto, gera o catálogo guardado e baixa as capas dele:
    python3 pico8/bbs.py            → pico8/catalogo.json + pico8/capas/*.png

A BBS limita pedidos seguidos (responde quase vazio): a geração vai devagar e o servidor guarda as respostas.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

BASE = "https://www.lexaloffle.com"
PASTA = os.path.dirname(os.path.abspath(__file__))
CAPAS = os.path.join(PASTA, "capas")
ORDENS = {"destaques": "featured", "novos": "ts", "favoritos": "rating"}
# ['165759', 148484, `Mole Mole`,"/bbs/thumbs/pico8_molemole-1.png",256,170.6,"2025-04-18 00:41:13",13953,"Adam Atomic",
#  "2026-11-01 04:30:19",0,"",93,25,0,7,2,'0',["tag",],...]   (93 = estrelas, 25 = respostas)
LINHA = re.compile(
    r"\['(\d+)',\s*(\d+),\s*`([^`]*)`,\s*\"([^\"]*)\",[^,]*,[^,]*,\"([^\"]*)\",\d+,\"([^\"]*)\",\"[^\"]*\",\d+,\"[^\"]*\",(\d+),\d+,(?:[^\[\]]*?)\[([^\]]*)\]")
CAPA_OK = re.compile(r"^pico8?_?[\w.-]{1,80}\.png$")

# estilos do Oceano a partir das tags (e do título) que os autores põem na BBS
ESTILOS = {
    "plataforma": "platformer platform metroidvania jump jumping speedrun puzzleplatformer always-moving",
    "puzzle": "puzzle sokoban picross nonogram merge suika minesweeper solitaire match3 logic",
    "acao": "action shmup shooter shoot-em-up bullet-hell bullethell stg danmaku fighting fighter beatemup beat-em-up boss-battle fps combat survivor hack-and-slash",
    "aventura": "adventure rpg exploration explore exploring narrative open-world dungeon crawler zelda story",
    "corrida": "racing kart race driving taxi circuit drift racer",
    "arcade": "arcade highscore endless score demake pinball breakout",
    "roguelike": "roguelike roguelite porklike procedural",
    "multiplayer": "multiplayer coop co-op versus 2-player 2p local-multiplayer pvp",
    "estrategia": "rts strategy tower-defense td city building turn-based tactics",
    "curtinhos": "ldjam ld48 ld55 gmtk gmtk-2021 jam 1k 1kjam tweetcart lunch-break mini-game minigame bwj 3cjam toyboxjam agbic",
}
NAO_JOGO = {"demoscene", "demo", "music", "audio", "synth", "tool", "advent", "bundle"}
# clássicos que entram nas sugestões mesmo fora dos destaques atuais (busca, estilos)
CLASSICOS = [("Celeste", ["plataforma", "curtinhos"]), ("celeste classic 2", ["plataforma"]), ("Porklike", ["roguelike"]),
             ("Dank Tomb", ["roguelike", "acao", "aventura"]), ("Just One Boss", ["acao", "arcade"]), ("POOM", ["acao"])]
CELESTE = "11722"   # Celeste (Maddy Thorson e Noel Berry): sempre o primeiro das sugestões

_cache = {}


def _ler(url, binario=False):
    req = urllib.request.Request(url, headers={"User-Agent": "Oceano/0.1 (navegador; player de PICO-8)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        dados = r.read()
    return dados if binario else dados.decode("utf-8", "replace")


def estilos(j):
    palavras = set(t.lower() for t in j.get("tags", [])) | set(re.findall(r"[a-z0-9-]+", j.get("titulo", "").lower()))
    return [e for e, chaves in ESTILOS.items() if palavras & set(chaves.split())]


def _jogo(m):
    post, _, titulo, capa, data, autor, estrelas, tags = m.groups()
    arquivo = capa.rsplit("/", 1)[-1]                         # pico8_molemole-1.png ou pico15133.png
    j = {"post": post, "titulo": titulo.strip(), "autor": autor, "data": data[:10], "estrelas": int(estrelas),
         "capa": arquivo, "tags": [t.strip().strip("\"'") for t in tags.split(",") if t.strip().strip("\"'")][:6]}
    j["estilos"] = estilos(j)
    return j


def listar(ordem="destaques", busca="", pagina=1):
    """Uma página da BBS (uns 30 cartuchos): [{post, titulo, autor, data, estrelas, capa, tags, estilos}]."""
    ordem = ordem if ordem in ORDENS else "destaques"
    busca = str(busca)[:60]
    pagina = max(1, min(50, int(pagina or 1)))
    chave = (ordem, busca, pagina)
    if chave in _cache and time.time() - _cache[chave][0] < 1800:
        return _cache[chave][1]
    q = {"cat": 7, "sub": 2, "mode": "carts", "orderby": ORDENS[ordem], "page": pagina}
    if busca:
        q["search"] = busca
    html = _ler(f"{BASE}/bbs/?{urllib.parse.urlencode(q)}")
    if len(html) < 2000:
        raise RuntimeError("a BBS pediu para esperar (limite de pedidos)")
    inicio = html.find("pdat=[")
    fim = html.find("];", inicio)
    jogos = [_jogo(m) for m in LINHA.finditer(html[inicio:fim] if inicio >= 0 else "")]
    _cache[chave] = (time.time(), jogos)
    return jogos


def capa(arquivo):
    """Caminho local da miniatura; baixa da BBS na primeira vez. None se o nome não for de uma capa."""
    if not CAPA_OK.match(arquivo):
        return None
    local = os.path.join(CAPAS, arquivo)
    if not os.path.exists(local):
        os.makedirs(CAPAS, exist_ok=True)
        dados = _ler(f"{BASE}/bbs/thumbs/{arquivo}", binario=True)
        if not dados.startswith(b"\x89PNG"):
            return None
        with open(local + ".tmp", "wb") as f:
            f.write(dados)
        os.replace(local + ".tmp", local)
    return local


if __name__ == "__main__":
    vistos, todos = {}, []
    def pedir(ordem, busca, p):
        for tentativa in range(8):          # a BBS limita pedidos seguidos: espera e tenta de novo
            try:
                return listar(ordem, busca, p)
            except RuntimeError:
                print(f"  esperando a BBS ({ordem} {busca} {p})…", file=sys.stderr); time.sleep(20 + tentativa * 10)
        return []
    def juntar(js, extra=None):
        for j in js:
            if extra:
                j["estilos"] = sorted(set(j["estilos"]) | set(extra))
            if j["post"] in vistos:
                if extra: vistos[j["post"]]["estilos"] = j["estilos"]
                continue
            vistos[j["post"]] = j; todos.append(j)
    for ordem, paginas in (("destaques", 4), ("favoritos", 4), ("novos", 2)):
        for p in range(1, paginas + 1):
            juntar(pedir(ordem, "", p)); time.sleep(4)
    for titulo, est in CLASSICOS:
        achados = [j for j in pedir("destaques", titulo, 1) if j["titulo"].lower().startswith(titulo.lower().split()[0].lower())]
        juntar(achados[:1], est); time.sleep(4)
    for j in todos:
        if set(t.lower() for t in j["tags"]) & NAO_JOGO:
            j["estilos"] = []
            j["naoJogo"] = True
    json.dump({"gerado": time.strftime("%Y-%m-%d"), "celeste": CELESTE, "estilos": list(ESTILOS), "jogos": todos},
              open(os.path.join(PASTA, "catalogo.json"), "w"), ensure_ascii=False, indent=1)
    falhas = 0
    for j in todos:
        try:
            if not capa(j["capa"]): falhas += 1
        except Exception:
            falhas += 1
        time.sleep(0.15)
    print(f"{len(todos)} cartuchos, {len(todos) - falhas} capas guardadas em {CAPAS}", file=sys.stderr)
