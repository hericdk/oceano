#!/usr/bin/env python3
"""Servidor local do Simulador do Oceano (sem cache, .wasm com o tipo certo)."""
import http.server, json, os, subprocess, sys, urllib.parse, urllib.request, atexit

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(os.path.dirname(ROOT), "docs")   # /docs/ serve a pasta docs do repositório
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5216
sys.path.insert(0, os.path.join(ROOT, "pico8"))
import bbs   # /pico8/bbs?ordem=destaques&busca=&pagina=1 → cartuchos da BBS da Lexaloffle em JSON

# Editor de avatar (oceano://avatar): roda num servidor próprio (ele lê e grava os projetos no disco).
# O Oceano liga ele sozinho na primeira vez que alguém abre o editor e desliga junto ao sair.
ESTUDIO_PASTA = os.path.join(os.path.dirname(ROOT), "terceiros", "mesh-avatar-studio")
ESTUDIO_URL = "http://127.0.0.1:5224/"
estudio = None


def estudio_no_ar():
    try:
        urllib.request.urlopen(ESTUDIO_URL, timeout=1)
        return True
    except Exception:
        return False


def ligar_estudio():
    global estudio
    if estudio_no_ar():
        return "ligado"
    if not os.path.isdir(os.path.join(ESTUDIO_PASTA, "node_modules")):
        return "nao-instalado"
    if estudio is None or estudio.poll() is not None:
        estudio = subprocess.Popen(["npx", "vite", "--host", "127.0.0.1", "--port", "5224", "--strictPort"], cwd=ESTUDIO_PASTA,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return "ligando"


atexit.register(lambda: estudio and estudio.poll() is None and estudio.terminate())


# Pedido de avatar novo (oceano://avatar → "criar a partir das imagens"): guarda o rosto em close, a folha de ângulos
# e o pixel art opcional num projeto do editor; os pontos (olhos, boca, cabelo) são postos seguindo docs/agent-guide.md
def guardar_pedido(dados):
    import base64, re, datetime
    nome = str(dados.get("nome", "")).strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,39}", nome):
        raise ValueError("nome inválido (use letras, números, - e _)")
    pasta = os.path.join(ESTUDIO_PASTA, "projects", nome, "entrada")
    os.makedirs(pasta, exist_ok=True)
    salvos = []
    for campo in ("rosto", "angulos", "pixel"):
        v = dados.get(campo)
        if not v:
            continue
        m = re.match(r"data:image/(png|jpeg|webp);base64,(.+)$", v, re.S)
        if not m:
            raise ValueError(campo + ": imagem inválida")
        ext = {"jpeg": "jpg"}.get(m.group(1), m.group(1))
        with open(os.path.join(pasta, f"{campo}.{ext}"), "wb") as f:
            f.write(base64.b64decode(m.group(2)))
        salvos.append(f"{campo}.{ext}")
    if "rosto" not in "".join(salvos):
        raise ValueError("falta o rosto em close")
    with open(os.path.join(pasta, "PEDIDO.md"), "w") as f:
        f.write(f"# Pedido de avatar: {nome}\n\nRecebido em {datetime.datetime.now():%Y-%m-%d %H:%M}.\n\n"
                "- rosto: de frente, do peito para cima (vira o avatar animado pelos pontos)\n"
                "- angulos: folha com frente, lado e costas (vistas e 3D low-poly)\n"
                "- pixel: versão em pixel art desenhada à mão (visual \"Pixel desenhado\")\n\n"
                "Próximo passo: seguir docs/agent-guide.md com entrada/rosto como source.png (sem variantes geradas).\n")
    return {"pasta": f"projects/{nome}/entrada", "arquivos": salvos}


class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".wasm": "application/wasm", ".js": "text/javascript", ".mjs": "text/javascript", ".webmanifest": "application/manifest+json", ".lua": "text/plain; charset=utf-8", ".tl": "text/plain; charset=utf-8"}

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def translate_path(self, path):
        # /micromediaflash/ serve o editor de animação (projeto irmão em ../../micromediaflash)
        if path.startswith("/micromediaflash/"):
            base = os.path.join(os.path.dirname(os.path.dirname(ROOT)), "micromediaflash")
            alvo = os.path.normpath(os.path.join(base, path[len("/micromediaflash/"):].split("?")[0] or "index.html"))
            if alvo.startswith(base):
                return alvo
        if path.startswith("/docs/"):
            alvo = os.path.normpath(os.path.join(DOCS, path[len("/docs/"):].split("?")[0]))
            if alvo.startswith(DOCS):
                return alvo
        return super().translate_path(path)

    def do_GET(self):
        if self.path.startswith("/__estudio/ligar"):
            dados = json.dumps({"estado": ligar_estudio()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)
            return
        if self.path.startswith("/pico8/bbs"):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            try:
                corpo, cod = json.dumps({"jogos": bbs.listar(q.get("ordem", [""])[0], q.get("busca", [""])[0], q.get("pagina", ["1"])[0])}, ensure_ascii=False), 200
            except Exception as e:
                corpo, cod = json.dumps({"erro": str(e)[:200]}), 502
            dados = corpo.encode()
            self.send_response(cod)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)
            return
        if self.path.startswith("/pico8/capas/"):
            # miniatura que ainda não está guardada: baixa da BBS uma vez e fica na pasta
            try:
                bbs.capa(urllib.parse.unquote(self.path.split("?")[0].rsplit("/", 1)[-1]))
            except Exception:
                pass
        super().do_GET()

    def do_POST(self):
        if not self.path.startswith("/__avatar/pedido"):
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n > 40 * 1024 * 1024:
                raise ValueError("imagens grandes demais (até 40 MB juntas)")
            corpo, cod = json.dumps(guardar_pedido(json.loads(self.rfile.read(n)))), 200
        except Exception as e:
            corpo, cod = json.dumps({"erro": str(e)[:200]}), 400
        dados = corpo.encode()
        self.send_response(cod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


http.server.ThreadingHTTPServer(("localhost", PORT), H).serve_forever()
