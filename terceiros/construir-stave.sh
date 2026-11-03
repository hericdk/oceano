#!/bin/sh
# Compila o Stave (https://github.com/MrityunjayBhardwaj/Stave, AGPL-3.0) como site estático
# e copia para simulador/stave, onde o Oceano abre em oceano://strudel.
#
# A cópia em terceiros/stave é o repositório original com as nossas mudanças (veja `git diff`
# lá dentro e terceiros/stave-oceano.patch). Pela AGPL, essas mudanças são publicadas junto.
#
#   sh terceiros/construir-stave.sh
set -e
AQUI=$(cd "$(dirname "$0")" && pwd)
STAVE="$AQUI/stave"
APP="$STAVE/packages/app"
DESTINO="$AQUI/../simulador/stave"

# primeira vez: baixa o Stave na versão testada e aplica as mudanças do Oceano
VERSAO=c26ca5e796010afeda206993594a8e629869c4e8
if [ ! -d "$STAVE/.git" ]; then
  git clone https://github.com/MrityunjayBhardwaj/Stave.git "$STAVE"
  (cd "$STAVE" && git checkout -q "$VERSAO" && git apply "$AQUI/stave-oceano.patch")
fi

cd "$STAVE"
npx -y pnpm@9 install --ignore-scripts >/dev/null

# rotas que precisam de servidor (link curto de compartilhar, docs) ficam fora do build estático
GUARDA=$(mktemp -d)
for r in api docs s; do [ -d "$APP/src/app/$r" ] && mv "$APP/src/app/$r" "$GUARDA/$r"; done
devolver() { for r in api docs s; do [ -d "$GUARDA/$r" ] && mv "$GUARDA/$r" "$APP/src/app/$r"; done; rmdir "$GUARDA" 2>/dev/null || true; }
trap devolver EXIT

# o editor (@stave/editor) é usado já compilado (dist): compila de novo com as nossas mudanças
(cd "$STAVE" && npx -y pnpm@9 --filter @stave/editor build >/dev/null)

cd "$APP"
node scripts/copy-monaco.mjs
NEXT_TELEMETRY_DISABLED=1 STAVE_OCEANO=1 npx next build

rm -rf "$DESTINO"
cp -R "$APP/out" "$DESTINO"
cp "$STAVE/LICENSE" "$DESTINO/LICENSE"
(cd "$STAVE" && git diff -- . ':!packages/editor/dist' > "$AQUI/stave-oceano.patch")
echo "Stave pronto em $DESTINO ($(du -sh "$DESTINO" | cut -f1))"
