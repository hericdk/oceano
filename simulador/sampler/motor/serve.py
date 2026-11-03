#!/usr/bin/env python3
"""½ sampler: the local server (no cache). http://localhost:5217/  (its own project, apart from No Man Sky FM since 2026-10-30)
From a YouTube / Instagram link, on this machine only (127.0.0.1):
GET  /__yt/info?url=...            -> {id, title, duration, thumb}   (yt-dlp, nothing downloaded)
GET  /__yt/clip?url=&start=&end=   -> audio/wav of that stretch (the audio downloaded once, kept in .cache/yt)
GET  /__yt/peaks?url=&n=           -> {peaks: [0..1 × n], duration}: the video's sound drawn small, before choosing a stretch
GET  /__yt/media?url=               -> video/mp4 with its sound (Instagram: the page's player), Range for seeking
GET  /__yt/vclip?url=&start=&end= -> video/mp4 of that stretch, small and silent (the tracks' background)
POST /__stems {url, start, end}    -> {job}: the stretch split by Demucs (drums, bass, vocals, other)
GET  /__sons                      -> {items: [{path, name, cat}]}: the sound library, the files under sons/ (a folder = a category / kit)
GET  /__sons/wav?path=             -> that file as WAV (for what the browser can't read, as AIFF)
POST /__stems/wav  (audio/wav body)  -> {job}: a pad's sound sent from the page, split the same way
POST ?m= / {model}: htdemucs (quick), htdemucs_ft (better, slower), htdemucs_6s (+ guitar, piano)
GET  /__stems/<job>                -> {state, pct, stems: {drums: url, ...}}; the WAVs under /.cache/stems/<job>/
The copies online (sampler.half.social) use this server as their local engine: CORS for those only."""
import json, re, shutil, subprocess, sys, threading, time, uuid
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import os
ROOT = Path(os.environ.get('OCEANO_SAMPLER_DADOS') or Path(__file__).resolve().parent)   # (Oceano) dados fora do app
CACHE = ROOT / '.cache'
STEMS_PY = Path.home() / '.local/share/fm1-stems/bin/python'   # (Demucs in its own venv: torch wants an older Python)
MAX_CLIP = 600                                                  # (a stretch at most 10 min)
YT = re.compile(r'^(https?://)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/', re.I)
IG = re.compile(r'^(https?://)?(www\.)?instagram\.com/([\w.]+/)?(reel|reels|p|tv)/[\w-]+', re.I)   # (the user) Instagram too: public reels and posts
JOBS = {}
MODELS = ('htdemucs', 'htdemucs_ft', 'htdemucs_6s')                # (the user) quick / better (fine-tuned, ~4x slower) / 6 instruments (+ guitar, piano)
STEM_NAMES = ('drums', 'bass', 'vocals', 'other', 'guitar', 'piano')
ALLOW = {'https://sampler.half.social'}   # (the user) the sampler online finds this server on the Mac
ALLOW |= {'http://localhost:5216', 'http://127.0.0.1:5216', 'oceano-ui://app', 'oceano-ui://sampler'}   # (the user) the Oceano browser's Trilha uses it too (simulator + app)
if os.environ.get('OCEANO_SAMPLER_DADOS'):
    ALLOW.discard('https://sampler.half.social')   # (Oceano) dentro do navegador, nenhum site público fala com este motor
SONS = ROOT / 'sons'
AUDIO = {'.wav', '.mp3', '.ogg', '.flac', '.m4a', '.aac', '.aif', '.aiff', '.opus', '.webm'}

def yt_ok(url):
    return bool(url) and bool(YT.match(url) or IG.match(url))
def is_ig(url):
    return bool(url) and bool(IG.match(url))

YT_WHY = [   # (the user) yt-dlp's errors said plainly
    ('login required', 'o Instagram pediu login para este post (só posts públicos funcionam)'),
    ('rate-limit', 'o Instagram limitou os acessos: tente de novo em alguns minutos'),
    ('empty media response', 'o Instagram não entregou o vídeo (post privado ou que pede login)'),
    ('there is no video in this post', 'este post do Instagram não tem vídeo'),
    ('no video formats found', 'este post não tem vídeo'),
    ('confirm your age', 'o vídeo tem restrição de idade: o YouTube não libera sem login'),
    ('private video', 'o vídeo é privado'),
    ('not available in your country', 'o vídeo está bloqueado na sua região'),
    ('members-only', 'o vídeo é só para membros do canal'),
    ('this live event', 'é uma transmissão ao vivo (ainda não terminou)'),
    ('is live', 'é uma transmissão ao vivo (ainda não terminou)'),
    ('video unavailable', 'o vídeo não está disponível (removido ou bloqueado)'),
    ('is unavailable', 'o vídeo não está disponível (removido, privado ou bloqueado)'),
    ('copyright', 'o vídeo foi bloqueado por direitos autorais'),
    ("confirm you're not a bot", 'o YouTube pediu para confirmar que não é um robô'),
    ('confirm you’re not a bot', 'o YouTube pediu para confirmar que não é um robô'),
    ('requested format is not available', 'o YouTube não ofereceu um formato que dê para baixar'),
]
def yt_err(stderr):
    low = (stderr or '').lower()
    for k, msg in YT_WHY:
        if k in low:
            return msg
    last = stderr.strip().splitlines()[-1] if stderr and stderr.strip() else 'yt-dlp falhou'
    return 'o site recusou este link (' + last.replace('ERROR: ', '')[:140] + ')'

def yt_info(url):
    out = subprocess.run(['yt-dlp', '-J', '--no-playlist', '--no-warnings', url], capture_output=True, text=True, timeout=60)
    if out.returncode:
        raise RuntimeError(yt_err(out.stderr))
    j = json.loads(out.stdout)
    if j.get('_type') == 'playlist' and j.get('entries'):   # (an Instagram post with several items: its first video)
        j = next((e for e in j['entries'] if e and e.get('duration')), j['entries'][0])
    if is_ig(url):
        return {'id': 'ig_' + str(j.get('id', '')), 'site': 'instagram', 'title': j.get('title') or j.get('description', '')[:80] or 'Instagram', 'duration': j.get('duration') or 0,
                'thumb': j.get('thumbnail', ''), 'channel': j.get('uploader') or j.get('channel') or '', 'license': '', 'embed': False,
                'handle': ('@' + str(j.get('channel') or j.get('uploader_id') or '').lstrip('@')) if (j.get('channel') or j.get('uploader_id')) else ''}
    hd = str(j.get('uploader_id') or j.get('channel_handle') or '')   # (the user) the credit: the channel's @ when there is one
    return {'site': 'youtube', 'handle': hd if hd.startswith('@') else '', 'id': j['id'], 'title': j.get('title', ''), 'duration': j.get('duration') or 0, 'thumb': j.get('thumbnail', ''), 'channel': j.get('channel', ''), 'license': j.get('license') or '', 'embed': j.get('playable_in_embed') is not False}

def yt_audio(url):
    """The video's audio, downloaded once (best audio, as it comes), kept by its id."""
    vid = yt_info(url)['id']
    d = CACHE / 'yt'; d.mkdir(parents=True, exist_ok=True)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if have:
        return have[0]
    out = subprocess.run(['yt-dlp', '-f', 'bestaudio/best', '--no-playlist', '--no-warnings', '-o', str(d / (vid + '.%(ext)s')), url], capture_output=True, text=True, timeout=600)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if out.returncode or not have:
        raise RuntimeError(yt_err(out.stderr) if out.returncode else 'não deu para baixar o áudio')
    return have[0]

def clip(url, start, end, dst):
    src = yt_audio(url)
    start = max(0.0, float(start)); end = float(end)
    if not (end > start) or end - start > MAX_CLIP:
        raise ValueError('trecho inválido (até 10 min)')
    out = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.3f}', '-to', f'{end:.3f}', '-i', str(src), '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', str(dst)], capture_output=True, text=True, timeout=300)
    if out.returncode:
        raise RuntimeError('ffmpeg: ' + out.stderr.strip()[-200:])
    return dst

def yt_peaks(url, n=800):
    """The audio's outline: n peaks (0..1) over the whole video, kept by id (the audio itself downloaded once)."""
    import array
    vid = yt_info(url)['id']; d = CACHE / 'peaks'; d.mkdir(parents=True, exist_ok=True); f = d / f'{vid}-{n}.json'
    if f.exists():
        return json.loads(f.read_text())
    src = yt_audio(url)
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-ac', '1', '-ar', '2000', '-f', 's16le', '-'], capture_output=True, timeout=300)
    if out.returncode:
        raise RuntimeError('ffmpeg: não deu para ler o áudio')
    a = array.array('h'); a.frombytes(out.stdout[: len(out.stdout) // 2 * 2]); L = len(a) or 1; step = max(1, L // n); pk = []
    for i in range(0, L, step):
        seg = a[i:i + step]; pk.append(max(max(seg), -min(seg)) / 32768 if seg else 0)
    top = max(pk) or 1; res = {'peaks': [round(v / top, 3) for v in pk[:n]], 'duration': L / 2000}
    f.write_text(json.dumps(res)); return res

def yt_media(url):
    """The whole video with its sound (an Instagram reel: small), downloaded once: the player of the page plays it."""
    vid = yt_info(url)['id']
    d = CACHE / 'media'; d.mkdir(parents=True, exist_ok=True)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if have:
        return have[0]
    out = subprocess.run(['yt-dlp', '-f', 'b[ext=mp4][height<=720]/bv*[height<=720]+ba/b', '--merge-output-format', 'mp4', '--no-playlist', '--no-warnings', '-o', str(d / (vid + '.%(ext)s')), url],
                         capture_output=True, text=True, timeout=600)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if out.returncode or not have:
        raise RuntimeError(yt_err(out.stderr) if out.returncode else 'não deu para baixar o vídeo')
    return have[0]

def yt_video(url):
    """The video itself, small (360p at most), downloaded once and kept by its id."""
    vid = yt_info(url)['id']
    d = CACHE / 'ytv'; d.mkdir(parents=True, exist_ok=True)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if have:
        return have[0]
    out = subprocess.run(['yt-dlp', '-f', 'bv*[height<=360][ext=mp4]/bv*[height<=360]/b[height<=360]/worst', '--no-playlist', '--no-warnings', '-o', str(d / (vid + '.%(ext)s')), url], capture_output=True, text=True, timeout=600)
    have = [p for p in d.glob(vid + '.*') if p.suffix not in ('.part', '.ytdl')]
    if out.returncode or not have:
        raise RuntimeError(yt_err(out.stderr) if out.returncode else 'não deu para baixar o vídeo')
    return have[0]

def vclip(url, start, end, dst):
    src = yt_video(url)
    start = max(0.0, float(start)); end = float(end)
    if not (end > start) or end - start > 60:
        raise ValueError('trecho inválido (até 1 min)')
    out = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.3f}', '-to', f'{end:.3f}', '-i', str(src), '-an', '-vf', 'scale=480:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(dst)], capture_output=True, text=True, timeout=300)
    if out.returncode:
        raise RuntimeError('ffmpeg: ' + out.stderr.strip()[-200:])
    return dst

def stems_job(job, url, start, end, have=None, model='htdemucs'):
    J = JOBS[job]
    model = model if model in MODELS else 'htdemucs'
    try:
        d = CACHE / 'stems' / job; d.mkdir(parents=True, exist_ok=True)
        if have:                                         # (the user) a pad's sound, already here
            wav = have
        else:
            J.update(state='baixando', pct=2)
            wav = clip(url, start, end, d / 'mix.wav')
        if not STEMS_PY.exists():
            raise RuntimeError('Demucs não instalado (~/.local/share/fm1-stems)')
        J.update(state='separando', pct=5)
        for dev in ('mps', 'cpu'):                       # (the Mac's GPU first; the processor if it can't)
            p = subprocess.Popen([str(STEMS_PY), '-m', 'demucs', '-n', model, '-d', dev, '-o', str(d), str(wav)], stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True, bufsize=1)
            buf, last, passes = '', 0, 0
            while True:
                ch = p.stderr.read(1)
                if not ch:
                    break
                buf = (buf + ch)[-200:]
                m = re.findall(r'(\d+)%\|', buf)
                if m:                                    # (htdemucs_ft runs 4 models one after another: each its own 0..100 %)
                    v = int(m[-1])
                    if v < last - 40:
                        passes += 1
                    last = v
                    nb = 4 if model == 'htdemucs_ft' else 1
                    J['pct'] = max(J['pct'], 5 + (min(passes, nb - 1) * 100 + v) / nb * 0.93)
            if p.wait() == 0:
                break
            if dev == 'cpu':
                raise RuntimeError('Demucs falhou: ' + buf.strip()[-160:])
        out = d / model / 'mix'
        J['stems'] = {k: f'/.cache/stems/{job}/{model}/mix/{k}.wav' for k in STEM_NAMES if (out / f'{k}.wav').exists()}
        J.update(state='pronto', pct=100)
    except Exception as e:
        J.update(state='erro', error=str(e))

class H(SimpleHTTPRequestHandler):
    def _barrado(self):
        # (Oceano) este servidor roda programas: só atende a própria máquina e as páginas conhecidas, nunca um site qualquer
        porta = self.server.server_address[1]
        if self.headers.get('Host') not in (f'127.0.0.1:{porta}', f'localhost:{porta}'):
            self.send_error(403); return True
        origem = self.headers.get('Origin')
        if origem and origem not in ALLOW and origem != f'http://127.0.0.1:{porta}' and origem != f'http://localhost:{porta}':
            self.send_error(403); return True
        # sem Origin, um <img> ou <script> de outro site ainda dispararia um pedido; só vídeo e áudio de fora passam
        if not origem and self.headers.get('Sec-Fetch-Site') == 'cross-site' and self.headers.get('Sec-Fetch-Dest') not in ('video', 'audio'):
            self.send_error(403); return True
        return False
    def list_directory(self, path):
        self.send_error(404); return None
    def end_headers(self):
        o = self.headers.get('Origin')
        if o in ALLOW:
            self.send_header('Access-Control-Allow-Origin', o); self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def do_OPTIONS(self):
        if self._barrado(): return
        self.send_response(204)
        if self.headers.get('Origin') in ALLOW:
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.send_header('Access-Control-Allow-Private-Network', 'true'); self.send_header('Access-Control-Max-Age', '600')
        self.end_headers()
    def local_only(self):   # the hub's own files are written only from the hub itself
        o = self.headers.get('Origin')
        return not o or o.startswith('http://localhost') or o.startswith('http://127.0.0.1')
    def send_json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self._barrado(): return
        u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == '/__yt/info':
            if not yt_ok(q.get('url')):
                return self.send_json({'error': 'link do YouTube ou do Instagram inválido'}, 400)
            try:
                return self.send_json(yt_info(q['url']))
            except Exception as e:
                return self.send_json({'error': str(e)}, 500)
        if u.path == '/__yt/clip':
            if not yt_ok(q.get('url')):
                return self.send_json({'error': 'link do YouTube ou do Instagram inválido'}, 400)
            try:
                d = CACHE / 'clips'; d.mkdir(parents=True, exist_ok=True)
                dst = clip(q['url'], q.get('start', 0), q.get('end', 30), d / (uuid.uuid4().hex + '.wav'))
                b = dst.read_bytes(); dst.unlink()
            except Exception as e:
                return self.send_json({'error': str(e)}, 500)
            self.send_response(200); self.send_header('Content-Type', 'audio/wav'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        if u.path == '/__yt/peaks':                      # (the user) the sound's outline before choosing
            if not yt_ok(q.get('url')):
                return self.send_json({'error': 'link do YouTube ou do Instagram inválido'}, 400)
            try:
                return self.send_json(yt_peaks(q['url'], max(100, min(2000, int(q.get('n', 800))))))
            except Exception as e:
                return self.send_json({'error': str(e)}, 500)
        if u.path == '/__yt/media':                      # (the user) the video with its sound, for the page's own player (Instagram); Range for seeking
            if not yt_ok(q.get('url')):
                return self.send_json({'error': 'link do YouTube ou do Instagram inválido'}, 400)
            try:
                f = yt_media(q['url'])
            except Exception as e:
                return self.send_json({'error': str(e)}, 500)
            size = f.stat().st_size; a, z = 0, size - 1; rg = re.match(r'bytes=(\d*)-(\d*)', self.headers.get('Range') or '')
            if rg:
                a = int(rg.group(1)) if rg.group(1) else max(0, size - int(rg.group(2) or 0)); z = int(rg.group(2)) if rg.group(1) and rg.group(2) else size - 1; z = min(z, size - 1)
            self.send_response(206 if rg else 200); self.send_header('Content-Type', 'video/mp4'); self.send_header('Accept-Ranges', 'bytes'); self.send_header('Content-Length', str(z - a + 1))
            if rg:
                self.send_header('Content-Range', f'bytes {a}-{z}/{size}')
            self.end_headers()
            with open(f, 'rb') as fh:
                fh.seek(a); left = z - a + 1
                while left > 0:
                    b = fh.read(min(65536, left))
                    if not b:
                        break
                    try:
                        self.wfile.write(b)
                    except (BrokenPipeError, ConnectionResetError):
                        return
                    left -= len(b)
            return
        if u.path == '/__yt/vclip':                      # (the user) a stretch of the video as the tracks' background
            if not yt_ok(q.get('url')):
                return self.send_json({'error': 'link do YouTube ou do Instagram inválido'}, 400)
            try:
                d = CACHE / 'clips'; d.mkdir(parents=True, exist_ok=True)
                dst = vclip(q['url'], q.get('start', 0), q.get('end', 15), d / (uuid.uuid4().hex + '.mp4'))
                b = dst.read_bytes(); dst.unlink()
            except Exception as e:
                return self.send_json({'error': str(e)}, 500)
            self.send_response(200); self.send_header('Content-Type', 'video/mp4'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
        m = re.match(r'^/__stems/([0-9a-f]{32})$', u.path)
        if m:
            J = JOBS.get(m.group(1))
            return self.send_json(J if J else {'state': 'erro', 'error': 'trabalho não encontrado'}, 200 if J else 404)
        if u.path == '/__sons':                         # (the user) the sound library: hub/sons/<category>/<file>
            items = []
            for f in sorted(SONS.rglob('*'), key=lambda q: str(q).lower()):
                if f.is_file() and f.suffix.lower() in AUDIO and not f.name.startswith('.'):
                    rel = f.relative_to(SONS); cat = rel.parent.as_posix() if rel.parent.as_posix() != '.' else 'Geral'
                    items.append({'path': rel.as_posix(), 'name': f.stem, 'cat': cat, 'ext': f.suffix.lower()[1:]})
            return self.send_json({'items': items})
        if u.path == '/__sons/wav':
            f = (SONS / q.get('path', '')).resolve()
            if SONS.resolve() not in f.parents or not f.is_file():
                return self.send_json({'error': 'som não encontrado'}, 404)
            out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-f', 'wav', '-c:a', 'pcm_s16le', '-'], capture_output=True, timeout=120)
            if out.returncode:
                return self.send_json({'error': 'não deu para converter'}, 500)
            self.send_response(200); self.send_header('Content-Type', 'audio/wav'); self.send_header('Content-Length', str(len(out.stdout))); self.end_headers(); self.wfile.write(out.stdout); return
        if u.path == '/__stems':
            return self.send_json({'ready': STEMS_PY.exists(), 'models': list(MODELS)})
        super().do_GET()
    def do_POST(self):
        if self._barrado(): return
        if self.path.startswith('/__stems') and sum(1 for j in JOBS.values() if j.get('state') == 'na fila' or (j.get('pct', 0) < 100 and j.get('state') != 'erro')) >= 3:
            return self.send_json({'error': 'já há separações em andamento: espere terminar'}, 429)
        n = int(self.headers.get('Content-Length', 0))
        u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
        if u.path == '/__stems/wav':                     # (the user) a pad's sound (or a video / file sent from the page) split; ?m= the model
            if not (44 < n <= 200 * 1024 * 1024):
                return self.send_json({'error': 'áudio inválido'}, 400)
            job = uuid.uuid4().hex; d = CACHE / 'stems' / job; d.mkdir(parents=True, exist_ok=True)
            (d / 'mix.wav').write_bytes(self.rfile.read(n))
            JOBS[job] = {'state': 'na fila', 'pct': 0, 't0': time.time()}
            threading.Thread(target=stems_job, args=(job, None, 0, 0, d / 'mix.wav', q.get('m', 'htdemucs')), daemon=True).start()
            return self.send_json({'job': job})
        if u.path == '/__stems':                         # (the user) a stretch of a YouTube video split into its instruments
            try:
                data = json.loads(self.rfile.read(n)); assert yt_ok(data.get('url'))
            except Exception:
                return self.send_json({'error': 'pedido inválido'}, 400)
            job = uuid.uuid4().hex
            JOBS[job] = {'state': 'na fila', 'pct': 0, 't0': time.time()}
            threading.Thread(target=stems_job, args=(job, data['url'], data.get('start', 0), data.get('end', 30), None, data.get('model', 'htdemucs')), daemon=True).start()
            return self.send_json({'job': job})
        self.send_error(404)
    def log_message(self, *a):
        pass

if __name__ == '__main__':
    if shutil.which('yt-dlp') is None:
        print('aviso: yt-dlp não encontrado (o YouTube do sampler não funciona)')
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5217
    ThreadingHTTPServer(('127.0.0.1', port), partial(H, directory=str(ROOT))).serve_forever()
