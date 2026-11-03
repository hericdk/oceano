#!/usr/bin/env python3
"""Gera o instalador do Oceano para Mac: dist/Oceano-<versão>.dmg.

Ao abrir o .dmg aparece a janela pixel com o Oceano.app, uma seta e o atalho
para Aplicativos; é só arrastar. Diferente do criar-atalho.py, este app leva
uma cópia do código dentro dele (simulador, mods, temas, docs), então funciona
em qualquer Mac, sem esta pasta.

Uso:  python3 app/instalador/empacotar.py            → app + .dmg
      python3 app/instalador/empacotar.py --sem-dmg  → só dist/Oceano.app
Na primeira vez instala o dmgbuild num ambiente isolado (app/instalador/.venv).
"""
import importlib.util, json, os, plistlib, shutil, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(AQUI)
RAIZ = os.path.dirname(APP)
DIST = os.path.join(APP, "dist")
ELECTRON = os.path.join(APP, "node_modules", "electron", "dist", "Electron.app")
VENV = os.path.join(AQUI, ".venv")

# só o que roda: o Electron já vem no próprio .app, ferramentas de dev ficam de fora
FORA_NODE = {"electron", "@electron", "@electron-internal", "@types", "undici-types"}
# (o serve.py da raiz é só do simulador; o de sampler/motor é o motor do ½ sampler e vai junto)
def FORA_SIM(pasta, nomes):
    fora = {"node_modules", "package.json", "package-lock.json", ".DS_Store", "__pycache__"}
    if os.path.samefile(pasta, os.path.join(RAIZ, "simulador")):
        fora.add("serve.py")
    # ferramenta de quem mantém o sampler, não do app
    if os.path.samefile(pasta, os.path.join(RAIZ, "simulador", "sampler")):
        fora.add("atualizar.py")
    # os vídeos antigos do mar: nenhuma tela usa mais, o fundo agora é desenhado na hora
    if os.path.samefile(pasta, os.path.join(RAIZ, "simulador", "fundos")):
        fora.update(n for n in nomes if n.endswith(".mp4"))
    return [n for n in nomes if n in fora]


def carregar(nome, arquivo):
    spec = importlib.util.spec_from_file_location(nome, arquivo)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def montar_app(versao):
    destino = os.path.join(DIST, "Oceano.app")
    if os.path.exists(destino):
        shutil.rmtree(destino)
    subprocess.run(["cp", "-Rc", ELECTRON, destino], check=True)    # clone APFS: instantâneo

    conteudo = os.path.join(destino, "Contents")
    info_path = os.path.join(conteudo, "Info.plist")
    with open(info_path, "rb") as f:
        info = plistlib.load(f)
    info.update({
        "CFBundleName": "Oceano", "CFBundleDisplayName": "Oceano",
        "CFBundleIdentifier": "gg.oceano.mvp", "CFBundleIconFile": "oceano.icns",
        "CFBundleShortVersionString": versao, "CFBundleVersion": versao,
        "LSApplicationCategoryType": "public.app-category.productivity",
        "NSHumanReadableCopyright": "Oceano · mods em Lua, a linguagem criada na PUC-Rio",
    })
    with open(info_path, "wb") as f:
        plistlib.dump(info, f)

    recursos = os.path.join(conteudo, "Resources")
    os.remove(os.path.join(recursos, "electron.icns"))
    carregar("criar_atalho", os.path.join(APP, "criar-atalho.py")).icns(os.path.join(recursos, "oceano.icns"))

    # Resources/app = o processo principal; main.js acha ../simulador e ../docs ao lado
    subprocess.run(["node", os.path.join(APP, "verificar-sem-chaves.js")], check=True)   # o guarda: sem ele, não há instalador
    codigo = os.path.join(recursos, "app")
    os.makedirs(codigo)
    # todos os .js desta pasta rodam no processo principal: módulo novo já entra sem mexer aqui
    for arq in os.listdir(APP):
        if arq.endswith(".js") and arq not in ("bau.js", "verificar-sem-chaves.js"):   # o baú desligado não vai junto
            shutil.copy2(os.path.join(APP, arq), codigo)
    shutil.copytree(os.path.join(APP, "ui"), os.path.join(codigo, "ui"))
    with open(os.path.join(codigo, "package.json"), "w") as f:
        json.dump({"name": "oceano-app", "version": versao, "main": "main.js"}, f)
    origem_nm = os.path.join(APP, "node_modules")
    for nome in os.listdir(origem_nm):
        if nome not in FORA_NODE and not nome.startswith("."):
            shutil.copytree(os.path.join(origem_nm, nome), os.path.join(codigo, "node_modules", nome))
    # a voz neural só precisa da biblioteca deste Mac: as outras plataformas e a cópia repetida não são usadas
    binarios = os.path.join(codigo, "node_modules", "onnxruntime-node", "bin", "napi-v6")
    for plataforma in ("linux", "win32"):
        shutil.rmtree(os.path.join(binarios, plataforma), ignore_errors=True)
    copia = os.path.join(binarios, "darwin", os.uname().machine, "libonnxruntime.1.31.1.dylib")
    if os.path.exists(copia):
        os.remove(copia)
    shutil.copytree(os.path.join(RAIZ, "simulador"), os.path.join(recursos, "simulador"), ignore=FORA_SIM)
    shutil.copytree(os.path.join(RAIZ, "docs"), os.path.join(recursos, "docs"))
    # MicromediaFlash (oceano://micromediaflash): o editor de animação vai junto, sem as referências e ferramentas de autor
    mmf = os.path.join(os.path.dirname(RAIZ), "micromediaflash")
    if os.path.isfile(os.path.join(mmf, "index.html")):
        comuns = shutil.ignore_patterns("referencias", "tools", "video", ".git", "node_modules", "*.py", ".DS_Store")
        # as pastas _ de autor ficam só na raiz; arquivos _ lá dentro (css/themes/_common.css) fazem parte do editor
        def fora_mmf(pasta, nomes):
            raiz_mmf = os.path.samefile(pasta, mmf)
            return set(comuns(pasta, nomes)) | ({n for n in nomes if n.startswith("_")} if raiz_mmf else set())
        shutil.copytree(mmf, os.path.join(recursos, "micromediaflash"), ignore=fora_mmf)

    # assinatura local (sem conta de desenvolvedor Apple); exigida no Apple Silicon
    subprocess.run(["codesign", "--force", "--deep", "--sign", "-", destino], check=True, capture_output=True)
    return destino


def dmgbuild():
    python = os.path.join(VENV, "bin", "python3")
    if not os.path.exists(python):
        print("instalando o dmgbuild (só na primeira vez)…")
        subprocess.run([sys.executable, "-m", "venv", VENV], check=True)
        subprocess.run([python, "-m", "pip", "install", "-q", "dmgbuild>=1.6,<2"], check=True)
    return python


def montar_dmg(app, versao):
    fundo = carregar("fundo", os.path.join(AQUI, "fundo.py")).main(DIST)
    saida = os.path.join(DIST, f"Oceano-{versao}.dmg")
    if os.path.exists(saida):
        os.remove(saida)
    ajustes = {
        "files": [app],
        "symlinks": {"Aplicativos": "/Applications"},
        "icon": os.path.join(app, "Contents", "Resources", "oceano.icns"),
        "background": fundo,
        "window_rect": ((200, 120), (640, 400)),
        "icon_size": 128, "text_size": 13,
        "icon_locations": {"Oceano.app": (160, 170), "Aplicativos": (480, 170)},
        "show_status_bar": False, "show_tab_view": False, "show_toolbar": False,
        "show_pathbar": False, "show_sidebar": False,
        "format": "ULFO",          # compressão lzfse (macOS 10.11+)
    }
    script = ("import dmgbuild, json, sys\n"
              "a = json.loads(sys.argv[3])\n"
              "a['window_rect'] = tuple(map(tuple, a['window_rect']))\n"
              "a['icon_locations'] = {k: tuple(v) for k, v in a['icon_locations'].items()}\n"
              "dmgbuild.build_dmg(sys.argv[1], sys.argv[2], settings=a)\n")
    subprocess.run([dmgbuild(), "-c", script, saida, "Oceano", json.dumps(ajustes)], check=True)
    for extra in ("fundo.png", "fundo@2x.png", "fundo.tiff"):
        os.remove(os.path.join(DIST, extra))
    return saida


def main():
    if not os.path.isdir(ELECTRON):
        sys.exit("Electron não encontrado: rode 'npm install' em oceano/app primeiro.")
    with open(os.path.join(APP, "package.json")) as f:
        versao = json.load(f)["version"]
    os.makedirs(DIST, exist_ok=True)
    app = montar_app(versao)
    tamanho = subprocess.run(["du", "-sh", app], capture_output=True, text=True).stdout.split()[0]
    print(f"app: {app} ({tamanho})")
    if "--sem-dmg" not in sys.argv:
        dmg = montar_dmg(app, versao)
        print(f"instalador: {dmg} ({os.path.getsize(dmg) / 1e6:.0f} MB)")


if __name__ == "__main__":
    main()
