#!/usr/bin/env python3
"""Cria o Oceano.app (Finder, Launchpad e Spotlight) que abre este MVP.

O app é uma cópia do Electron que já está em node_modules (clonada no APFS,
quase não ocupa espaço) com nome e ícone do Oceano. Ele não guarda o código:
só aponta para esta pasta, então toda mudança no projeto já vale ao abrir.

Uso:  python3 criar-atalho.py            → /Applications/Oceano.app
      python3 criar-atalho.py ~/Applications
Rode de novo depois de atualizar o Electron.
"""
import importlib.util, json, os, plistlib, shutil, subprocess, sys, tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))
ELECTRON = os.path.join(AQUI, "node_modules", "electron", "dist", "Electron.app")
DESTINO = os.path.join(os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else "/Applications", "Oceano.app")

# o ícone pixel é o mesmo da extensão (extensao/build.py)
_spec = importlib.util.spec_from_file_location("build_lite", os.path.join(AQUI, "..", "extensao", "build.py"))
build_lite = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_lite)


def icns(saida):
    with tempfile.TemporaryDirectory() as tmp:
        pasta = os.path.join(tmp, "Oceano.iconset")
        os.makedirs(pasta)
        for t in (16, 32, 128, 256, 512):
            for mult, sufixo in ((1, ""), (2, "@2x")):
                with open(os.path.join(pasta, f"icon_{t}x{t}{sufixo}.png"), "wb") as f:
                    f.write(build_lite.png(t * mult))
        subprocess.run(["iconutil", "-c", "icns", pasta, "-o", saida], check=True)


def main():
    if not os.path.isdir(ELECTRON):
        sys.exit("Electron não encontrado: rode 'npm install' em oceano/app primeiro.")
    if os.path.exists(DESTINO):
        shutil.rmtree(DESTINO)
    # -c = clone APFS (cópia instantânea, sem duplicar os ~290 MB)
    subprocess.run(["cp", "-Rc", ELECTRON, DESTINO], check=True)

    conteudo = os.path.join(DESTINO, "Contents")
    info_path = os.path.join(conteudo, "Info.plist")
    with open(info_path, "rb") as f:
        info = plistlib.load(f)
    info.update({
        "CFBundleName": "Oceano",
        "CFBundleDisplayName": "Oceano",
        "CFBundleIdentifier": "gg.oceano.mvp",
        "CFBundleIconFile": "oceano.icns",
        "LSApplicationCategoryType": "public.app-category.productivity",
    })
    with open(info_path, "wb") as f:
        plistlib.dump(info, f)

    recursos = os.path.join(conteudo, "Resources")
    os.remove(os.path.join(recursos, "electron.icns"))
    icns(os.path.join(recursos, "oceano.icns"))

    # Resources/app: o Electron abre isto em vez da tela padrão dele.
    # Mesmo "name" do package.json do projeto = mesma pasta de dados (abas, listas do bloqueador).
    app_dir = os.path.join(recursos, "app")
    os.makedirs(app_dir)
    with open(os.path.join(app_dir, "package.json"), "w") as f:
        json.dump({"name": "oceano-app", "main": "index.js"}, f)
    with open(os.path.join(app_dir, "index.js"), "w") as f:
        f.write(f"require({json.dumps(os.path.join(AQUI, 'main.js'))});\n")

    # o Info.plist mudou, então a assinatura local precisa ser refeita (exigido no Apple Silicon)
    subprocess.run(["codesign", "--force", "--deep", "--sign", "-", DESTINO], check=True, capture_output=True)
    # avisa o Finder/Spotlight que o app existe
    subprocess.run(["touch", DESTINO])
    subprocess.run(["/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", "-f", DESTINO])
    subprocess.run(["mdimport", DESTINO], capture_output=True)
    print(f"pronto: {DESTINO}")


if __name__ == "__main__":
    main()
