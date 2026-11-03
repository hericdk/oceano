// As ferramentas de mídia e a navegação entre elas.
(() => {
    'use strict';

    const hasGsap = typeof window.gsap !== 'undefined';
    const EASE = 'expo.out';
    const LIB = {
        gifenc: new URL('vendor/gifenc.esm.js', location.href).href,
        tracer: new URL('vendor/imagetracer.js', location.href).href,
        pako: new URL('vendor/pako.min.js', location.href).href,
        upng: new URL('vendor/UPNG.js', location.href).href,
        lame: new URL('vendor/lame.min.js', location.href).href
    };

    // ---------- Utilitários ----------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    // Cede a vez para a UI; o timer garante que não trava com a aba em segundo plano (rAF para)
    const nextFrame = () => new Promise((resolve) => {
        let done = false;
        const go = () => { if (!done) { done = true; resolve(); } };
        requestAnimationFrame(go);
        setTimeout(go, 50);
    });
    const baseName = (name) => name.replace(/\.[^.]+$/, '');

    function fmtTime(s) {
        s = Number.isFinite(s) ? Math.round(Math.max(0, s) * 100) / 100 : 0;
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
    }

    function fmtBytes(n) {
        if (!Number.isFinite(n)) return '—';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(i && n < 10 ? 1 : 0)} ${units[i]}`;
    }

    function fmtDelta(after, before) {
        const pct = Math.round((after / before - 1) * 100);
        return { text: `${pct > 0 ? '+' : ''}${pct}%`, good: pct <= 0 };
    }

    function safeIdent(name) {
        let id = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!id) id = 'clip';
        return /^\d/.test(id) ? `clip_${id}` : id;
    }

    function downloadBlob(blob, name) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    function waitEvent(target, type, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                target.removeEventListener(type, done);
                reject(new Error(`Tempo esgotado esperando "${type}"`));
            }, timeout);
            function done(e) { clearTimeout(timer); resolve(e); }
            target.addEventListener(type, done, { once: true });
        });
    }

    const loadedScripts = {};
    function loadScript(src) {
        if (!loadedScripts[src]) {
            loadedScripts[src] = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = resolve;
                s.onerror = () => { delete loadedScripts[src]; reject(new Error('Não foi possível carregar a biblioteca (sem internet?)')); };
                document.head.appendChild(s);
            });
        }
        return loadedScripts[src];
    }

    // CRC32 compartilhado por PNG e ZIP
    const CRC_TABLE = (() => {
        const t = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();
    function crc32(bytes, crc = 0xffffffff) {
        for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
        return crc;
    }

    // ZIP sem compressão (os arquivos já são comprimidos)
    function zipStore(files) {
        const enc = new TextEncoder();
        const now = new Date();
        const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const parts = [];
        const central = [];
        let offset = 0;
        for (const file of files) {
            const name = enc.encode(file.name);
            const data = file.data;
            const crc = (crc32(data) ^ 0xffffffff) >>> 0;
            const local = new DataView(new ArrayBuffer(30));
            local.setUint32(0, 0x04034b50, true);
            local.setUint16(4, 20, true);
            local.setUint16(6, 0x0800, true);
            local.setUint16(10, time, true);
            local.setUint16(12, date, true);
            local.setUint32(14, crc, true);
            local.setUint32(18, data.length, true);
            local.setUint32(22, data.length, true);
            local.setUint16(26, name.length, true);
            parts.push(local, name, data);
            const dir = new DataView(new ArrayBuffer(46));
            dir.setUint32(0, 0x02014b50, true);
            dir.setUint16(4, 20, true);
            dir.setUint16(6, 20, true);
            dir.setUint16(8, 0x0800, true);
            dir.setUint16(12, time, true);
            dir.setUint16(14, date, true);
            dir.setUint32(16, crc, true);
            dir.setUint32(20, data.length, true);
            dir.setUint32(24, data.length, true);
            dir.setUint16(28, name.length, true);
            dir.setUint32(42, offset, true);
            central.push(dir, name);
            offset += 30 + name.length + data.length;
        }
        const size = central.reduce((sum, p) => sum + p.byteLength, 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, files.length, true);
        end.setUint16(10, files.length, true);
        end.setUint32(12, size, true);
        end.setUint32(16, offset, true);
        return new Blob([...parts, ...central, end], { type: 'application/zip' });
    }

    // PNG indexado (1/2/4/8 bits por pixel) com metadados num chunk tEXt
    async function encodeIndexedPNG(idx, w, h, palette, comment) {
        const depth = palette.length <= 2 ? 1 : palette.length <= 4 ? 2 : palette.length <= 16 ? 4 : 8;
        const rowBytes = Math.ceil((w * depth) / 8);
        const raw = new Uint8Array((rowBytes + 1) * h);
        for (let y = 0; y < h; y++) {
            let o = y * (rowBytes + 1) + 1;
            let acc = 0;
            let bits = 0;
            for (let x = 0; x < w; x++) {
                acc = (acc << depth) | idx[y * w + x];
                bits += depth;
                if (bits === 8) { raw[o++] = acc; acc = 0; bits = 0; }
            }
            if (bits) raw[o] = (acc << (8 - bits)) & 0xff;
        }
        const zlib = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
        const chunk = (type, data) => {
            const out = new Uint8Array(12 + data.length);
            const view = new DataView(out.buffer);
            view.setUint32(0, data.length);
            for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
            out.set(data, 8);
            view.setUint32(8 + data.length, (crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff) >>> 0);
            return out;
        };
        const ihdr = new Uint8Array(13);
        const hv = new DataView(ihdr.buffer);
        hv.setUint32(0, w);
        hv.setUint32(4, h);
        ihdr[8] = depth;
        ihdr[9] = 3;
        const plte = new Uint8Array(palette.length * 3);
        palette.forEach((c, i) => plte.set(c.slice(0, 3), i * 3));
        const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
        if (comment) parts.push(chunk('tEXt', new TextEncoder().encode(`Comment\0${comment}`)));
        parts.push(chunk('IDAT', zlib), chunk('IEND', new Uint8Array(0)));
        return new Blob(parts, { type: 'image/png' });
    }

    // ---------- Toast (GSAP) ----------
    const toastEl = $('#toast');
    const toastDefault = toastEl ? toastEl.textContent : '';
    let toastTimer = 0;
    function notify(text, ms = 2600) {
        if (!toastEl) return;
        clearTimeout(toastTimer);
        toastEl.textContent = text;
        toastEl.classList.add('show');
        toastTimer = setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => { if (!toastEl.classList.contains('show')) toastEl.textContent = toastDefault; }, 600);
        }, ms);
    }
    // ---------- Case: limpar texto colado (espaços especiais e invisíveis) ----------
    (() => {
        const input = $('#cc-input');
        const btn = $('#cc-clean');
        const badge = $('#cc-clean-n');
        if (!input || !btn) return;
        // espaços que parecem normais mas não deixam a linha quebrar (ou têm largura diferente)
        const SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;
        // invisíveis: zero-width space, word joiner, BOM/ZWNBSP, hífen opcional
        const INVISIBLE = /[\u200B\u2060\uFEFF\u00AD]/g;
        const count = (t) => (t.match(SPACES) || []).length + (t.match(INVISIBLE) || []).length;
        const clean = (t) => t
            .replace(/\r\n?/g, '\n')
            .replace(/[\u2028\u2029]/g, '\n')
            .replace(INVISIBLE, '')
            .replace(SPACES, ' ')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        const refresh = () => {
            const n = count(input.value);
            badge.textContent = n;
            badge.classList.toggle('is-hidden', !n);
            btn.title = n ? `${n} caractere${n > 1 ? 's' : ''} ${n > 1 ? 'especiais' : 'especial'} (espaço que não quebra ou invisível) — clique para limpar` : 'Troca espaços especiais (NBSP, espaço estreito, invisíveis) por espaço normal, junta espaços repetidos e limpa as pontas das linhas';
        };
        input.addEventListener('input', refresh);
        btn.addEventListener('click', () => {
            const before = input.value;
            if (!before) return;
            const n = count(before);
            const after = clean(before);
            if (after === before) { notify('O texto já está limpo'); return; }
            input.value = after;
            refresh();
            navigator.clipboard.writeText(after).catch(() => {});
            const extra = before.length - after.length - (before.match(INVISIBLE) || []).length;
            notify(n ? `Limpo e copiado · ${n} caractere${n > 1 ? 's' : ''} ${n > 1 ? 'especiais' : 'especial'} trocado${n > 1 ? 's' : ''}` : `Limpo e copiado · ${extra} espaço${extra > 1 ? 's' : ''} extra removido${extra > 1 ? 's' : ''}`);
        });
        refresh();
    })();

    if (toastEl && hasGsap) {
        toastEl.style.transition = 'none';
        gsap.set(toastEl, { opacity: 0, y: 14 });
        new MutationObserver(() => {
            const show = toastEl.classList.contains('show');
            gsap.to(toastEl, show
                ? { opacity: 1, y: 0, duration: 0.7, ease: EASE, overwrite: true }
                : { opacity: 0, y: 8, duration: 0.5, ease: EASE, overwrite: true });
        }).observe(toastEl, { attributes: true, attributeFilter: ['class'] });
    }

    // ---------- Controles segmentados (pílula desliza com GSAP) ----------
    const segs = [];
    function initSeg(root, onChange) {
        const pill = document.createElement('span');
        pill.className = 'seg-pill';
        root.prepend(pill);
        const items = $$(':scope > button, :scope > a', root);
        const place = (animate) => {
            const on = root.querySelector(':scope > .on');
            if (!on || !on.offsetWidth) return;
            const vars = { x: on.offsetLeft, width: on.offsetWidth };
            if (!hasGsap) {
                pill.style.transform = `translateX(${vars.x}px)`;
                pill.style.width = `${vars.width}px`;
            } else if (animate) {
                gsap.to(pill, { ...vars, duration: 0.6, ease: EASE, overwrite: true });
            } else {
                gsap.set(pill, vars);
            }
        };
        const api = {
            get value() { return root.querySelector(':scope > .on')?.dataset.v; },
            set(v, silent) {
                items.forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
                place(true);
                if (!silent) onChange?.(String(v));
            },
            refresh: () => place(false)
        };
        items.forEach((b) => {
            if (b.tagName !== 'BUTTON') return;
            b.addEventListener('click', () => { if (!b.disabled && !b.classList.contains('on')) api.set(b.dataset.v); });
        });
        if ('ResizeObserver' in window) new ResizeObserver(() => place(false)).observe(root);
        segs.push(api);
        return api;
    }

    $$('.seg:not([id])').forEach((root) => initSeg(root));

    // ---------- Navegação: indicador + saída da aba com GSAP ----------
    const navLinks = $('#top-links');
    const indicator = $('#nav-indicator');
    const main = $('#main');
    const tools = {};
    let leaving = false;

    function currentTab() {
        const el = document.getElementById(location.hash.slice(1));
        return el && el.classList.contains('tab-content') ? el.id : 'case-converter';
    }

    function moveIndicator(id, animate = true) {
        if (!indicator || !navLinks) return;
        const link = navLinks.querySelector(`a.nav-link[href="#${id === 'video' ? 'editor' : id}"]`);
        if (!link) return;
        const vars = { x: link.offsetLeft, width: link.offsetWidth, opacity: 1 };
        if (!hasGsap) {
            indicator.style.transform = `translateX(${vars.x}px)`;
            indicator.style.width = `${vars.width}px`;
            indicator.style.opacity = '1';
        } else if (animate) {
            gsap.to(indicator, { ...vars, duration: 0.75, ease: EASE, overwrite: true });
        } else {
            gsap.set(indicator, vars);
        }
        // Em telas estreitas o menu rola na horizontal: mantém a aba ativa à vista
        if (navLinks.scrollWidth > navLinks.clientWidth) {
            navLinks.scrollTo({ left: link.offsetLeft - (navLinks.clientWidth - link.offsetWidth) / 2, behavior: animate ? 'smooth' : 'auto' });
        }
    }

    // Só a aba que sai anima; a nova aparece direto (sem efeito de entrada).
    function goTo(id) {
            const current = $('.tab-content.active'), next = document.getElementById(id);
            const alvo = id === 'video' ? 'editor' : id;
            $$('.nav-link').forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${alvo}`));
            moveIndicator(id);
            if (!current || !next || current === next || matchMedia('(prefers-reduced-motion: reduce)').matches) { location.hash = id; return; }
            const ordem = (window.FERRAMENTAS || []).map((f) => f[0]), pos = (x) => (x === 'video' ? ordem.indexOf('editor') + 0.5 : ordem.indexOf(x));
            const lado = pos(id) > pos(current.id) ? 1 : -1, W = main.clientWidth;
            const r = current.getBoundingClientRect(), m = main.getBoundingClientRect();
            leaving = true;
            // a atual sai para um lado e a escolhida entra pelo outro, sem passar pelas do meio
            Object.assign(current.style, { top: `${r.top - m.top + main.scrollTop}px`, left: `${r.left - m.left}px`, width: `${r.width}px`, right: 'auto', margin: 0 });
            current.classList.add('saindo');
            next.classList.add('active');
            main.scrollTop = 0;
            gsap.fromTo(next, { x: lado * W }, { x: 0, duration: 0.55, ease: EASE, clearProps: 'transform' });
            gsap.to(current, {
                x: -lado * W, duration: 0.55, ease: EASE,
                onComplete() {
                    current.classList.remove('saindo');
                    current.removeAttribute('style');
                    gsap.set(current, { clearProps: 'all' });
                    leaving = false;
                    location.hash = id;
                }
            });
        }

        document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        const id = a.getAttribute('href').slice(1);
        const panel = document.getElementById(id);
        if (!panel || !panel.classList.contains('tab-content')) return;
        e.preventDefault();
        if (!leaving && id !== currentTab()) goTo(id);
    });

    
    function onRoute() {
        const id = currentTab();
        try { localStorage.setItem(LAST_TAB, id); } catch { /* ok */ }
        moveIndicator(id);
        if (main) main.scrollTop = 0;
        Object.entries(tools).forEach(([key, tool]) => (key === id ? tool.show?.() : tool.hide?.()));
        segs.forEach((s) => s.refresh());
    }
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('DOMContentLoaded', () => {
        moveIndicator(currentTab(), false);
        onRoute();
        document.fonts?.ready.then(() => { moveIndicator(currentTab(), false); segs.forEach((s) => s.refresh()); });
    });
    window.addEventListener('resize', () => moveIndicator(currentTab(), false));

    // Atalhos de teclado das ferramentas de mídia
    document.addEventListener('keydown', (e) => {
        if (e.defaultPrevented) return;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() !== 'z') return;
        const t = e.target;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
        if (t.closest?.('.knob') && e.key !== ' ') return;
        const tool = tools[currentTab()];
        if (tool?.key && tool.key(e)) e.preventDefault();
    });

    // ---------- Dropzones ----------
    function bindDrop(zone, input, onFiles) {
        zone.addEventListener('click', (e) => { if (!zone.classList.contains('is-compact') && !e.target.closest('button, a, input')) input.click(); });
        ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (e) => { e.preventDefault(); zone.classList.add('is-over'); }));
        zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-over'); });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('is-over');
            const files = Array.from(e.dataTransfer?.files || []);
            if (files.length) onFiles(files);
        });
        input.addEventListener('change', () => {
            const files = Array.from(input.files || []);
            input.value = '';
            if (files.length) onFiles(files);
        });
    }

    // Depois de carregar: a área de envio vira uma barra do arquivo atual, com botão "Trocar"
    function compactDrop(zone, file, note = '') {
        const h0 = zone.offsetHeight;
        zone.classList.add('is-compact');
        if (!zone.querySelector('.drop-text')) {
            const text = document.createElement('div');
            text.className = 'drop-text';
            text.append($('.drop-title', zone), $('.drop-hint', zone));
            $('.drop-icon', zone).after(text);
        }
        if (!zone.querySelector('.drop-swap')) {
            const swap = document.createElement('button');
            swap.type = 'button';
            swap.className = 'btn drop-swap';
            swap.innerHTML = '<i class="fas fa-arrow-right-arrow-left"></i> Trocar';
            swap.addEventListener('click', () => zone.querySelector('input[type="file"]').click());
            zone.appendChild(swap);
        }
        $('.drop-title', zone).textContent = file.name;
        $('.drop-hint', zone).textContent = [fmtBytes(file.size), note].filter(Boolean).join(' · ');
        if (hasGsap && h0) gsap.fromTo(zone, { height: h0 }, { height: zone.offsetHeight, duration: 0.7, ease: EASE, clearProps: 'height' });
    }

    function reveal(el) {
        if (!el.classList.contains('is-hidden')) return;
        el.classList.remove('is-hidden');
        if (hasGsap) gsap.from(el.children, { opacity: 0, y: 18, duration: 0.8, ease: EASE, stagger: 0.07, clearProps: 'opacity,transform' });
    }

    function flash(stage, playing) {
        const f = $('.stage-flash', stage);
        if (!f) return;
        f.innerHTML = `<i class="fas fa-${playing ? 'play' : 'pause'}"></i>`;
        if (hasGsap) gsap.fromTo(f, { opacity: 0.95, scale: 0.8 }, { opacity: 0, scale: 1.35, duration: 0.7, ease: EASE, overwrite: true });
    }

    function shake(el) {
        if (hasGsap && el) gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.35)', overwrite: true });
    }

    function setPlayIcon(btn, playing) {
        btn.innerHTML = `<i class="fas fa-${playing ? 'pause' : 'play'}"></i>`;
    }

    function progressUI(wrap) {
        const fill = $('.bar > i', wrap);
        const label = $('[id$="-status"]', wrap);
        const pct = $('[id$="-pct"]', wrap);
        return {
            show() { fill.style.width = '0%'; wrap.classList.remove('is-hidden'); },
            hide() { wrap.classList.add('is-hidden'); },
            set(text, p) {
                const v = clamp(p, 0, 1);
                label.textContent = text;
                pct.textContent = `${Math.round(v * 100)}%`;
                if (hasGsap) gsap.to(fill, { width: `${v * 100}%`, duration: 0.5, ease: EASE, overwrite: true });
                else fill.style.width = `${v * 100}%`;
            }
        };
    }

    function busyButton(btn, text) {
        const html = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> <span>${text}</span>`;
        return () => { btn.disabled = false; btn.innerHTML = html; };
    }

    // ---------- Referências de nível na forma de onda (escala real: topo da faixa = 0 dBFS) ----------
    const LEVEL_HOT = 0.891; // −1 dBFS: acima disso estoura (ou fica no limite)
    const LEVEL_LOW = 0.1;   // −20 dBFS: abaixo disso está baixo demais
    function fmtDb(v) {
        if (!(v > 0)) return '−∞ dB';
        const d = 20 * Math.log10(v);
        return `${d > 0.05 ? '+' : d < -0.05 ? '−' : ''}${Math.abs(d).toFixed(1)} dB`;
    }
    const levelTone = (peak) => (peak >= LEVEL_HOT ? 'hot' : peak < LEVEL_LOW ? 'low' : 'ok');
    const LEVEL_COLOR = { hot: '#ff5a5f', low: '#5b7cff' };
    function drawLevelLines(g, W, mid, amp, dpr) {
        g.save();
        g.lineWidth = Math.max(1, dpr);
        g.setLineDash([4 * dpr, 4 * dpr]);
        for (const [level, color] of [[LEVEL_HOT, 'rgba(255, 90, 95, .9)'], [LEVEL_LOW, 'rgba(47, 92, 255, .95)']]) {
            g.strokeStyle = color;
            g.beginPath();
            for (const y of [mid - level * amp, mid + level * amp]) {
                g.moveTo(0, Math.round(y) + 0.5);
                g.lineTo(W, Math.round(y) + 0.5);
            }
            g.stroke();
        }
        g.restore();
    }

    // ---------- Knob virtual ----------
    function knobArc() {
        const point = (deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            return `${(32 + 25 * Math.cos(a)).toFixed(2)} ${(32 + 25 * Math.sin(a)).toFixed(2)}`;
        };
        return `M ${point(-135)} A 25 25 0 1 1 ${point(135)}`;
    }
    const KNOB_ARC = knobArc();

    class Knob {
        constructor(host, options) {
            this.o = Object.assign({ min: 0, max: 1, value: 0, step: 0.01, bipolar: false, format: (v) => String(v), onChange: null }, options);
            this.def = this.o.value;
            this.v = this.o.value;
            this.acc = 0;
            const el = document.createElement('div');
            el.className = 'knob';
            el.tabIndex = 0;
            el.setAttribute('role', 'slider');
            el.setAttribute('aria-label', this.o.label);
            el.title = 'Scroll ou arraste · ⌥ fino · ⇧ rápido · duplo clique = padrão';
            el.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle class="k-body" cx="32" cy="32" r="18.5"/>
                    <path class="k-track" d="${KNOB_ARC}" pathLength="100"/>
                    <path class="k-arc" d="${KNOB_ARC}" pathLength="100"/>
                    <line class="k-ptr" x1="32" y1="18.5" x2="32" y2="25.5"/>
                </svg><div class="k-val"></div><div class="k-lbl"></div>`;
            el.querySelector('.k-lbl').textContent = this.o.label;
            host.appendChild(el);
            this.el = el;
            this.arc = el.querySelector('.k-arc');
            this.ptr = el.querySelector('.k-ptr');
            this.valEl = el.querySelector('.k-val');
            this.anim = { p: this.pct(this.v) };
            this.paint(this.anim.p);
            this.text();

            el.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
            el.addEventListener('pointerdown', (e) => this.onDrag(e));
            el.addEventListener('dblclick', () => this.set(this.def));
            el.addEventListener('keydown', (e) => this.onKey(e));
        }

        pct(v) { return (v - this.o.min) / (this.o.max - this.o.min || 1); }

        paint(p) {
            p = clamp(p, 0, 1);
            this.ptr.setAttribute('transform', `rotate(${-135 + p * 270} 32 32)`);
            const from = this.o.bipolar ? Math.min(p, 0.5) : 0;
            const to = this.o.bipolar ? Math.max(p, 0.5) : p;
            this.arc.style.strokeDasharray = `${(to - from) * 100} 100`;
            this.arc.style.strokeDashoffset = `${-from * 100}`;
            this.arc.style.opacity = to - from < 0.005 ? '0' : '1';
        }

        text() {
            this.valEl.textContent = this.o.format(this.v);
            this.el.setAttribute('aria-valuenow', String(this.v));
        }

        set(v, { silent = false, animate = true } = {}) {
            const { min, max, step } = this.o;
            v = clamp(+(Math.round(v / step) * step).toFixed(6), min, max);
            const changed = v !== this.v;
            this.v = v;
            this.text();
            const p = this.pct(v);
            if (hasGsap && animate) {
                gsap.to(this.anim, { p, duration: 0.55, ease: EASE, overwrite: true, onUpdate: () => this.paint(this.anim.p) });
            } else {
                if (hasGsap) gsap.killTweensOf(this.anim);
                this.anim.p = p;
                this.paint(p);
            }
            if (changed && !silent) this.o.onChange?.(v, this);
            return v;
        }

        setRange(min, max) {
            this.o.min = min;
            this.o.max = max;
            this.set(this.v, { silent: true, animate: false });
        }

        disable(off) { this.el.classList.toggle('is-disabled', !!off); }

        increment(e) {
            const base = this.o.wheel ?? this.o.step;
            if (e.altKey) return Math.max(this.o.step, base / 10);
            return e.shiftKey ? base * 10 : base;
        }

        onWheel(e) {
            e.preventDefault();
            let d = e.deltaY || e.deltaX; // ⇧ + roda vira deltaX no macOS
            if (e.deltaMode === 1) d *= 33;
            this.acc += d;
            const steps = Math.trunc(this.acc / 40);
            if (!steps) return;
            this.acc -= steps * 40;
            this.set(this.v - steps * this.increment(e)); // rolar para cima aumenta
        }

        onDrag(e) {
            if (e.button !== 0) return;
            e.preventDefault();
            this.el.focus({ preventScroll: true });
            this.el.setPointerCapture(e.pointerId);
            this.el.classList.add('is-drag');
            const y0 = e.clientY;
            const x0 = e.clientX;
            const v0 = this.v;
            const range = this.o.max - this.o.min;
            const move = (ev) => {
                const delta = (y0 - ev.clientY) + (ev.clientX - x0) * 0.5;
                this.set(v0 + (delta / 180) * range * (ev.shiftKey ? 0.15 : 1), { animate: false });
            };
            const up = () => {
                this.el.classList.remove('is-drag');
                this.el.removeEventListener('pointermove', move);
                this.el.removeEventListener('pointerup', up);
                this.el.removeEventListener('pointercancel', up);
            };
            this.el.addEventListener('pointermove', move);
            this.el.addEventListener('pointerup', up);
            this.el.addEventListener('pointercancel', up);
        }

        onKey(e) {
            const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
            if (dir) {
                e.preventDefault();
                this.set(this.v + dir * this.increment(e));
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                this.set(e.key === 'Home' ? this.o.min : this.o.max);
            }
        }
    }

    // ---------- Linha do tempo com recorte ----------
    class RangeTimeline {
        constructor(root, options = {}) {
            this.root = root;
            this.o = options;
            this.d = 0;
            this.a = 0;
            this.b = 0;
            this.t = 0;
            this.min = options.min ?? 0.05;
            root.classList.add('rt');
            root.innerHTML = `<div class="rt-bg"></div><div class="rt-shade rt-shade-l"></div><div class="rt-shade rt-shade-r"></div>
                <div class="rt-sel"></div>
                <div class="rt-handle rt-in" data-h="a" title="Início (I)"><span></span></div>
                <div class="rt-handle rt-out" data-h="b" title="Fim (O)"><span></span></div>
                <div class="rt-head"><span></span></div>`;
            this.bg = $('.rt-bg', root);
            this.shadeL = $('.rt-shade-l', root);
            this.shadeR = $('.rt-shade-r', root);
            this.sel = $('.rt-sel', root);
            this.hA = $('.rt-in', root);
            this.hB = $('.rt-out', root);
            this.head = $('.rt-head', root);
            root.addEventListener('pointerdown', (e) => this.onDown(e));
        }

        setDuration(d) {
            this.d = d;
            this.a = 0;
            this.b = d;
            this.t = 0;
            this.layout();
        }

        resize(d) {
            this.d = d;
            this.a = clamp(this.a, 0, d);
            this.b = clamp(this.b, 0, d);
            this.t = clamp(this.t, 0, d);
            this.layout();
        }

        setRange(a, b, which) {
            const d = this.d;
            a = clamp(a, 0, d);
            b = clamp(b, 0, d);
            if (b - a < this.min) {
                if (which === 'a') a = Math.max(0, b - this.min);
                else b = Math.min(d, a + this.min);
            }
            this.a = a;
            this.b = b;
            this.layout();
            if (which) this.o.onRange?.(a, b, which);
        }

        setTime(t) {
            this.t = clamp(t, 0, this.d);
            this.head.style.left = `${this.pc(this.t)}%`;
        }

        pc(t) { return this.d ? (t / this.d) * 100 : 0; }

        layout() {
            const pa = this.pc(this.a);
            const pb = this.pc(this.b);
            this.shadeL.style.width = `${pa}%`;
            this.shadeR.style.width = `${100 - pb}%`;
            this.sel.style.left = `${pa}%`;
            this.sel.style.width = `${pb - pa}%`;
            this.hA.style.left = `${pa}%`;
            this.hB.style.left = `${pb}%`;
            this.head.style.left = `${this.pc(this.t)}%`;
        }

        timeAt(x) {
            const r = this.root.getBoundingClientRect();
            return clamp((x - r.left) / r.width, 0, 1) * this.d;
        }

        onDown(e) {
            if (!this.d || e.button !== 0) return;
            e.preventDefault();
            const handle = e.target.closest('.rt-handle')?.dataset.h || 'seek';
            const grab = handle === 'a' ? this.timeAt(e.clientX) - this.a : handle === 'b' ? this.timeAt(e.clientX) - this.b : 0;
            this.root.setPointerCapture(e.pointerId);
            const move = (ev) => {
                const t = this.timeAt(ev.clientX) - grab;
                if (handle === 'a') this.setRange(t, this.b, 'a');
                else if (handle === 'b') this.setRange(this.a, t, 'b');
                else { this.setTime(t); this.o.onSeek?.(t); }
            };
            const up = () => {
                this.root.removeEventListener('pointermove', move);
                this.root.removeEventListener('pointerup', up);
                this.root.removeEventListener('pointercancel', up);
                this.o.onEnd?.(handle);
            };
            this.o.onStart?.(handle);
            if (handle === 'seek') move(e);
            this.root.addEventListener('pointermove', move);
            this.root.addEventListener('pointerup', up);
            this.root.addEventListener('pointercancel', up);
        }
    }

    // ---------- Trechos: cortar, remover (os lados se juntam) e mover — usado no Áudio e no Vídeo ----------
    // Os trechos guardam início/fim no arquivo original, em unidades inteiras (amostras no áudio, ms no vídeo).
    // A ferramenta informa como tocar/posicionar pelos hooks e remonta a mídia em changed(same, t).
    const fmtLen = (sec) => (sec < 60 ? `${sec.toFixed(sec < 10 ? 2 : 1)}s` : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`);

    class PieceTrack {
        constructor(tl, hooks) {
            this.tl = tl;
            this.h = hooks;
            this.pieces = [];
            this.sel = null;
            this.hover = null;
            this.undo = [];
            this.redo = [];
            this.seq = 0;
            tl.root.classList.add('has-pieces');
            this.lane = document.createElement('div');
            this.lane.className = 'pieces';
            tl.root.appendChild(this.lane);
            this.marker = document.createElement('div');
            this.marker.className = 'pieces-drop';
            this.lane.addEventListener('pointerdown', (e) => this.onDown(e));
            this.lane.addEventListener('click', (e) => this.onClick(e));
            tl.root.addEventListener('pointermove', (e) => this.setHover(this.at(e.clientX)?.id ?? null));
            tl.root.addEventListener('pointerleave', () => this.setHover(null));
        }

        get rate() { return this.h.rate(); }

        reset(length) {
            this.pieces = [{ id: ++this.seq, s: 0, e: length }];
            this.sel = null;
            this.hover = null;
            this.undo.length = 0;
            this.redo.length = 0;
        }

        total() { return this.pieces.reduce((n, p) => n + p.e - p.s, 0); }

        indexOf(id) { return this.pieces.findIndex((p) => p.id === id); }

        layout() {
            let o = 0;
            return this.pieces.map((p) => {
                const item = { p, o, len: p.e - p.s };
                o += item.len;
                return item;
            });
        }

        at(clientX) {
            if (!this.pieces.length) return null;
            const r = this.tl.root.getBoundingClientRect();
            const T = clamp((clientX - r.left) / r.width, 0, 0.99999) * this.total();
            const hit = this.layout().find((it) => T >= it.o && T < it.o + it.len);
            return hit ? hit.p : null;
        }

        // Trechos finais em segundos do original, já limitados ao recorte [a, b] e com os contínuos unidos
        segments(a, b) {
            const r = this.rate;
            const out = [];
            for (const it of this.layout()) {
                const o0 = it.o / r;
                const o1 = (it.o + it.len) / r;
                const s = Math.max(o0, a);
                const e = Math.min(o1, b);
                if (e - s <= 1e-6) continue;
                const seg = [it.p.s / r + (s - o0), it.p.s / r + (e - o0)];
                const last = out[out.length - 1];
                if (last && Math.abs(last[1] - seg[0]) < 1e-6) last[1] = seg[1];
                else out.push(seg);
            }
            return out;
        }

        snapshot() {
            const { a, b } = this.h.getRange();
            return { pieces: this.pieces.map((p) => ({ ...p })), a, b, sel: this.sel };
        }

        // Toda edição passa por aqui: guarda o desfazer e mantém o "Fim" colado no final se ele estava lá
        commit(mutate, same = false, at = null) {
            const before = this.snapshot();
            const atEnd = before.b >= this.total() / this.rate - 0.001;
            const result = mutate();
            this.undo.push(before);
            if (this.undo.length > 80) this.undo.shift();
            this.redo.length = 0;
            if (result === 'full') this.h.setRange(0, Infinity);
            else if (atEnd) this.h.setRange(before.a, Infinity);
            this.h.changed(same, typeof at === 'function' ? at() : at);
        }

        restore(snap) {
            this.pieces = snap.pieces.map((p) => ({ ...p }));
            this.sel = snap.sel;
            this.h.setRange(snap.a, snap.b);
            this.h.changed(false, null);
        }

        undoEdit() {
            if (!this.undo.length) return;
            this.redo.push(this.snapshot());
            this.restore(this.undo.pop());
            notify('Desfeito');
        }

        redoEdit() {
            if (!this.redo.length) return;
            this.undo.push(this.snapshot());
            this.restore(this.redo.pop());
            notify('Refeito');
        }

        // Cortar: divide na agulha e também nas alças azuis, se elas foram puxadas — o trecho entre
        // as alças vira uma peça própria (pronta para × ou para mover). O conteúdo não muda: dá para cortar tocando.
        cut() {
            const r = this.rate;
            const margin = Math.round(r * 0.02);
            const { a, b } = this.h.getRange();
            const end = this.total() / r;
            const inside = (T) => this.layout().some((it) => T > it.o + margin && T < it.o + it.len - margin);
            const times = [this.h.position()];
            if (a > 0.02) times.push(a);
            if (b < end - 0.02) times.push(b);
            const points = [...new Set(times.map((t) => Math.round(t * r)))].filter(inside).sort((x, y) => x - y);
            if (!points.length) {
                notify('Clique na linha do tempo para pôr a agulha onde quer cortar');
                this.h.nudge?.();
                return;
            }
            const pick = a > 0.02 && points.includes(Math.round(a * r)) ? Math.round(a * r) : Math.round(this.h.position() * r);
            this.commit(() => {
                for (const T of points) {
                    const hit = this.layout().find((it) => T > it.o + margin && T < it.o + it.len - margin);
                    if (!hit) continue;
                    const cutAt = hit.p.s + (T - hit.o);
                    const left = { id: ++this.seq, s: hit.p.s, e: cutAt };
                    const right = { id: ++this.seq, s: cutAt, e: hit.p.e };
                    this.pieces.splice(this.pieces.indexOf(hit.p), 1, left, right);
                }
                const chosen = this.layout().find((it) => it.o === pick) || this.layout().find((it) => pick > it.o && pick < it.o + it.len);
                this.sel = chosen ? chosen.p.id : null;
            }, true);
            points.forEach((T) => this.flash(T / r));
            if (points.length > 1) notify(`${points.length} cortes — o trecho entre as alças está selecionado`);
        }

        remove(id) {
            if (this.pieces.length < 2) { notify('É o único trecho — use as alças azuis para recortar as pontas'); return; }
            const i = this.indexOf(id);
            if (i < 0) return;
            const it = this.layout()[i];
            const t = it.o / this.rate; // agulha fica na emenda
            // se as alças marcavam exatamente este trecho, elas voltam a cobrir tudo
            const { a, b } = this.h.getRange();
            const wasRange = Math.abs(a - it.o / this.rate) < 0.002 && Math.abs(b - (it.o + it.len) / this.rate) < 0.002;
            this.commit(() => { this.pieces.splice(i, 1); this.sel = null; return wasRange ? 'full' : null; }, false, t);
            notify('Trecho removido — os lados foram unidos');
        }

        move(id, to) {
            const from = this.indexOf(id);
            to = clamp(to, 0, this.pieces.length - 1);
            if (from < 0 || from === to) return;
            this.commit(() => {
                const [p] = this.pieces.splice(from, 1);
                this.pieces.splice(to, 0, p);
                this.sel = id;
            }, false, () => this.layout()[to].o / this.rate);
        }

        select(id) {
            this.sel = id;
            const it = this.layout().find((x) => x.p.id === id);
            if (it) this.h.select(it.o / this.rate);
            this.mark();
            this.h.draw();
        }

        deselect() {
            if (this.sel == null) return false;
            this.sel = null;
            this.mark();
            this.h.draw();
            return true;
        }

        setHover(id) {
            if (this.hover === id) return;
            this.hover = id;
            this.mark();
            this.h.draw();
        }

        mark() {
            $$('.piece', this.lane).forEach((el) => {
                const id = +el.dataset.id;
                el.classList.toggle('is-sel', id === this.sel);
                el.classList.toggle('is-hover', id === this.hover && this.pieces.length > 1);
            });
        }

        render(animate) {
            if (!this.pieces.length) return;
            const before = {};
            if (animate && hasGsap) $$('.piece', this.lane).forEach((el) => { before[el.dataset.id] = el.getBoundingClientRect().left; });
            const total = this.total();
            const width = this.lane.getBoundingClientRect().width || 1;
            const items = this.layout();
            this.lane.innerHTML = '';
            items.forEach((it, i) => {
                const el = document.createElement('div');
                const px = (it.len / total) * width;
                el.className = `piece${px < 96 ? ' is-narrow' : ''}${px < 44 ? ' is-tiny' : ''}`;
                el.dataset.id = it.p.id;
                el.style.left = `${(it.o / total) * 100}%`;
                el.style.width = `${(it.len / total) * 100}%`;
                el.innerHTML = items.length === 1
                    ? '<div class="piece-chip is-hint"><i class="fas fa-scissors"></i> Trecho único · <b>Cortar</b> divide na agulha</div>'
                    : `<div class="piece-chip" title="Arraste para mover este trecho">
                            <button class="pc-btn" data-act="left" title="Mover para a esquerda"${i === 0 ? ' disabled' : ''}><i class="fas fa-chevron-left"></i></button>
                            <span class="pc-label"><i class="fas fa-grip-vertical"></i><b>${i + 1}</b><span class="pc-dur">${fmtLen(it.len / this.rate)}</span></span>
                            <button class="pc-btn" data-act="right" title="Mover para a direita"${i === items.length - 1 ? ' disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                            <button class="pc-btn pc-del" data-act="del" title="Remover trecho — os lados se juntam (Delete)"><i class="fas fa-xmark"></i></button>
                        </div>`;
                this.lane.appendChild(el);
            });
            this.lane.appendChild(this.marker);
            this.mark();
            if (animate && hasGsap) {
                $$('.piece', this.lane).forEach((el) => {
                    const old = before[el.dataset.id];
                    if (old === undefined) gsap.from(el, { opacity: 0, y: 6, duration: 0.5, ease: EASE, clearProps: 'opacity,transform' });
                    else {
                        const dx = old - el.getBoundingClientRect().left;
                        if (Math.abs(dx) > 0.5) gsap.from(el, { x: dx, duration: 0.6, ease: EASE, clearProps: 'transform' });
                    }
                });
            }
        }

        flash(t) {
            if (!hasGsap) return;
            const f = document.createElement('span');
            f.className = 'cut-flash';
            f.style.left = `${(t / (this.total() / this.rate)) * 100}%`;
            this.tl.root.appendChild(f);
            gsap.fromTo(f, { scaleY: 0.2, opacity: 1 }, { scaleY: 1, opacity: 0, duration: 0.9, ease: EASE, onComplete: () => f.remove() });
        }

        onClick(e) {
            const btn = e.target.closest('.pc-btn');
            if (!btn || btn.disabled) return;
            const id = +btn.closest('.piece').dataset.id;
            if (btn.dataset.act === 'del') this.remove(id);
            else this.move(id, this.indexOf(id) + (btn.dataset.act === 'left' ? -1 : 1));
        }

        // Arrastar o número do trecho: a linha azul mostra onde ele vai entrar
        dropIndex(id, clientX) {
            const r = this.lane.getBoundingClientRect();
            const frac = (clientX - r.left) / r.width;
            const total = this.total();
            return this.layout().filter((it) => it.p.id !== id && (it.o + it.len / 2) / total < frac).length;
        }

        onDown(e) {
            e.stopPropagation(); // a faixa não conta como clique de busca na linha do tempo
            const el = e.target.closest('.piece');
            if (!el || e.button !== 0 || e.target.closest('.pc-btn') || this.pieces.length < 2) return;
            e.preventDefault();
            const id = +el.dataset.id;
            const x0 = e.clientX;
            let dragging = false;
            let target = this.indexOf(id);
            try { el.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
            const move = (ev) => {
                const dx = ev.clientX - x0;
                if (!dragging && Math.abs(dx) < 4) return;
                if (!dragging) {
                    dragging = true;
                    el.classList.add('is-drag');
                    if (this.h.playing()) this.h.pause();
                }
                el.style.transform = `translateX(${dx}px)`;
                target = this.dropIndex(id, ev.clientX);
                const others = this.layout().filter((it) => it.p.id !== id);
                const edge = target === 0 ? others[0].o : others[target - 1].o + others[target - 1].len;
                this.marker.style.left = `${(edge / this.total()) * 100}%`;
                this.marker.style.opacity = '1';
            };
            const up = () => {
                el.removeEventListener('pointermove', move);
                el.removeEventListener('pointerup', up);
                el.removeEventListener('pointercancel', up);
                el.classList.remove('is-drag');
                this.marker.style.opacity = '0';
                if (!dragging) { this.select(id); return; }
                if (target !== this.indexOf(id)) this.move(id, target);
                else if (hasGsap) gsap.to(el, { x: 0, duration: 0.5, ease: EASE, onComplete: () => { el.style.transform = ''; } });
                else el.style.transform = '';
            };
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
        }

        // Atalhos comuns: C corta, Delete remove, Esc solta a seleção, ⌘Z / ⇧⌘Z
        key(e) {
            const k = e.key.toLowerCase();
            if (e.metaKey || e.ctrlKey) {
                if (k !== 'z') return false;
                if (e.shiftKey) this.redoEdit(); else this.undoEdit();
                return true;
            }
            if (k === 'c') { this.cut(); return true; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel != null) { this.remove(this.sel); return true; }
            if (e.key === 'Escape') return this.deselect();
            return false;
        }
    }

    // Miniaturas do vídeo no fundo da linha do tempo
    async function filmstrip(host, url, job) {
        host.innerHTML = '';
        const rect = host.getBoundingClientRect();
        if (!rect.width) return false;
        const v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'auto';
        v.src = url;
        try { await waitEvent(v, 'loadeddata', 10000); } catch { return false; }
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const h = Math.round(rect.height * dpr);
        const ratio = v.videoWidth / v.videoHeight || 16 / 9;
        const tileW = Math.max(8, Math.round(h * ratio));
        const n = clamp(Math.ceil((rect.width * dpr) / tileW), 1, 40);
        const canvas = document.createElement('canvas');
        canvas.width = n * tileW;
        canvas.height = h;
        host.appendChild(canvas);
        const g = canvas.getContext('2d');
        const duration = Number.isFinite(v.duration) ? v.duration : job.duration;
        for (let i = 0; i < n; i++) {
            if (job.cancelled) break;
            v.currentTime = ((i + 0.5) / n) * duration;
            try { await waitEvent(v, 'seeked', 5000); } catch { continue; }
            g.drawImage(v, i * tileW, 0, tileW, h);
        }
        v.removeAttribute('src');
        v.load();
        return true;
    }

    // Alguns WebM (ex.: gravados no navegador) chegam com duração Infinity
    async function ensureDuration(v) {
        if (Number.isFinite(v.duration)) return v.duration;
        v.currentTime = 1e7;
        try { await waitEvent(v, 'durationchange', 4000); } catch { /* segue com o que tiver */ }
        const d = v.duration;
        v.currentTime = 0;
        return Number.isFinite(d) ? d : 0;
    }


    /* =====================================================================
       Imagens — conversão e otimização em lote
       ===================================================================== */
    (() => {
        const panel = $('#images');
        const listEl = $('#img-list');
        const card = $('#img-list-card');
        const summary = $('#img-summary');
        const stopBtn = $('#img-stop');
        stopBtn.addEventListener('click', () => {
            if (S.items.some((i) => i.status === 'wait' || i.status === 'busy')) {
                // Para: o que já ficou pronto continua; o resto fica marcado como parado
                clearTimeout(timer);
                S.run++;
                S.items.forEach((i) => { if (i.status === 'wait' || i.status === 'busy') { i.status = 'stopped'; paintRow(i); } });
                updateSummary();
            } else {
                S.resume = true; // continua só as paradas
                schedule(0);
            }
        });
        const zipBtn = $('#img-zip');
        const EXT = { webp: 'webp', jpeg: 'jpg', png: 'png', svg: 'svg' };
        const MIME = { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' };
        const HINTS = {
            webp: 'Melhor relação tamanho × qualidade para web. Mantém transparência.',
            jpeg: 'Para fotos. Áreas transparentes recebem a cor de fundo.',
            png: 'Transparente. Reduzir cores (quantização) diminui muito o arquivo.',
            svg: 'Vetoriza a imagem (tracing). Ideal para logos, ícones e ilustrações chapadas — não para fotos.'
        };
        const SVG_DETAIL = {
            low: { ltres: 2, qtres: 2, pathomit: 16 },
            mid: { ltres: 1, qtres: 1, pathomit: 8 },
            high: { ltres: 0.5, qtres: 0.5, pathomit: 2 }
        };
        const S = { items: [], fmt: 'webp', quality: 82, maxW: 0, maxH: 0, strip: false, numbering: 'none', numPos: 'before', numStart: 1, targetKB: 0, bg: '#ffffff', pngColors: 256, svgColors: 8, svgDetail: 'mid', run: 0, sel: null };
        let seq = 0;
        let timer = 0;

        initSeg($('#img-format'), (v) => { S.fmt = v; syncOptions(); markDirty(); });
        initSeg($('#img-svg-detail'), (v) => { S.svgDetail = v; markDirty(); });
        new Knob($('#img-quality-knob'), { label: 'Qualidade', min: 10, max: 100, step: 1, value: 82, format: (v) => `${v}%`, onChange: (v) => { S.quality = v; markDirty(); } });
        $('#img-maxw').addEventListener('input', (e) => { const v = parseInt(e.target.value, 10); S.maxW = v > 0 ? v : 0; markDirty(); });
        $('#img-maxh').addEventListener('input', (e) => { const v = parseInt(e.target.value, 10); S.maxH = v > 0 ? v : 0; markDirty(); });
        $('#img-dens').addEventListener('change', (e) => { S.dens = Number(e.target.value) || 1; markDirty(); });
        initSeg($('#img-strip'), (v) => { S.strip = v === 'strip'; paintNames(); });
        initSeg($('#img-numbering'), (v) => { S.numbering = v; $('#img-num-opts').classList.toggle('is-hidden', v === 'none'); segs.forEach((x) => x.refresh()); paintNames(); });
        initSeg($('#img-num-pos'), (v) => { S.numPos = v; paintNames(); });
        $('#img-num-start').addEventListener('input', (e) => { const v = parseInt(e.target.value, 10); S.numStart = v >= 0 ? v : 1; paintNames(); });
        $('#img-target').addEventListener('input', (e) => { const v = parseFloat(e.target.value); S.targetKB = v > 0 ? v : 0; markDirty(); });
        $('#img-bg').addEventListener('input', (e) => { S.bg = e.target.value; markDirty(); });
        $('#img-png-colors').addEventListener('change', (e) => { S.pngColors = +e.target.value; markDirty(); });
        $('#img-svg-colors').addEventListener('change', (e) => { S.svgColors = +e.target.value; markDirty(); });
        const regenBtn = $('#img-regen');
        regenBtn.addEventListener('click', () => { S.only = null; schedule(0); });

        // Mudou alguma configuração: não reconverte sozinho, mostra "Gerar novamente"
        function markDirty() {
            if (!S.items.length) return;
            S.dirty = true;
            updateDirty();
        }
        function updateDirty() {
            const show = !!S.dirty && S.items.length > 0;
            const wasHidden = regenBtn.classList.contains('is-hidden');
            regenBtn.classList.toggle('is-hidden', !show);
            regenBtn.classList.toggle('is-pulse', show);
            if (show && wasHidden && hasGsap) gsap.from(regenBtn, { scale: 0.85, opacity: 0, duration: 0.6, ease: EASE, clearProps: 'transform,opacity' });
        }
        bindDrop($('#img-drop'), $('#img-input'), addFiles);
        zipBtn.addEventListener('click', downloadAll);
        $('#img-clear').addEventListener('click', clearAll);
        syncOptions();

        function syncOptions() {
            $$('[data-for]', panel).forEach((el) => el.classList.toggle('is-hidden', !el.dataset.for.split(' ').includes(S.fmt)));
            $('#img-format-hint').textContent = HINTS[S.fmt];
            segs.forEach((s) => s.refresh());
        }

        function addFiles(files) {
            const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif|avif|tiff?|ico|bmp|svg)$/i.test(f.name));
            if (!images.length) { notify('Nenhuma imagem reconhecida'); return; }
            card.classList.remove('is-hidden');
            const rows = images.map((file) => {
                const item = { id: ++seq, file, name: file.name, size: file.size, status: 'wait' };
                item.el = renderRow(item);
                S.items.push(item);
                listEl.appendChild(item.el);
                return item.el;
            });
            if (hasGsap) gsap.from(rows, { opacity: 0, y: 12, duration: 0.7, ease: EASE, stagger: 0.04, clearProps: 'opacity,transform' });
            if (!S.sel) select(S.items[S.items.length - rows.length]);
            paintNames();
            updateSummary();
            const fresh = S.items.slice(S.items.length - rows.length);
            S.only = new Set([...fresh, ...S.items.filter((it) => it.status === 'wait' || it.status === 'busy'), ...(S.only || [])]);
            schedule(0);
        }

        function renderRow(item) {
            const row = document.createElement('div');
            row.className = 'img-row';
            row.dataset.st = 'wait';
            row.innerHTML = `<span class="img-dot" aria-hidden="true"></span><div class="img-thumb checker"><img alt=""></div>
                <div class="min-w-0">
                    <div class="img-name"></div>
                    <div class="img-meta"><span class="m-in"></span><i class="fas fa-arrow-right"></i><span class="m-out">na fila…</span><span class="delta"></span></div>
                </div>
                <div class="img-actions">
                    <button class="btn btn-icon" data-act="dl" title="Baixar" disabled><i class="fas fa-download"></i></button>
                    <button class="btn btn-icon" data-act="rm" title="Remover"><i class="fas fa-xmark"></i></button>
                </div>`;
            $('.img-name', row).textContent = item.name;
            $('.img-name', row).title = item.name;
            $('.m-in', row).textContent = fmtBytes(item.size);
            row.addEventListener('click', (e) => {
                const act = e.target.closest('[data-act]')?.dataset.act;
                if (act === 'dl' && item.out) downloadBlob(item.out.blob, outputNames().get(item));
                else if (act === 'rm') removeItem(item);
                else if (!act) select(item);
            });
            return row;
        }

        // Nome final de cada arquivo: retirar números, numerar (crescente/decrescente) e evitar repetidos
        function outputNames() {
            const names = new Map();
            const used = new Set();
            const n = S.items.length;
            const width = String(S.numStart + Math.max(0, n - 1)).length;
            S.items.forEach((it, i) => {
                let base = baseName(it.name);
                if (S.strip) {
                    base = base.replace(/\d+/g, '').replace(/([\s_.-])[\s_.-]*/g, '$1').replace(/^[\s_.-]+|[\s_.-]+$/g, '') || 'imagem';
                }
                if (S.numbering !== 'none') {
                    const num = String(S.numStart + (S.numbering === 'asc' ? i : n - 1 - i)).padStart(width, '0');
                    base = S.numPos === 'before' ? `${num}-${base}` : `${base}-${num}`;
                }
                const ext = it.out?.ext || EXT[S.fmt];
                let name = `${base}.${ext}`;
                for (let k = 2; used.has(name.toLowerCase()); k++) name = `${base}-${k}.${ext}`;
                used.add(name.toLowerCase());
                names.set(it, name);
            });
            return names;
        }

        function paintNames() {
            const names = outputNames();
            S.items.forEach((it) => {
                const el = $('.img-name', it.el);
                const name = names.get(it);
                el.innerHTML = '';
                el.append(it.name);
                if (name !== it.name) {
                    const span = document.createElement('span');
                    span.className = 'img-rename';
                    span.textContent = ` ${name}`;
                    el.append(span);
                }
                el.title = name;
            });
        }

        function removeItem(item) {
            S.items = S.items.filter((i) => i !== item);
            if (S.sel === item) select(S.items[0] || null);
            const done = () => {
                item.el.remove();
                paintNames();
                if (item.srcUrl) URL.revokeObjectURL(item.srcUrl);
                if (item.out) URL.revokeObjectURL(item.out.url);
                updateSummary();
            };
            if (hasGsap) gsap.to(item.el, { opacity: 0, x: 16, duration: 0.4, ease: EASE, onComplete: done });
            else done();
        }

        function clearAll() {
            S.run++;
            S.only = null;
            S.dirty = false;
            updateDirty();
            [...S.items].forEach(removeItem);
        }

        function schedule(delay = 350) {
            if (delay !== 0 || !S.resume) S.resume = false;
            clearTimeout(timer);
            S.run++;
            timer = setTimeout(processAll, delay);
        }

        async function processAll() {
            const run = ++S.run;
            const resume = S.resume;
            S.resume = false;
            // só = arquivos recém-adicionados; sem isso, reconverte tudo (Gerar novamente) e limpa o "desatualizado"
            const only = S.only;
            if (!only && !resume) { S.dirty = false; updateDirty(); }
            const skip = (it) => it.status === 'bad' || (resume && it.status === 'done') || (only && !only.has(it));
            S.items.forEach((it) => { if (!skip(it)) { it.status = 'wait'; paintRow(it); } });
            cmpTags();
            updateSummary();
            for (const it of S.items) {
                if (run !== S.run) return;
                if (skip(it)) continue;
                it.status = 'busy';
                paintRow(it);
                await nextFrame();
                try {
                    if (!it.img) await decode(it);
                    const out = await convert(it, run);
                    if (run !== S.run) return;
                    if (it.out) URL.revokeObjectURL(it.out.url);
                    it.out = out;
                    it.status = 'done';
                } catch (err) {
                    if (run !== S.run) return;
                    it.status = it.img ? 'error' : 'bad';
                    it.error = err.message;
                }
                paintRow(it);
                if (it.status === 'done') paintNames();
                if (it === S.sel) cmpUpdate();
                updateSummary();
            }
            if (only && run === S.run) S.only = null;
            updateSummary();
        }

        // Espera o "load" em vez de img.decode(): o decode() fica pendente com a aba em segundo plano
        const loadImage = (url) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('imagem inválida'));
            img.src = url;
        });

        async function decode(it) {
            const url = URL.createObjectURL(it.file);
            let img;
            try {
                img = await loadImage(url);
            } catch {
                URL.revokeObjectURL(url);
                throw new Error('Formato não suportado por este navegador');
            }
            it.img = img;
            it.srcUrl = url;
            it.w = img.naturalWidth || 1024;
            it.h = img.naturalHeight || 1024;
            $('img', it.el).src = url;
            $('.m-in', it.el).textContent = `${it.w}×${it.h} · ${fmtBytes(it.size)}`;
            if (it === S.sel) requestDraw();
        }

        // Redução em etapas de 50% para manter a nitidez em reduções grandes
        function drawScaled(img, sw, sh, tw, th, bg) {
            let src = img;
            let cw = sw;
            let ch = sh;
            while (cw / 2 >= tw && ch / 2 >= th && cw > 2 && ch > 2) {
                const c = document.createElement('canvas');
                c.width = Math.round(cw / 2);
                c.height = Math.round(ch / 2);
                const g = c.getContext('2d');
                g.imageSmoothingQuality = 'high';
                g.drawImage(src, 0, 0, c.width, c.height);
                src = c;
                cw = c.width;
                ch = c.height;
            }
            const out = document.createElement('canvas');
            out.width = tw;
            out.height = th;
            const g = out.getContext('2d', { willReadFrequently: true });
            if (bg) { g.fillStyle = bg; g.fillRect(0, 0, tw, th); }
            g.imageSmoothingQuality = 'high';
            g.drawImage(src, 0, 0, tw, th);
            return out;
        }

        const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao codificar'))), type, quality);
        });

        async function convert(it, run) {
            let w = it.w;
            let h = it.h;
            // Cabe dentro de largura × altura máximas mantendo a proporção (nunca aumenta)
            const fitK = Math.min(1, S.maxW ? S.maxW / w : 1, S.maxH ? S.maxH / h : 1) * (S.dens || 1);
            if (fitK < 1) { w = Math.max(1, Math.round(w * fitK)); h = Math.max(1, Math.round(h * fitK)); }
            let blob;
            if (S.fmt === 'svg') {
                const limit = 1200; // tracing acima disso fica lento e gera paths demais
                const k = Math.min(1, limit / Math.max(w, h));
                const tw = Math.max(1, Math.round(w * k));
                const th = Math.max(1, Math.round(h * k));
                const canvas = drawScaled(it.img, it.w, it.h, tw, th);
                await loadScript(LIB.tracer);
                if (run !== S.run) throw new Error('cancelado');
                const data = canvas.getContext('2d').getImageData(0, 0, tw, th);
                let svg = window.ImageTracer.imagedataToSVG(data, {
                    ...SVG_DETAIL[S.svgDetail], numberofcolors: S.svgColors, colorsampling: 2, colorquantcycles: 3,
                    blurradius: 0, strokewidth: 1, roundcoords: 1, viewbox: true, desc: false
                });
                svg = svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
                blob = new Blob([svg], { type: 'image/svg+xml' });
                return { blob, url: URL.createObjectURL(blob), size: blob.size, w, h, name: `${baseName(it.name)}.${EXT[S.fmt]}`, ext: EXT[S.fmt], note: '', fit: true };
            }

            const png = S.fmt === 'png';
            const canvases = new Map();
            const canvasAt = (cw, ch) => {
                const key = `${cw}x${ch}`;
                if (!canvases.has(key)) canvases.set(key, drawScaled(it.img, it.w, it.h, cw, ch, S.fmt === 'jpeg' ? S.bg : null));
                return canvases.get(key);
            };
            const encode = async (cw, ch, q, colors) => {
                if (run !== S.run) throw new Error('cancelado');
                const canvas = canvasAt(cw, ch);
                if (png) {
                    await loadScript(LIB.pako);
                    await loadScript(LIB.upng);
                    const data = canvas.getContext('2d').getImageData(0, 0, cw, ch);
                    return new Blob([window.UPNG.encode([data.data.buffer], cw, ch, colors)], { type: 'image/png' });
                }
                const b = await canvasBlob(canvas, MIME[S.fmt], q / 100);
                if (b.type !== MIME[S.fmt]) throw new Error(`Este navegador não gera ${S.fmt === 'webp' ? 'WebP' : 'JPG'} — use o Chrome`);
                return b;
            };

            const target = S.targetKB > 0 ? S.targetKB * 1024 : 0;
            let best;
            let fit = true;
            if (!target) {
                best = { blob: await encode(w, h, S.quality, S.pngColors), v: null, w, h, scale: 1 };
            } else {
                // Fase 1: qualidade em degraus a partir da escolhida (no PNG, cores). Busca binária não funciona:
                // o tamanho não cai de forma previsível com a qualidade.
                const steps = png
                    ? [S.pngColors, 256, 128, 64, 32, 16].filter((c, i, a) => a.indexOf(c) === i && (c === S.pngColors || (c > 0 && (S.pngColors === 0 || c < S.pngColors))))
                    : [S.quality, 90, 80, 70, 60, 50, 40, 30, 20, 10].filter((q, i, a) => a.indexOf(q) === i && q <= S.quality);
                fit = false;
                for (const v of steps) {
                    const b = await encode(w, h, png ? 100 : v, png ? v : 0);
                    if (!best || b.size < best.blob.size) best = { blob: b, v, w, h, scale: 1 };
                    if (b.size <= target) { best = { blob: b, v, w, h, scale: 1 }; fit = true; break; }
                }
                // Fase 2: se nem a menor qualidade coube, reduz as dimensões
                if (!fit) {
                    const v = png ? steps[steps.length - 1] : Math.min(S.quality, 70);
                    for (const sc of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2]) {
                        const cw = Math.max(1, Math.round(w * sc));
                        const ch = Math.max(1, Math.round(h * sc));
                        const b = await encode(cw, ch, png ? 100 : v, png ? v : 0);
                        if (b.size < best.blob.size) best = { blob: b, v, w: cw, h: ch, scale: sc };
                        if (b.size <= target) { best = { blob: b, v, w: cw, h: ch, scale: sc }; fit = true; break; }
                    }
                    // Achou o tamanho: tenta qualidade maior nele para aproveitar melhor o limite
                    if (fit && !png) {
                        for (const q of [90, 80].filter((x) => x > best.v && x <= S.quality)) {
                            const b = await encode(best.w, best.h, q, 0);
                            if (b.size <= target) { best = { ...best, blob: b, v: q }; break; }
                        }
                    }
                }
            }
            let note = '';
            if (target) {
                note = png ? (best.v ? `${best.v} cores` : 'sem perda') : `Q ${best.v}`;
                if (best.scale < 1) note += ` · ${Math.round(best.scale * 100)}% das dimensões`;
            }
            blob = best.blob;
            return { blob, url: URL.createObjectURL(blob), size: blob.size, w: best.w, h: best.h, name: `${baseName(it.name)}.${EXT[S.fmt]}`, ext: EXT[S.fmt], note, fit };
        }

        function paintRow(it) {
            const row = it.el;
            const out = $('.m-out', row);
            const delta = $('.delta', row);
            const dl = $('[data-act="dl"]', row);
            row.classList.toggle('is-busy', it.status === 'busy');
            row.dataset.st = it.status;
            out.classList.toggle('is-error', it.status === 'error' || it.status === 'bad');
            dl.disabled = it.status !== 'done';
            delta.textContent = '';
            if (it.status === 'wait') out.textContent = 'na fila…';
            else if (it.status === 'stopped') out.textContent = 'parado';
            else if (it.status === 'busy') out.textContent = S.fmt === 'svg' ? 'vetorizando…' : 'convertendo…';
            else if (it.status === 'error' || it.status === 'bad') out.textContent = it.error;
            else if (it.out) {
                const ratio = it.out.size / it.size;
                const tone = ratio > 1 ? 'sz-up' : ratio > 0.5 ? 'sz-mid' : 'sz-down';
                out.innerHTML = `${it.out.ext.toUpperCase()} · ${it.out.w}×${it.out.h} · <b class="sz ${tone}">${fmtBytes(it.out.size)}</b>${it.out.note ? ` · ${it.out.note}` : ''}`;
                const d = fmtDelta(it.out.size, it.size);
                delta.textContent = it.out.fit ? d.text : `${d.text} · não coube em ${S.targetKB} KB`;
                delta.className = `delta ${d.good && it.out.fit ? 'good' : 'bad'}`;
                $('img', row).src = it.out.url;
            }
        }

        function updateSummary() {
            const n = S.items.length;
            card.classList.toggle('is-hidden', !n);
            const done = S.items.filter((i) => i.status === 'done');
            const failed = S.items.filter((i) => i.status === 'error' || i.status === 'bad').length;
            const left = S.items.filter((i) => i.status === 'wait' || i.status === 'busy').length;
            const stopped = S.items.filter((i) => i.status === 'stopped').length;
            const pending = left > 0;
            const tin = done.reduce((sum, i) => sum + i.size, 0);
            const tout = done.reduce((sum, i) => sum + i.out.size, 0);
            const saved = tin - tout;
            const p = n ? (done.length + failed) / n : 0;
            // Título no estilo "Otimizando 7 imagens…"
            const title = pending
                ? `Otimizando ${left} ${left === 1 ? 'imagem' : 'imagens'}…`
                : stopped ? `Parado · faltam ${stopped} ${stopped === 1 ? 'imagem' : 'imagens'}`
                    : `${done.length} ${done.length === 1 ? 'imagem otimizada' : 'imagens otimizadas'}`;
            $('#img-prog-title').textContent = title;
            let sub = `<b>${done.length}</b> de <b>${n}</b> ${n === 1 ? 'otimizada' : 'otimizadas'}`;
            if (done.length) {
                const d = fmtDelta(tout, tin);
                sub += saved >= 0
                    ? ` · <b>${fmtBytes(saved)}</b> economizados <span class="delta good">${d.text}</span>`
                    : ` · <b>${fmtBytes(-saved)}</b> a mais <span class="delta bad">${d.text}</span>`;
            }
            if (failed) sub += ` · <span class="delta bad">${failed} com erro</span>`;
            summary.innerHTML = sub;
            const fill = $('#img-prog-fill');
            const water = $('#img-prog-water');
            if (hasGsap) {
                gsap.to(fill, { width: `${p * 100}%`, duration: 0.6, ease: EASE, overwrite: true });
                gsap.to(water, { height: `${p * 100}%`, duration: 0.9, ease: EASE, overwrite: true });
            } else {
                fill.style.width = `${p * 100}%`;
                water.style.height = `${p * 100}%`;
            }
            stopBtn.classList.toggle('is-hidden', !pending && !stopped);
            stopBtn.title = pending ? 'Parar' : 'Continuar';
            stopBtn.innerHTML = `<i class="fas fa-${pending ? 'xmark' : 'play'}"></i>`;
            zipBtn.disabled = !done.length || pending;
            zipBtn.querySelector('span').textContent = done.length > 1 ? 'Baixar tudo (.zip)' : 'Baixar';
        }

        // ---------- Comparação original × convertida (divisória segue o mouse) ----------
        const cmp = { box: $('#img-compare'), stage: $('#cmp-stage'), canvas: $('#cmp-stage canvas'), outImg: null, outUrl: null, zoom: 1, panX: 0, panY: 0, div: 0.5, pan: null, raf: 0 };
        const cctx = cmp.canvas.getContext('2d');
        const checker = (() => {
            const c = document.createElement('canvas');
            c.width = c.height = 16;
            const g = c.getContext('2d');
            g.fillStyle = '#161616';
            g.fillRect(0, 0, 16, 16);
            g.fillStyle = '#222';
            g.fillRect(0, 0, 8, 8);
            g.fillRect(8, 8, 8, 8);
            return c;
        })();

        function select(it) {
            S.sel = it || null;
            S.items.forEach((i) => i.el.classList.toggle('is-sel', i === S.sel));
            if (!S.sel) { cmp.box.classList.add('is-hidden'); return; }
            const first = cmp.box.classList.contains('is-hidden');
            cmp.box.classList.remove('is-hidden');
            if (first && hasGsap) gsap.from(cmp.box, { opacity: 0, y: 14, duration: 0.7, ease: EASE, clearProps: 'opacity,transform' });
            Object.assign(cmp, { zoom: 1, panX: 0, panY: 0, div: 0.5, outImg: null, outUrl: null });
            $('#cmp-name').textContent = S.sel.name;
            cmpUpdate();
        }

        function cmpTags() {
            const it = S.sel;
            if (!it) return;
            $('.cmp-l', cmp.stage).textContent = `Original · ${fmtBytes(it.size)}`;
            const r = $('.cmp-r', cmp.stage);
            if (it.status === 'wait' || it.status === 'busy') r.textContent = S.fmt === 'svg' ? 'vetorizando…' : 'convertendo…';
            else if (it.out && it.status === 'done') {
                const d = fmtDelta(it.out.size, it.size);
                r.textContent = `${it.out.ext.toUpperCase()} · ${fmtBytes(it.out.size)} · ${d.text}`;
            } else r.textContent = it.error || '—';
        }

        async function cmpUpdate() {
            const it = S.sel;
            if (!it) return;
            cmpTags();
            if (it.out && it.status === 'done' && it.out.url !== cmp.outUrl) {
                let img;
                try { img = await loadImage(it.out.url); } catch { return; }
                if (S.sel !== it) return;
                cmp.outImg = img;
                cmp.outUrl = it.out.url;
            }
            requestDraw();
        }

        function requestDraw() {
            if (cmp.raf) return;
            cmp.raf = 1;
            nextFrame().then(() => { cmp.raf = 0; cmpDraw(); });
        }

        function cmpFit(rw, rh) {
            const it = S.sel;
            return Math.min(rw / it.w, rh / it.h) * 0.96;
        }

        function clampPan() {
            const r = cmp.stage.getBoundingClientRect();
            const it = S.sel;
            if (!it || !it.w) return;
            const f = cmpFit(r.width, r.height) * cmp.zoom;
            const maxX = Math.max(0, (it.w * f - r.width) / 2 + 40);
            const maxY = Math.max(0, (it.h * f - r.height) / 2 + 40);
            cmp.panX = clamp(cmp.panX, -maxX, maxX);
            cmp.panY = clamp(cmp.panY, -maxY, maxY);
            cmp.stage.classList.toggle('can-pan', cmp.zoom > 1.01);
        }

        function cmpDraw() {
            const it = S.sel;
            const r = cmp.stage.getBoundingClientRect();
            if (!it || !it.img || !r.width) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const W = Math.round(r.width * dpr);
            const H = Math.round(r.height * dpr);
            if (cmp.canvas.width !== W || cmp.canvas.height !== H) { cmp.canvas.width = W; cmp.canvas.height = H; }
            const g = cctx;
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.clearRect(0, 0, W, H);
            const scale = cmpFit(r.width, r.height) * cmp.zoom; // pixels CSS por pixel da imagem
            const w = it.w * scale * dpr;
            const h = it.h * scale * dpr;
            const x = W / 2 + cmp.panX * dpr - w / 2;
            const y = H / 2 + cmp.panY * dpr - h / 2;
            const pattern = g.createPattern(checker, 'repeat');
            const layer = (img) => {
                g.fillStyle = pattern;
                g.fillRect(x, y, w, h);
                if (!img) return;
                // aproximado: pixels nítidos para enxergar os artefatos de compressão
                g.imageSmoothingEnabled = scale < 2;
                g.imageSmoothingQuality = 'high';
                g.drawImage(img, x, y, w, h);
            };
            layer(it.img);
            const dx = Math.round(cmp.div * W);
            g.save();
            g.beginPath();
            g.rect(dx, 0, W - dx, H);
            g.clip();
            g.fillStyle = '#0a0a0a';
            g.fillRect(dx, 0, W - dx, H);
            layer(cmp.outImg);
            g.restore();
            g.fillStyle = '#fff';
            g.fillRect(dx - Math.round(dpr / 2), 0, Math.max(1, Math.round(1.5 * dpr)), H);
            g.beginPath();
            g.arc(dx, H / 2, 11 * dpr, 0, Math.PI * 2);
            g.fillStyle = '#0040ff';
            g.fill();
            g.lineWidth = 2 * dpr;
            g.strokeStyle = '#fff';
            g.stroke();
            $('#cmp-zoom').textContent = `${Math.round(scale * 100)}%`;
        }

        cmp.stage.addEventListener('pointermove', (e) => {
            if (!S.sel) return;
            const r = cmp.stage.getBoundingClientRect();
            if (cmp.pan) {
                cmp.panX = cmp.pan.px + (e.clientX - cmp.pan.x);
                cmp.panY = cmp.pan.py + (e.clientY - cmp.pan.y);
                clampPan();
            } else {
                if (hasGsap) gsap.killTweensOf(cmp);
                cmp.div = clamp((e.clientX - r.left) / r.width, 0, 1);
            }
            requestDraw();
        });
        cmp.stage.addEventListener('pointerleave', () => {
            if (cmp.pan) return;
            if (hasGsap) gsap.to(cmp, { div: 0.5, duration: 0.8, ease: EASE, onUpdate: requestDraw });
            else { cmp.div = 0.5; requestDraw(); }
        });
        cmp.stage.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || cmp.zoom <= 1.01) return;
            cmp.pan = { x: e.clientX, y: e.clientY, px: cmp.panX, py: cmp.panY };
            cmp.stage.classList.add('is-pan');
            try { cmp.stage.setPointerCapture(e.pointerId); } catch { /* ok */ }
        });
        const endPan = () => { cmp.pan = null; cmp.stage.classList.remove('is-pan'); };
        cmp.stage.addEventListener('pointerup', endPan);
        cmp.stage.addEventListener('pointercancel', endPan);
        cmp.stage.addEventListener('wheel', (e) => {
            if (!S.sel) return;
            e.preventDefault();
            const r = cmp.stage.getBoundingClientRect();
            // aproxima mantendo fixo o ponto sob o cursor
            const mx = e.clientX - r.left - r.width / 2 - cmp.panX;
            const my = e.clientY - r.top - r.height / 2 - cmp.panY;
            const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
            const nz = clamp(cmp.zoom * Math.exp(-delta * 0.0018), 1, 32);
            cmp.panX -= mx * (nz / cmp.zoom - 1);
            cmp.panY -= my * (nz / cmp.zoom - 1);
            cmp.zoom = nz;
            clampPan();
            requestDraw();
        }, { passive: false });
        cmp.stage.addEventListener('dblclick', () => {
            if (hasGsap) gsap.to(cmp, { zoom: 1, panX: 0, panY: 0, duration: 0.7, ease: EASE, onUpdate: requestDraw, onComplete: clampPan });
            else { Object.assign(cmp, { zoom: 1, panX: 0, panY: 0 }); clampPan(); requestDraw(); }
        });
        if ('ResizeObserver' in window) new ResizeObserver(() => requestDraw()).observe(cmp.stage);
        tools.images = { show: () => requestDraw() };

        async function downloadAll() {
            const done = S.items.filter((i) => i.status === 'done');
            if (!done.length) return;
            const names = outputNames();
            if (done.length === 1) { downloadBlob(done[0].out.blob, names.get(done[0])); return; }
            const restore = busyButton(zipBtn, 'Compactando…');
            try {
                const files = [];
                for (const it of done) files.push({ name: names.get(it), data: new Uint8Array(await it.out.blob.arrayBuffer()) });
                downloadBlob(zipStore(files), `imagens-${EXT[S.fmt]}.zip`);
            } finally {
                restore();
                updateSummary();
            }
        }
    })();


    /* =====================================================================
       Áudio — trechos (cortar, remover, mover) + recorte das pontas + fades
       ===================================================================== */
    (() => {
        // S.src é o arquivo original; track.pieces é a sequência editada (em amostras do original);
        // S.buf é essa sequência montada — onda, reprodução e exportação usam sempre S.buf.
        const S = { src: null, buf: null, file: null, a: 0, b: 0, fi: 0, fo: 0, t: 0, playing: false };
        let ctx = null;
        let src = null;
        let startedAt = 0;
        let startPos = 0;
        let raf = 0;
        let peaks = null;
        let norm = 1;
        let wasPlaying = false;
        let restartTimer = 0;

        const editor = $('#au-editor');
        const playBtn = $('#au-play');
        const posEl = $('#au-pos');
        const tl = new RangeTimeline($('#au-timeline'), {
            onSeek: (t) => { S.t = t; posEl.textContent = fmtTime(t); },
            onRange: (a, b) => { S.a = a; S.b = b; syncRange(); },
            onStart: () => { wasPlaying = S.playing; if (S.playing) pause(); },
            onEnd: () => { if (wasPlaying) play(); }
        });
        const canvas = document.createElement('canvas');
        tl.bg.appendChild(canvas);
        const track = new PieceTrack(tl, {
            rate: () => S.src.sampleRate,
            position: () => position(),
            playing: () => S.playing,
            pause: () => pause(),
            getRange: () => ({ a: S.a, b: S.b }),
            setRange: (a, b) => { S.a = a; S.b = b; },
            changed: (same, t) => refresh(same, t),
            select: (t) => { if (S.playing) play(Math.max(t, S.a)); else { S.t = t; tick(); } },
            draw: () => draw(),
            nudge: () => shake($('#au-cut'))
        });

        const knobHost = $('#au-knobs');
        const knobs = {
            a: new Knob(knobHost, { label: 'Início', step: 0.01, format: fmtTime, onChange: (v) => tl.setRange(v, S.b, 'a') }),
            b: new Knob(knobHost, { label: 'Fim', step: 0.01, format: fmtTime, onChange: (v) => tl.setRange(S.a, v, 'b') }),
            fi: new Knob(knobHost, { label: 'Fade in', step: 0.01, wheel: 0.05, format: (v) => `${v.toFixed(2)} s`, onChange: (v) => { S.fi = v; fitFades('fi'); } }),
            fo: new Knob(knobHost, { label: 'Fade out', step: 0.01, wheel: 0.05, format: (v) => `${v.toFixed(2)} s`, onChange: (v) => { S.fo = v; fitFades('fo'); } }),
            // Teto do pico: em 0 dB fica desligado (som intacto). Abaixo disso, abaixa o volume inteiro
            // na medida certa para o pico encostar no limite — sem compressão, sem distorção.
            lim: new Knob(knobHost, {
                label: 'Pico máx.', min: -20, max: 0, step: 0.5, value: 0,
                format: (v) => (v === 0 ? 'livre' : `${v.toFixed(1)} dB`),
                onChange: (v) => {
                    S.ceilDb = v;
                    draw();
                    if (S.playing) { clearTimeout(restartTimer); restartTimer = setTimeout(() => play(position()), 80); }
                }
            })
        };

        bindDrop($('#au-drop'), $('#au-input'), (files) => load(files[0]));
        playBtn.addEventListener('click', toggle);
        $('#au-stop').addEventListener('click', stop);
        $('#au-cut').addEventListener('click', () => { if (S.buf) track.cut(); });
        $('#au-undo').addEventListener('click', () => track.undoEdit());
        $('#au-download').addEventListener('click', exportAudio);
        if ('ResizeObserver' in window) new ResizeObserver(() => { draw(); track.render(false); }).observe(tl.bg);

        async function load(file) {
            if (!file) return;
            stop();
            let decoded;
            try {
                if (!ctx) {
                    // decodeAudioData converte para a taxa do contexto: 44.1 kHz preserva a maioria das músicas
                    const AC = window.AudioContext || window.webkitAudioContext;
                    try { ctx = new AC({ sampleRate: 44100 }); } catch { ctx = new AC(); }
                }
                decoded = await ctx.decodeAudioData(await file.arrayBuffer());
            } catch {
                notify('Não foi possível ler este arquivo de áudio');
                return;
            }
            Object.assign(S, { src: decoded, buf: decoded, file, a: 0, b: decoded.duration, fi: 0, fo: 0, t: 0 });
            track.reset(decoded.length);
            peaks = null;
            knobs.fi.set(0, { silent: true });
            knobs.fo.set(0, { silent: true });
            tl.setDuration(decoded.duration);
            const ch = decoded.numberOfChannels;
            $('#au-meta').textContent = `${(decoded.sampleRate / 1000).toFixed(1)} kHz · ${ch === 1 ? 'mono' : ch === 2 ? 'estéreo' : `${ch} canais`}`;
            compactDrop($('#au-drop'), file);
            reveal(editor);
            refresh(true);
            requestAnimationFrame(() => { draw(); track.render(false); });
        }

        // Monta a sequência; onde o áudio original não é contínuo aplica um micro-fade de 4 ms (sem estalo)
        function renderSequence() {
            const pieces = track.pieces;
            const srcBuf = S.src;
            const p0 = pieces[0];
            if (pieces.length === 1 && p0.s === 0 && p0.e === srcBuf.length) { S.buf = srcBuf; return; }
            const out = ctx.createBuffer(srcBuf.numberOfChannels, Math.max(1, track.total()), srcBuf.sampleRate);
            const fade = Math.round(srcBuf.sampleRate * 0.004);
            for (let c = 0; c < srcBuf.numberOfChannels; c++) {
                const from = srcBuf.getChannelData(c);
                const to = out.getChannelData(c);
                let o = 0;
                pieces.forEach((p, i) => {
                    const len = p.e - p.s;
                    to.set(from.subarray(p.s, p.e), o);
                    const n = Math.min(fade, len >> 2);
                    const prev = pieces[i - 1];
                    const next = pieces[i + 1];
                    if (prev && prev.e !== p.s) for (let k = 0; k < n; k++) to[o + k] *= k / n;
                    if (next && next.s !== p.e) for (let k = 0; k < n; k++) to[o + len - 1 - k] *= k / n;
                    o += len;
                });
            }
            S.buf = out;
        }

        function refresh(same, t = null) {
            if (!same) {
                if (S.playing) pause();
                renderSequence();
                peaks = null;
            }
            if (t != null) S.t = t;
            const d = S.buf.duration;
            S.b = clamp(S.b, 0, d);
            S.a = clamp(S.a, 0, S.b);
            if (S.b - S.a < 0.05) { S.a = 0; S.b = d; }
            if (!S.playing) S.t = clamp(S.t, 0, d);
            tl.resize(d);
            tl.setRange(S.a, S.b);
            tl.setTime(position());
            knobs.a.setRange(0, d);
            knobs.b.setRange(0, d);
            knobs.a.o.wheel = knobs.b.o.wheel = Math.max(0.01, +(d / 400).toFixed(2));
            $('#au-dur').textContent = fmtTime(d);
            $('#au-undo').disabled = !track.undo.length;
            syncRange(false);
            track.render(true);
        }

        // ---------- Recorte das pontas + fades ----------
        function syncRange(restart = true) {
            const len = S.b - S.a;
            knobs.a.set(S.a, { silent: true });
            knobs.b.set(S.b, { silent: true });
            const maxFade = Math.min(30, len);
            knobs.fi.setRange(0, maxFade);
            knobs.fo.setRange(0, maxFade);
            S.fi = Math.min(S.fi, maxFade);
            S.fo = Math.min(S.fo, maxFade);
            fitFades(null, restart);
            $('#au-sel').textContent = fmtTime(len);
            if (!S.playing && (S.t < S.a || S.t > S.b)) { S.t = S.a; tl.setTime(S.t); posEl.textContent = fmtTime(S.t); }
        }

        // Fade in + fade out nunca passam do tamanho da seleção
        function fitFades(changed, restart = true) {
            const len = S.b - S.a;
            if (S.fi + S.fo > len) {
                if (changed === 'fi') S.fo = Math.max(0, len - S.fi);
                else S.fi = Math.max(0, len - S.fo);
            }
            knobs.fi.set(S.fi, { silent: true });
            knobs.fo.set(S.fo, { silent: true });
            draw();
            if (restart && S.playing) { clearTimeout(restartTimer); restartTimer = setTimeout(() => play(position()), 80); }
        }

        // Curva quadrática: soa mais natural do que um fade linear
        function envAt(t) {
            let g = 1;
            if (S.fi > 0 && t < S.a + S.fi) g = Math.min(g, (t - S.a) / S.fi);
            if (S.fo > 0 && t > S.b - S.fo) g = Math.min(g, (S.b - t) / S.fo);
            g = clamp(g, 0, 1);
            return g * g;
        }

        function computePeaks(width) {
            const buf = S.buf;
            const chans = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c));
            const n = buf.length;
            const out = new Float32Array(width * 2);
            const per = n / width;
            let max = 0;
            for (let x = 0; x < width; x++) {
                const s0 = Math.floor(x * per);
                const s1 = Math.min(n, Math.floor((x + 1) * per));
                const stride = Math.max(1, Math.floor((s1 - s0) / 4000));
                let lo = 0;
                let hi = 0;
                for (const data of chans) {
                    for (let i = s0; i < s1; i += stride) {
                        const v = data[i];
                        if (v < lo) lo = v;
                        if (v > hi) hi = v;
                    }
                }
                out[x * 2] = lo;
                out[x * 2 + 1] = hi;
                max = Math.max(max, hi, -lo);
            }
            norm = max > 0 ? Math.min(4, 1 / max) : 1;
            return out;
        }

        function draw() {
            if (!S.buf) return;
            const rect = tl.bg.getBoundingClientRect();
            if (!rect.width) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const W = Math.round(rect.width * dpr);
            const H = Math.round(rect.height * dpr);
            if (canvas.width !== W || canvas.height !== H || !peaks) {
                canvas.width = W;
                canvas.height = H;
                peaks = computePeaks(W);
            }
            const g = canvas.getContext('2d');
            g.clearRect(0, 0, W, H);
            const d = S.buf.duration;
            const mid = H / 2;
            const amp = H * 0.46; // escala real: sem normalizar, para enxergar o que estoura e o que está baixo
            const xa = (S.a / d) * W;
            const xb = (S.b / d) * W;
            const items = track.layout();
            const total = S.buf.length;
            for (const it of items) {
                if (items.length < 2) break;
                const x0 = (it.o / total) * W;
                const x1 = ((it.o + it.len) / total) * W;
                if (it.p.id === track.sel) { g.fillStyle = 'rgba(0, 64, 255, 0.16)'; g.fillRect(x0, 0, x1 - x0, H); }
                else if (it.p.id === track.hover) { g.fillStyle = 'rgba(255, 255, 255, 0.045)'; g.fillRect(x0, 0, x1 - x0, H); }
            }
            // pico bruto da seleção → ganho do teto (1 quando o knob está em "livre")
            let rawPeak = 0;
            for (let x = Math.max(0, Math.floor(xa)); x <= Math.min(W - 1, Math.ceil(xb)); x++) rawPeak = Math.max(rawPeak, peaks[x * 2 + 1], -peaks[x * 2]);
            S.limitGain = limitGain(rawPeak);
            let selPeak = 0;
            for (let x = 0; x < W; x++) {
                const inside = x >= xa && x <= xb;
                const env = inside ? envAt(((x + 0.5) / W) * d) * S.limitGain : 1;
                const hi = Math.min(1, peaks[x * 2 + 1] * env);
                const lo = Math.max(-1, peaks[x * 2] * env);
                const pk = Math.max(hi, -lo);
                if (inside) selPeak = Math.max(selPeak, pk);
                // vermelho = passou de −1 dB · azul = nem chega a −20 dB
                g.fillStyle = !inside ? '#3a3a3a' : pk >= LEVEL_HOT ? LEVEL_COLOR.hot : pk < LEVEL_LOW ? LEVEL_COLOR.low : '#ececec';
                g.fillRect(x, mid - hi * amp, 1, Math.max(1, (hi - lo) * amp));
            }
            drawLevelLines(g, W, mid, amp, dpr);
            const peakChip = $('#au-peak');
            const tone = levelTone(selPeak);
            peakChip.className = `chip lv-${tone}`;
            const reduced = S.limitGain < 1 ? ` · reduzido ${fmtDb(S.limitGain)}` : '';
            peakChip.textContent = `pico ${fmtDb(selPeak)}${reduced}${tone === 'hot' ? ' · estourando' : tone === 'low' ? ' · baixo' : ''}`;
            // emendas entre trechos
            g.fillStyle = '#2f5cff';
            const seam = Math.max(1, Math.round(dpr));
            items.slice(1).forEach((it) => g.fillRect(Math.round((it.o / total) * W) - Math.floor(seam / 2), 0, seam, H));
            if (S.fi > 0 || S.fo > 0) {
                g.strokeStyle = '#2f5cff';
                g.lineWidth = 1.5 * dpr;
                g.beginPath();
                for (let x = Math.floor(xa); x <= Math.ceil(xb); x += 2) {
                    const y = mid - envAt((x / W) * d) * H * 0.46;
                    if (x <= xa + 1) g.moveTo(x, y);
                    else g.lineTo(x, y);
                }
                g.stroke();
            }
        }

        const position = () => (S.playing ? clamp(startPos + (ctx.currentTime - startedAt), 0, S.b) : S.t);

        // Ganho do "Pico máx.": só reduz, e só quando o knob sai de "livre" (0 dB)
        function limitGain(peak) {
            if (!S.ceilDb || !(peak > 0)) return 1;
            const ceil = Math.pow(10, S.ceilDb / 20);
            return peak > ceil ? ceil / peak : 1;
        }

        function scheduleEnvelope(param, from, t0) {
            const fiEnd = S.a + S.fi;
            const foStart = S.b - S.fo;
            const segments = [];
            if (S.fi > 0 && from < fiEnd && S.fo > 0 && fiEnd >= foStart - 0.005) {
                segments.push([from, S.b]);
            } else {
                if (S.fi > 0 && from < fiEnd) segments.push([from, fiEnd]);
                if (S.fo > 0 && S.b > Math.max(from, foStart)) segments.push([Math.max(from, foStart), S.b]);
            }
            if (!segments.length || segments[0][0] > from) param.setValueAtTime(envAt(from), t0);
            for (const [s, e] of segments) {
                const n = clamp(Math.ceil((e - s) * 200), 2, 2048);
                const curve = new Float32Array(n);
                for (let i = 0; i < n; i++) curve[i] = envAt(s + ((e - s) * i) / (n - 1));
                param.setValueCurveAtTime(curve, t0 + (s - from), Math.max(0.005, e - s));
            }
        }

        function play(from) {
            if (!S.buf) return;
            stopSource();
            ctx.resume();
            let pos = from ?? S.t;
            if (pos < S.a || pos >= S.b - 0.02) pos = S.a;
            const node = ctx.createBufferSource();
            const gain = ctx.createGain();
            node.buffer = S.buf;
            const limit = ctx.createGain();
            limit.gain.value = S.limitGain ?? 1;
            node.connect(gain).connect(limit).connect(ctx.destination);
            const t0 = ctx.currentTime + 0.03;
            scheduleEnvelope(gain.gain, pos, t0);
            node.start(t0, pos, S.b - pos);
            node.onended = () => {
                if (src !== node) return;
                src = null;
                S.playing = false;
                S.t = S.a;
                tick();
                setPlayIcon(playBtn, false);
            };
            src = node;
            startedAt = t0;
            startPos = pos;
            S.playing = true;
            setPlayIcon(playBtn, true);
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(tick);
        }

        function stopSource() {
            if (!src) return;
            const node = src;
            src = null;
            try { node.stop(); } catch { /* já parado */ }
        }

        function pause() {
            if (!S.playing) return;
            S.t = position();
            stopSource();
            S.playing = false;
            setPlayIcon(playBtn, false);
            tick();
        }

        function stop() {
            stopSource();
            S.playing = false;
            S.t = S.a;
            setPlayIcon(playBtn, false);
            tick();
        }

        function toggle() { if (S.playing) pause(); else play(); }

        function tick() {
            const t = position();
            tl.setTime(t);
            posEl.textContent = fmtTime(t);
            if (S.playing) raf = requestAnimationFrame(tick);
        }

        function exportChannels() {
            const sr = S.buf.sampleRate;
            const s0 = Math.floor(S.a * sr);
            const s1 = Math.min(S.buf.length, Math.floor(S.b * sr));
            const chans = Array.from({ length: S.buf.numberOfChannels }, (_, c) => S.buf.getChannelData(c).slice(s0, s1));
            if (S.ceilDb) {
                // pico exato (amostra a amostra) para o teto; em "livre" nada é tocado
                let peak = 0;
                for (const data of chans) for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > peak) peak = v; }
                const g = limitGain(peak);
                if (g < 1) for (const data of chans) for (let i = 0; i < data.length; i++) data[i] *= g;
            }
            const len = s1 - s0;
            const nIn = Math.min(len, Math.round(S.fi * sr));
            const nOut = Math.min(len, Math.round(S.fo * sr));
            for (const data of chans) {
                for (let i = 0; i < nIn; i++) data[i] *= envAt(S.a + i / sr);
                for (let i = Math.max(nIn, len - nOut); i < len; i++) data[i] *= envAt(S.a + i / sr);
            }
            return chans;
        }

        // Inverso exato do decodificador do navegador (positivos ÷32767, negativos ÷32768), com
        // arredondamento: um WAV de 16 bits sem edição volta igual ao original, amostra por amostra
        function toInt16(f) {
            const out = new Int16Array(f.length);
            for (let i = 0; i < f.length; i++) {
                const s = clamp(f[i], -1, 1);
                out[i] = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
            }
            return out;
        }

        function encodeWav(chans, sr) {
            const nch = chans.length;
            const len = chans[0].length;
            const buf = new ArrayBuffer(44 + len * nch * 2);
            const v = new DataView(buf);
            const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
            str(0, 'RIFF');
            v.setUint32(4, 36 + len * nch * 2, true);
            str(8, 'WAVE');
            str(12, 'fmt ');
            v.setUint32(16, 16, true);
            v.setUint16(20, 1, true);
            v.setUint16(22, nch, true);
            v.setUint32(24, sr, true);
            v.setUint32(28, sr * nch * 2, true);
            v.setUint16(32, nch * 2, true);
            v.setUint16(34, 16, true);
            str(36, 'data');
            v.setUint32(40, len * nch * 2, true);
            const pcm = new Int16Array(buf, 44);
            for (let c = 0; c < nch; c++) {
                const data = toInt16(chans[c]);
                for (let i = 0; i < len; i++) pcm[i * nch + c] = data[i];
            }
            return new Blob([buf], { type: 'audio/wav' });
        }

        async function resample(chans, sr, target) {
            const len = chans[0].length;
            const tmp = new AudioBuffer({ length: len, numberOfChannels: chans.length, sampleRate: sr });
            chans.forEach((data, c) => tmp.copyToChannel(data, c));
            const off = new OfflineAudioContext(chans.length, Math.ceil((len * target) / sr), target);
            const node = off.createBufferSource();
            node.buffer = tmp;
            node.connect(off.destination);
            node.start();
            const rendered = await off.startRendering();
            return chans.map((_, c) => rendered.getChannelData(c));
        }

        async function encodeMp3(chans, sr, kbps, onProgress) {
            await loadScript(LIB.lame);
            if (![8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000].includes(sr)) {
                chans = await resample(chans, sr, 44100);
                sr = 44100;
            }
            const nch = Math.min(2, chans.length);
            const encoder = new window.lamejs.Mp3Encoder(nch, sr, kbps);
            const L = toInt16(chans[0]);
            const R = nch > 1 ? toInt16(chans[1]) : null;
            const parts = [];
            const block = 1152;
            for (let i = 0, n = 0; i < L.length; i += block, n++) {
                const out = R ? encoder.encodeBuffer(L.subarray(i, i + block), R.subarray(i, i + block)) : encoder.encodeBuffer(L.subarray(i, i + block));
                if (out.length) parts.push(new Uint8Array(out));
                if (n % 300 === 0) { onProgress(i / L.length); await sleep(0); }
            }
            const end = encoder.flush();
            if (end.length) parts.push(new Uint8Array(end));
            return new Blob(parts, { type: 'audio/mpeg' });
        }

        async function exportAudio() {
            if (!S.buf) return;
            const btn = $('#au-download');
            const fmt = $('#au-format').value;
            const restore = busyButton(btn, 'Gerando…');
            try {
                const chans = exportChannels();
                let blob;
                if (fmt === 'wav') {
                    blob = encodeWav(chans, S.buf.sampleRate);
                } else {
                    const label = btn.querySelector('span');
                    blob = await encodeMp3(chans, S.buf.sampleRate, +fmt.split('-')[1], (p) => { label.textContent = `MP3 ${Math.round(p * 100)}%`; });
                }
                downloadBlob(blob, `${baseName(S.file.name)}-recorte.${fmt === 'wav' ? 'wav' : 'mp3'}`);
                notify(`Áudio pronto · ${fmtBytes(blob.size)}`);
            } catch (err) {
                console.error(err);
                notify(err.message || 'Falha ao gerar o áudio');
            } finally {
                restore();
            }
        }

        tools.audio = {
            hide: pause,
            show: () => requestAnimationFrame(() => { draw(); track.render(false); }),
            key(e) {
                if (!S.buf) return false;
                if (track.key(e)) return true;
                if (e.metaKey || e.ctrlKey) return false;
                const k = e.key.toLowerCase();
                if (e.key === ' ') { toggle(); return true; }
                if (k === 'i') { tl.setRange(position(), S.b, 'a'); return true; }
                if (k === 'o') { tl.setRange(S.a, position(), 'b'); return true; }
                return false;
            }
        };
    })();


    /* =====================================================================
       Vídeo — trechos (cortar, remover, mover) + exportação (motor local com ffmpeg ou navegador)
       ===================================================================== */
    (() => {
        // track.pieces guarda os trechos em ms do original; a linha do tempo mostra a sequência editada
        // e a prévia pula as partes removidas enquanto toca.
        const RATE = 1000;
        const S = { file: null, url: null, d: 0, out: 0, a: 0, b: 0, cur: 0, thumbs: null, lastWidth: '1280', server: null, serverId: null, serverFile: null, busy: false, resultUrl: null };
        const video = $('#vt-video');
        const stage = $('#vt-stage');
        const editor = $('#vt-editor');
        const playBtn = $('#vt-play');
        const progress = progressUI($('#vt-progress'));
        const stripCanvas = document.createElement('canvas');
        let raf = 0;
        let wasPlaying = false;
        let thumbJob = null;
        let actx = null;
        let mainSource = null;

        const tl = new RangeTimeline($('#vt-timeline'), {
            onSeek: (t) => seekOut(t),
            onRange: (a, b, which) => { S.a = a; S.b = b; seekOut(which === 'a' ? a : b); updateSel(); sync(); },
            onStart: () => { wasPlaying = !video.paused; video.pause(); },
            onEnd: (h) => { if (wasPlaying && h === 'seek') play(); }
        });
        tl.bg.appendChild(stripCanvas);
        const track = new PieceTrack(tl, {
            rate: () => RATE,
            position: () => outTime(),
            playing: () => !video.paused,
            pause: () => video.pause(),
            getRange: () => ({ a: S.a, b: S.b }),
            setRange: (a, b) => { S.a = a; S.b = b; },
            changed: (same, t) => refresh(same, t),
            select: (t) => seekOut(t),
            draw: () => drawStrip(),
            nudge: () => shake($('#vt-cut'))
        });
        const engineSeg = initSeg($('#vt-engine'), sync);
        const modeSeg = initSeg($('#vt-mode'), sync);
        const qualitySeg = initSeg($('#vt-quality'), (v) => {
            if (v !== 'original') $('#vt-width').value = S.lastWidth;
            sync();
        });
        const audioSeg = initSeg($('#vt-audio'));
        const kindSeg = initSeg($('#vt-kind'), () => sync());
        const gifFps = initSeg($('#vt-gif-fps'), () => scheduleGif());
        const gifColors = initSeg($('#vt-gif-colors'), () => scheduleGif());
        const gifDither = initSeg($('#vt-gif-dither'), () => scheduleGif());
        $('#vt-gif-width').addEventListener('change', () => scheduleGif());

        bindDrop($('#vt-drop'), $('#vt-input'), (files) => load(files[0]));
        playBtn.addEventListener('click', toggle);
        stage.addEventListener('click', toggle);
        $('#vt-cut').addEventListener('click', () => { if (S.url && !S.busy) track.cut(); });
        $('#vt-undo').addEventListener('click', () => { if (!S.busy) track.undoEdit(); });
        $('#vt-in').addEventListener('click', () => tl.setRange(outTime(), S.b, 'a'));
        $('#vt-out').addEventListener('click', () => tl.setRange(S.a, outTime(), 'b'));
        $('#vt-width').addEventListener('change', (e) => { S.lastWidth = e.target.value; });
        $('#vt-export').addEventListener('click', exportClip);
        $('#vt-to-editor').addEventListener('click', () => {
            if (!S.file) { goTo('editor'); return; }
            video.pause();
            tools.editor.importClip(S.file, S.serverFile === S.file ? S.serverId : null, track.segments(S.a, S.b));
            goTo('editor');
            notify('Vídeo levado ao Editor, com os cortes');
        });
        $('#vt-cancel').addEventListener('click', () => {
            S.cancel = true;
            $('#vt-cancel').disabled = true;
            progress.set('Cancelando…', 0);
        });
        video.addEventListener('play', () => { setPlayIcon(playBtn, true); tick(); });
        video.addEventListener('pause', () => { setPlayIcon(playBtn, false); tick(); });
        video.addEventListener('seeked', tick);
        if ('ResizeObserver' in window) new ResizeObserver(() => { drawStrip(); track.render(false); }).observe(tl.bg);

        // ---------- Tempo da sequência ↔ tempo do original ----------
        function toSource(t) {
            const L = track.layout();
            const T = clamp(t, 0, S.out) * RATE;
            for (let i = 0; i < L.length; i++) {
                const it = L[i];
                if (T < it.o + it.len || i === L.length - 1) return { i, src: (it.p.s + clamp(T - it.o, 0, it.len)) / RATE };
            }
            return { i: 0, src: 0 };
        }

        function outTime() {
            const L = track.layout();
            const it = L[S.cur] || L[0];
            if (!it) return 0;
            return (it.o + clamp(video.currentTime * RATE - it.p.s, 0, it.len)) / RATE;
        }

        function seekOut(t) {
            const m = toSource(t);
            S.cur = m.i;
            video.currentTime = m.src;
            tick();
        }

        // Depois de uma edição, reencontra em qual trecho está o frame atual
        function syncCur() {
            const T = video.currentTime * RATE;
            const i = track.pieces.findIndex((p) => T >= p.s - 1 && T < p.e);
            if (i >= 0) S.cur = i;
            return i >= 0;
        }

        async function checkServer() {
            if (S.server !== null || S.checking) return;
            S.checking = true;
            let info = false;
            try {
                const res = await fetch(window.MOTOR + 'status', { cache: 'no-store' });
                const json = await res.json();
                if (json.ffmpeg) info = json;
            } catch { /* sem o motor ou sem ffmpeg: fica no navegador */ }
            S.server = info;
            S.checking = false;
            engineSeg.set(info ? 'server' : 'browser', true);
            sync();
        }

        function sync() {
            if (S.server === null) return; // ainda verificando
            const serverOk = !!S.server;
            $('#vt-engine [data-v="server"]').disabled = !serverOk;
            if (!serverOk && engineSeg.value === 'server') engineSeg.set('browser', true);
            // Corte rápido (sem recompressão) só é exato com um trecho: juntar trechos exige recodificar
            const multi = S.url ? track.segments(S.a, S.b).length > 1 : false;
            $('#vt-mode [data-v="copy"]').disabled = multi;
            if (multi && modeSeg.value === 'copy') modeSeg.set('optimize', true);
            const engine = engineSeg.value;
            const mode = engine === 'server' ? modeSeg.value : 'optimize';
            const quality = qualitySeg.value;
            $('#vt-engine-hint').classList.toggle('is-hidden', engine === 'server');
            $('#vt-engine-hint').innerHTML = engine === 'server'
                ? ''
                : serverOk
                    ? 'Grava em tempo real no navegador (MediaRecorder): leva o tempo do vídeo final.'
                    : 'Sem o ffmpeg neste computador — o vídeo é gravado em tempo real no navegador.';
            $('#vt-mode-wrap').classList.toggle('is-hidden', engine !== 'server');
            $('#vt-copy-hint').classList.toggle('is-hidden', mode !== 'copy');
            $('#vt-multi-hint').classList.toggle('is-hidden', !(multi && engine === 'server'));
            $('#vt-opt').classList.toggle('is-hidden', mode === 'copy');
            const width = $('#vt-width');
            width.disabled = quality === 'original';
            if (quality === 'original') width.value = '0';
            const qHint = $('#vt-quality-hint');
            qHint.classList.toggle('is-hidden', quality !== 'original');
            qHint.innerHTML = engine === 'server'
                ? 'Mesma resolução e fps, H.264 <b>sem perda visível</b> (CRF 17) e áudio no bitrate do original.'
                : 'Mesma resolução e bitrate próximo ao do original (gravado a 30 fps). Para a qualidade máxima, use o servidor.';
            const ext = S.file ? (S.file.name.split('.').pop() || '').toUpperCase() : 'original';
            $('#vt-out-hint').innerHTML = engine === 'browser'
                ? `Saída: <b>${recorderMime().includes('mp4') ? 'MP4' : 'WebM'}</b> (formato que este navegador grava).`
                : mode === 'copy' ? `Saída: <b>${ext}</b> com os mesmos codecs, sem recompressão.` : 'Saída: <b>MP4</b> · H.264 + AAC, faststart para web.';
            // GIF: sempre neste computador (ffmpeg com paleta própria)
            const gif = kindSeg.value === 'gif';
            $('#vt-gif').classList.toggle('is-hidden', !gif);
            if (gif) ['#vt-engine-wrap', '#vt-mode-wrap', '#vt-opt', '#vt-out-hint'].forEach((sel) => $(sel).classList.add('is-hidden'));
            else $('#vt-engine-wrap').classList.remove('is-hidden');
            const label = $('#vt-export span');
            if (label) label.textContent = gif ? 'Exportar GIF' : 'Exportar recorte';
            if (!S.busy) $('#vt-export').disabled = gif && !serverOk;
            if (gif && !serverOk) {
                $('#vt-gif-size').textContent = '—';
                $('#vt-gif-info').textContent = 'O GIF é gerado pelo ffmpeg deste computador, que não está disponível agora.';
            } else if (gif) {
                scheduleGif();
            }
            segs.forEach((s) => s.refresh());
        }

        function load(file) {
            if (!file) return;
            if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|avi|ogv)$/i.test(file.name)) { notify('Escolha um arquivo de vídeo'); return; }
            if (S.busy) { notify('Aguarde a exportação terminar'); return; }
            video.pause();
            if (S.url) URL.revokeObjectURL(S.url);
            Object.assign(S, { file, url: URL.createObjectURL(file), serverId: null, serverFile: null, thumbs: null, gifKey: null, fromLink: false });
            $('#vt-gif-img').removeAttribute('src');
            $('#vt-gif-size').textContent = '—';
            $('#vt-result').classList.add('is-hidden');
            progress.hide();
            video.src = S.url;
            waitEvent(video, 'loadedmetadata', 15000).then(onMeta).catch(() => notify('Este navegador não reproduz este vídeo'));
        }

        async function onMeta() {
            S.d = await ensureDuration(video);
            track.reset(Math.round(S.d * RATE));
            Object.assign(S, { out: S.d, a: 0, b: S.d, cur: 0 });
            const ratio = video.videoWidth / video.videoHeight || 16 / 9;
            stage.style.aspectRatio = `${video.videoWidth || 16} / ${video.videoHeight || 9}`;
            stage.style.maxWidth = `calc(58vh * ${ratio})`;
            tl.setDuration(S.d);
            compactDrop($('#vt-drop'), S.file, S.fromLink ? 'baixado do link' : '');
            reveal(editor);
            $('#vt-info').textContent = `${video.videoWidth}×${video.videoHeight} · ${fmtTime(S.d)} · ${fmtBytes(S.file.size)}`;
            refresh(false, 0);
            requestAnimationFrame(() => { drawStrip(); track.render(false); });
            buildThumbs();
        }

        function refresh(same, t = null) {
            if (!same) video.pause();
            S.out = track.total() / RATE;
            S.b = clamp(S.b, 0, S.out);
            S.a = clamp(S.a, 0, S.b);
            if (S.b - S.a < 0.05) { S.a = 0; S.b = S.out; }
            tl.resize(S.out);
            tl.setRange(S.a, S.b);
            if (t != null) seekOut(t);
            else if (!syncCur()) seekOut(S.a);
            $('#vt-dur').textContent = fmtTime(S.out);
            $('#vt-undo').disabled = !track.undo.length;
            updateSel();
            track.render(true);
            drawStrip();
            tick();
            sync();
        }

        // Miniaturas do original guardadas uma vez; a tira é remontada na hora a cada edição
        async function buildThumbs() {
            if (thumbJob) thumbJob.cancelled = true;
            const job = (thumbJob = { cancelled: false });
            const cache = { tiles: [], n: clamp(Math.round(S.d * 2), 12, 60), ratio: video.videoWidth / video.videoHeight || 16 / 9 };
            S.thumbs = cache;
            const v = document.createElement('video');
            v.muted = true;
            v.playsInline = true;
            v.preload = 'auto';
            v.src = S.url;
            try { await waitEvent(v, 'loadeddata', 10000); } catch { return; }
            const h = 90;
            const w = Math.max(8, Math.round(h * cache.ratio));
            for (let i = 0; i < cache.n; i++) {
                if (job.cancelled) break;
                v.currentTime = ((i + 0.5) / cache.n) * S.d;
                try { await waitEvent(v, 'seeked', 5000); } catch { continue; }
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                c.getContext('2d').drawImage(v, 0, 0, w, h);
                cache.tiles[i] = c;
                if (i % 4 === 3 || i === cache.n - 1) drawStrip();
            }
            v.removeAttribute('src');
            v.load();
        }

        function drawStrip() {
            if (!S.url) return;
            const rect = tl.bg.getBoundingClientRect();
            if (!rect.width) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const W = Math.round(rect.width * dpr);
            const H = Math.round(rect.height * dpr);
            if (stripCanvas.width !== W || stripCanvas.height !== H) { stripCanvas.width = W; stripCanvas.height = H; }
            const g = stripCanvas.getContext('2d');
            g.fillStyle = '#0e0e0e';
            g.fillRect(0, 0, W, H);
            const cache = S.thumbs;
            if (cache && S.out) {
                const tileW = Math.max(8, Math.round(H * cache.ratio));
                for (let x = 0; x < W; x += tileW) {
                    const t = ((x + tileW / 2) / W) * S.out;
                    const idx = clamp(Math.floor((toSource(t).src / S.d) * cache.n), 0, cache.n - 1);
                    if (cache.tiles[idx]) g.drawImage(cache.tiles[idx], x, 0, tileW, H);
                }
            }
            const items = track.layout();
            const total = track.total() || 1;
            if (items.length > 1) {
                for (const it of items) {
                    const x0 = (it.o / total) * W;
                    const x1 = ((it.o + it.len) / total) * W;
                    if (it.p.id === track.sel) { g.fillStyle = 'rgba(0, 64, 255, 0.3)'; g.fillRect(x0, 0, x1 - x0, H); }
                    else if (it.p.id === track.hover) { g.fillStyle = 'rgba(255, 255, 255, 0.12)'; g.fillRect(x0, 0, x1 - x0, H); }
                }
            }
            g.fillStyle = '#2f5cff';
            const seam = Math.max(2, Math.round(2 * dpr));
            items.slice(1).forEach((it) => g.fillRect(Math.round((it.o / total) * W - seam / 2), 0, seam, H));
        }

        function updateSel() {
            const n = S.url ? track.segments(S.a, S.b).length : 1;
            $('#vt-sel').textContent = `seleção ${fmtTime(S.b - S.a)}${n > 1 ? ` · ${n} trechos` : ''}`;
        }

        // Toca a sequência: ao chegar no fim de um trecho, salta para o próximo
        function tick() {
            if (!video.paused && !S.busy) {
                const L = track.layout();
                const it = L[S.cur];
                if (outTime() >= S.b - 0.01) {
                    video.pause();
                    seekOut(S.b);
                    return;
                }
                if (it && video.currentTime * RATE >= it.p.e - 15) {
                    const next = L[S.cur + 1];
                    if (next) {
                        S.cur++;
                        if (next.p.s !== it.p.e) video.currentTime = next.p.s / RATE;
                    } else {
                        video.pause();
                    }
                }
            }
            if (!S.busy) {
                const t = outTime();
                tl.setTime(t);
                $('#vt-pos').textContent = fmtTime(t);
            }
            cancelAnimationFrame(raf);
            if (!video.paused) raf = requestAnimationFrame(tick);
        }

        function play() {
            const t = outTime();
            if (t < S.a || t >= S.b - 0.04) seekOut(S.a);
            actx?.resume();
            video.play().catch(() => {});
        }

        function toggle() {
            if (!S.url || S.busy) return;
            if (video.paused) play(); else video.pause();
            flash(stage, !video.paused);
        }

        function showResult(size, href, filename) {
            const before = S.file.size;
            const d = fmtDelta(size, before);
            $('#vt-res-in').textContent = fmtBytes(before);
            $('#vt-res-out').textContent = fmtBytes(size);
            const delta = $('#vt-res-delta');
            delta.textContent = `${d.text} em relação ao arquivo original`;
            delta.className = `delta mt-1 ${d.good ? 'good' : 'bad'}`;
            const link = $('#vt-download');
            link.href = href;
            link.setAttribute('download', filename);
            reveal($('#vt-result'));
            if (hasGsap) gsap.fromTo('#vt-result', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: EASE });
        }

        const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
        const checkCancel = () => { if (S.cancel) throw new Error('Exportação cancelada'); };

        async function exportClip() {
            if (!S.file || S.busy) return;
            S.busy = true;
            S.cancel = false;
            const cancelBtn = $('#vt-cancel');
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('is-hidden');
            video.pause();
            editor.classList.add('pointer-events-none');
            const restore = busyButton($('#vt-export'), 'Exportando…');
            $('#vt-result').classList.add('is-hidden');
            progress.show();
            const keepT = outTime();
            try {
                if (kindSeg.value === 'gif') await viaGif();
                else if (engineSeg.value === 'server') await viaServer();
                else await viaBrowser();
                notify(kindSeg.value === 'gif' ? 'GIF pronto para baixar' : 'Vídeo pronto para baixar');
            } catch (err) {
                console.error(err);
                progress.set(err.message || 'Falha na exportação', 0);
                notify('Não deu certo — veja a mensagem no painel');
                return;
            } finally {
                S.busy = false;
                cancelBtn.classList.add('is-hidden');
                editor.classList.remove('pointer-events-none');
                restore();
                seekOut(keepT);
            }
            progress.hide();
        }

        // Nenhuma chamada fica pendurada: depois de 90 s sem resposta vira erro
        async function api(url, options = {}) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 90000);
            let res;
            try {
                res = await fetch(url, { ...options, signal: ctrl.signal });
            } catch (err) {
                throw new Error(err.name === 'AbortError' ? 'O motor local não respondeu em 90 s' : 'Sem conexão com o servidor');
            } finally {
                clearTimeout(timer);
            }
            let json;
            try { json = await res.json(); } catch { throw new Error(`Resposta inválida deste computador (HTTP ${res.status})`); }
            if (json.error) throw new Error(json.error);
            return json;
        }

        async function upload(file, report = (text, p) => progress.set(text, p)) {
            if (file.size > S.server.maxBytes) throw new Error(`Arquivo maior que o limite deste computador (${fmtBytes(S.server.maxBytes)})`);
            const size = S.server.chunk;
            const total = Math.max(1, Math.ceil(file.size / size));
            let id = '';
            for (let i = 0; i < total; i++) {
                checkCancel();
                const form = new FormData();
                form.append('index', String(i));
                form.append('name', file.name);
                if (id) form.append('id', id);
                form.append('chunk', file.slice(i * size, (i + 1) * size), 'chunk.bin');
                id = (await api(window.MOTOR + 'upload', { method: 'POST', body: form })).id;
                report(`Enviando ${fmtBytes(Math.min(file.size, (i + 1) * size))} de ${fmtBytes(file.size)}`, (i + 1) / total);
            }
            return id;
        }

        // Envia o arquivo uma vez só (a prévia do GIF e a exportação reaproveitam o mesmo envio)
        function ensureUpload(report) {
            if (S.serverFile === S.file && S.serverId) return Promise.resolve(S.serverId);
            if (S.uploading && S.uploadingFile === S.file) return S.uploading;
            const file = S.file;
            S.uploadingFile = file;
            S.uploading = upload(file, report)
                .then((id) => { if (S.file === file) { S.serverId = id; S.serverFile = file; } return id; })
                .finally(() => { if (S.uploadingFile === file) S.uploading = null; });
            return S.uploading;
        }

        const segmentsJson = () => JSON.stringify(track.segments(S.a, S.b).map(([s, e]) => [+s.toFixed(3), +e.toFixed(3)]));
        const gifFields = () => ({ gw: $('#vt-gif-width').value, gfps: gifFps.value, gcolors: gifColors.value, gdither: gifDither.value });

        async function postForm(url, fields) {
            const form = new FormData();
            Object.entries(fields).forEach(([k, v]) => form.append(k, v));
            return api(url, { method: 'POST', body: form });
        }

        // Prévia + tamanho do GIF: o motor gera uma amostra com as mesmas opções e extrapola
        let gifTimer = 0;
        function scheduleGif(delay = 600) {
            if (kindSeg.value !== 'gif' || !S.url || !S.server) return;
            clearTimeout(gifTimer);
            gifTimer = setTimeout(estimateGif, delay);
        }

        async function estimateGif() {
            if (S.busy || kindSeg.value !== 'gif' || !S.url) return;
            const key = JSON.stringify([S.file.name, S.file.size, S.file.lastModified, segmentsJson(), gifFields()]);
            if (key === S.gifKey) return;
            const seq = (S.gifSeq = (S.gifSeq || 0) + 1);
            const sizeEl = $('#vt-gif-size');
            const info = $('#vt-gif-info');
            sizeEl.textContent = '…';
            try {
                await ensureUpload((text, p) => { if (seq === S.gifSeq) info.textContent = `Enviando o vídeo para calcular… ${Math.round(p * 100)}%`; });
                if (seq !== S.gifSeq) return;
                info.textContent = 'Gerando a prévia…';
                const j = await postForm(window.MOTOR + 'gifest', { id: S.serverId, segments: segmentsJson(), ...gifFields() });
                if (seq !== S.gifSeq) return;
                S.gifKey = key;
                sizeEl.textContent = `${j.exact ? '' : '≈ '}${fmtBytes(j.estimate)}`;
                sizeEl.style.color = j.estimate > 10 * 1024 * 1024 ? 'var(--danger)' : j.estimate > 4 * 1024 * 1024 ? '#f5a524' : '#fff';
                info.textContent = `${j.width}×${j.height} px · ${gifFields().gfps} fps · ${j.frames} frames · ${fmtTime(j.duration)}${j.exact ? '' : ' · estimado por amostra'}`;
                $('#vt-gif-img').src = `${window.MOTOR}sample&id=${S.serverId}&t=${Date.now()}`;
                if (hasGsap) gsap.fromTo(sizeEl, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: EASE });
            } catch (err) {
                if (seq !== S.gifSeq) return;
                sizeEl.textContent = '—';
                info.textContent = err.message;
                if (/expirou|não encontrado/i.test(err.message)) S.serverFile = null;
            }
        }

        async function viaGif() {
            progress.set('Enviando…', 0);
            await ensureUpload();
            try {
                await postForm(window.MOTOR + 'process', { id: S.serverId, segments: segmentsJson(), mode: 'gif', ...gifFields() });
            } catch (err) {
                S.serverFile = null;
                throw err;
            }
            const job = await pollJob('Gerando o GIF…');
            showResult(job.size, `${window.MOTOR}download&id=${S.serverId}`, `${baseName(S.file.name)}.gif`);
        }

        // Acompanha o ffmpeg neste computador até terminar (com cancelar e vigia de progresso parado)
        async function pollJob(label) {
            progress.set(label, 0);
            const started = Date.now();
            let lastProgress = -1;
            let lastChange = Date.now();
            for (;;) {
                if (S.cancel) {
                    api(`${window.MOTOR}cancel&id=${S.serverId}`).catch(() => {});
                    checkCancel();
                }
                await sleep(700);
                const job = await api(`${window.MOTOR}job&id=${S.serverId}`);
                if (job.state === 'done') { progress.set('Pronto', 1); return job; }
                if (job.state === 'error') throw new Error(String(job.log || 'ffmpeg falhou').trim().split('\n').pop());
                if (job.progress !== lastProgress) { lastProgress = job.progress; lastChange = Date.now(); }
                else if (Date.now() - lastChange > 120000) throw new Error('O processamento parou de avançar há 2 min — tente de novo ou use o modo Navegador');
                progress.set(`${label} ${fmtClock((Date.now() - started) / 1000)}`, job.progress);
            }
        }

        function outputName(mode, quality, ext) {
            const tag = mode === 'copy' ? 'recorte' : quality === 'original' ? 'editado' : 'otimizado';
            return `${baseName(S.file.name)}-${tag}.${ext}`;
        }

        async function viaServer() {
            progress.set('Enviando…', 0);
            await ensureUpload();
            const segments = track.segments(S.a, S.b).map(([s, e]) => [+s.toFixed(3), +e.toFixed(3)]);
            const mode = segments.length > 1 ? 'optimize' : modeSeg.value;
            const quality = qualitySeg.value;
            const form = new FormData();
            const fields = {
                id: S.serverId, segments: JSON.stringify(segments), mode, quality,
                width: quality === 'original' ? '0' : $('#vt-width').value, audio: audioSeg.value === 'keep' ? '1' : '0'
            };
            Object.entries(fields).forEach(([k, v]) => form.append(k, v));
            try {
                await api(window.MOTOR + 'process', { method: 'POST', body: form });
            } catch (err) {
                S.serverFile = null; // o temporário pode ter expirado: na próxima, envia de novo
                throw err;
            }
            const job = await pollJob('Processando neste computador…');
            const ext = mode === 'copy' ? (S.file.name.split('.').pop() || 'mp4').toLowerCase() : 'mp4';
            showResult(job.size, `${window.MOTOR}download&id=${S.serverId}`, outputName(mode, quality, ext));
        }

        function recorderMime() {
            if (!window.MediaRecorder) return '';
            const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
            return list.find((m) => MediaRecorder.isTypeSupported(m)) || '';
        }

        // Grava o próprio player num canvas + o áudio via Web Audio, trecho a trecho
        // (o gravador pausa durante cada salto, então as emendas não ficam com buraco)
        async function viaBrowser() {
            if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Este navegador não grava vídeo');
            const segments = track.segments(S.a, S.b);
            const total = segments.reduce((n, [s, e]) => n + e - s, 0);
            const keepAudio = audioSeg.value === 'keep';
            const quality = qualitySeg.value;
            const maxW = quality === 'original' ? 0 : +$('#vt-width').value || 0;
            let w = video.videoWidth;
            let h = video.videoHeight;
            if (maxW && w > maxW) { h = (h * maxW) / w; w = maxW; }
            w = Math.round(w / 2) * 2;
            h = Math.round(h / 2) * 2;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const g = canvas.getContext('2d');
            const fps = 30;
            const factor = { high: 0.14, balanced: 0.08, small: 0.045 }[quality];
            const bitrate = quality === 'original'
                ? clamp(((S.file.size * 8) / S.d) * 1.15, w * h * fps * 0.1, 60e6)
                : w * h * fps * factor;
            const stream = canvas.captureStream(fps);
            let dest = null;
            if (keepAudio) {
                if (!actx) {
                    actx = new (window.AudioContext || window.webkitAudioContext)();
                    mainSource = actx.createMediaElementSource(video);
                    mainSource.connect(actx.destination);
                }
                await actx.resume();
                dest = actx.createMediaStreamDestination();
                mainSource.connect(dest);
                dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
            }
            const mime = recorderMime();
            const recorder = new MediaRecorder(stream, {
                mimeType: mime || undefined, videoBitsPerSecond: Math.round(bitrate), audioBitsPerSecond: quality === 'original' ? 192000 : 128000
            });
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
            const stopped = new Promise((resolve) => { recorder.onstop = resolve; });

            let done = 0;
            try {
                for (let i = 0; i < segments.length; i++) {
                    const [s, e] = segments[i];
                    checkCancel();
                    video.currentTime = s;
                    await waitEvent(video, 'seeked').catch(() => {});
                    g.drawImage(video, 0, 0, w, h);
                    if (i === 0) recorder.start(500); else recorder.resume();
                    await Promise.race([video.play(), sleep(8000).then(() => { throw new Error('O vídeo não começou a tocar'); })]);
                    // Timer fixo (e não rAF): continua capturando mesmo com a janela coberta.
                    // Vigia: se o vídeo ficar 8 s parado (aba em segundo plano, travou), para com erro.
                    await new Promise((resolve, reject) => {
                        let lastT = video.currentTime;
                        let lastMove = Date.now();
                        const timer = setInterval(() => {
                            g.drawImage(video, 0, 0, w, h);
                            const now = done + Math.max(0, video.currentTime - s);
                            progress.set(`Gravando ${fmtTime(now)} de ${fmtTime(total)} — mantenha esta aba aberta`, now / total);
                            tl.setTime(clamp(S.a + now, 0, S.out));
                            if (video.currentTime !== lastT) { lastT = video.currentTime; lastMove = Date.now(); }
                            if (video.currentTime >= e || video.ended) { clearInterval(timer); resolve(); }
                            else if (S.cancel) { clearInterval(timer); reject(new Error('Exportação cancelada')); }
                            else if (Date.now() - lastMove > 8000) { clearInterval(timer); reject(new Error('O vídeo parou de tocar durante a gravação — deixe esta aba visível e tente de novo')); }
                        }, 1000 / fps);
                    });
                    video.pause();
                    recorder.pause();
                    done += e - s;
                }
            } catch (err) {
                video.pause();
                if (recorder.state !== 'inactive') recorder.stop();
                if (dest) mainSource.disconnect(dest);
                throw err;
            }
            recorder.stop();
            await stopped;
            if (dest) mainSource.disconnect(dest);
            const type = (mime || 'video/webm').split(';')[0];
            const blob = new Blob(chunks, { type });
            if (S.resultUrl) URL.revokeObjectURL(S.resultUrl);
            S.resultUrl = URL.createObjectURL(blob);
            progress.set('Pronto', 1);
            showResult(blob.size, S.resultUrl, outputName('optimize', quality, type.includes('mp4') ? 'mp4' : 'webm'));
        }

        tools.video = {
            open(file, serverId) {
                load(file);
                S.fromLink = true;
                if (serverId) { S.serverId = serverId; S.serverFile = file; }
            },
            show: () => { checkServer(); sync(); requestAnimationFrame(() => { drawStrip(); track.render(false); }); },
            hide: () => { if (!S.busy) video.pause(); },
            key(e) {
                if (!S.url || S.busy) return false;
                if (track.key(e)) return true;
                if (e.metaKey || e.ctrlKey) return false;
                const k = e.key.toLowerCase();
                if (e.key === ' ') { toggle(); return true; }
                if (k === 'i') { tl.setRange(outTime(), S.b, 'a'); return true; }
                if (k === 'o') { tl.setRange(S.a, outTime(), 'b'); return true; }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    video.pause();
                    seekOut(outTime() + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30));
                    return true;
                }
                return false;
            }
        };
    })();


    /* =====================================================================
       Editor — vários vídeos numa versão final: faixa V1 (sequência) + faixas A1/A2 (livres)
       ===================================================================== */
    (() => {
        // Fontes = arquivos (vídeo ou áudio). Clipes guardam trechos [in, out] da fonte, em segundos.
        // V1 é magnética (clipes em sequência); A1/A2 têm posição livre (start) e fade/volume por clipe.
        const E = { sources: [], video: [], audio: [], sel: null, t: 0, playing: false, pps: 40, undo: [], redo: [], seq: 0, server: null, busy: false, cancel: false, resultUrl: null };
        const stage = $('#ed-stage');
        const scroller = $('#ed-scroll');
        const inner = $('#ed-inner');
        const lanes = { v: $('#ed-lane-v'), a0: $('#ed-lane-a0'), a1: $('#ed-lane-a1') };
        const rulerCv = $('#ed-ruler');
        const playhead = $('#ed-playhead');
        const playBtn = $('#ed-play');
        const progress = progressUI($('#ed-progress'));
        const LANE_H = { v: 68, a: 56 };
        let ctx = null;
        let clock = null;
        let raf = 0;
        let nodes = [];
        let cur = null;
        let dragSid = null;
        let knobSnap = null;
        let knobTimer = 0;
        let renderQueued = false;

        const SPEED_LOG = [-2, 4]; // barra em log2: 0,25× a 16×, com 1× no ponto certo
        const SPEED_SNAP = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16];
        const speedFromSlider = (x) => SPEED_SNAP.find((n) => Math.abs(Math.log2(n) - x) < 0.05) ?? +(2 ** x).toFixed(2);
        const fmtSpeed = (v) => `${String(+v.toFixed(2)).replace('.', ',')}×`;
        const fmtSpan = (s) => (s < 60 ? `${s.toFixed(2).replace('.', ',')} s` : fmtTime(s));
        const slen = (c) => c.out - c.in; // duração na fonte
        const clen = (c) => slen(c) / (c.speed || 1); // duração na linha do tempo (só vídeo tem velocidade)
        const srcOf = (c) => E.sources.find((s) => s.sid === c.sid);
        const findClip = (cid) => E.video.find((c) => c.cid === cid) || E.audio.find((c) => c.cid === cid) || null;
        const isVideoClip = (c) => E.video.includes(c);
        function vLayout() {
            let o = 0;
            return E.video.map((c) => { const r = { c, start: o, end: o + clen(c) }; o = r.end; return r; });
        }
        const vEnd = () => E.video.reduce((n, c) => n + clen(c), 0);
        const total = () => Math.max(vEnd(), ...E.audio.map((a) => a.start + clen(a)), 0);
        // A versão final dura o mesmo que a faixa V1: áudio que passa do fim do vídeo é cortado
        const finalEnd = () => (E.video.length ? vEnd() : total());
        const clipStart = (c) => (isVideoClip(c) ? vLayout().find((r) => r.c === c).start : c.start);
        const timeAt = (clientX) => Math.max(0, (clientX - scroller.getBoundingClientRect().left + scroller.scrollLeft) / E.pps);
        function makeCtx() {
            const AC = window.AudioContext || window.webkitAudioContext;
            return new AC();
        }

        // ---------- Fontes ----------
        bindDrop($('#ed-drop'), $('#ed-input'), (files) => addFiles(files));
        $('#ed-add').addEventListener('click', () => $('#ed-input').click());

        function kindOf(file) {
            if (file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)$/i.test(file.name)) return 'audio';
            if (file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) return 'video';
            return null;
        }

        // segments: trechos [in, out] já cortados em outra aba (entram como clipes separados em V1)
        async function addFiles(files, { serverId = null, segments = null } = {}) {
            for (const file of files) {
                const kind = kindOf(file);
                if (!kind) { notify(`${file.name}: formato não reconhecido`); continue; }
                const src = { sid: ++E.seq, kind, name: file.name, file, url: URL.createObjectURL(file), dur: 0, serverId, serverFile: serverId ? file : null, ready: false };
                E.sources.push(src);
                renderBin();
                try {
                    if (kind === 'video') await prepVideo(src);
                    else await prepAudio(src);
                    src.ready = true;
                } catch (err) {
                    src.error = err.message || 'não foi possível abrir';
                }
                renderBin();
                if (!src.ready) continue;
                const snap = snapshot();
                if (kind === 'video') {
                    const segs = segments && segments.length ? segments : [[0, src.dur]];
                    segs.forEach(([a, b]) => E.video.push({ cid: ++E.seq, sid: src.sid, in: a, out: Math.min(b, src.dur), mute: false, vol: 1 }));
                } else {
                    // áudio novo entra na primeira faixa livre, a partir do início
                    const track = E.audio.some((a) => a.track === 0) ? (E.audio.some((a) => a.track === 1) ? -1 : 1) : 0;
                    if (track >= 0) E.audio.push({ cid: ++E.seq, sid: src.sid, in: 0, out: src.dur, start: 0, track, vol: 1, fi: 0, fo: 0 });
                }
                pushUndo(snap);
                fitStage();
                renderAll();
                showFrame();
            }
        }

        async function prepVideo(src) {
            const el = document.createElement('video');
            el.playsInline = true;
            el.preload = 'auto';
            el.src = src.url;
            stage.appendChild(el);
            try { await waitEvent(el, 'loadedmetadata', 15000); } catch { el.remove(); throw new Error('este navegador não abre esse vídeo'); }
            src.dur = await ensureDuration(el);
            src.w = el.videoWidth;
            src.h = el.videoHeight;
            src.el = el;
            buildThumbs(src);
        }

        async function buildThumbs(src) {
            const v = document.createElement('video');
            v.muted = true;
            v.playsInline = true;
            v.preload = 'auto';
            v.src = src.url;
            try { await waitEvent(v, 'loadeddata', 10000); } catch { return; }
            const n = clamp(Math.round(src.dur * 1.5), 6, 60);
            const h = 56;
            const w = Math.max(8, Math.round((h * (src.w || 16)) / (src.h || 9)));
            src.thumbs = { n, tiles: [], ratio: w / h };
            for (let i = 0; i < n; i++) {
                v.currentTime = ((i + 0.5) / n) * src.dur;
                try { await waitEvent(v, 'seeked', 5000); } catch { continue; }
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                c.getContext('2d').drawImage(v, 0, 0, w, h);
                src.thumbs.tiles[i] = c;
                if (i % 6 === 5 || i === n - 1) queueRender();
            }
            v.removeAttribute('src');
            v.load();
        }

        async function prepAudio(src) {
            ctx = ctx || makeCtx();
            try { src.buf = await ctx.decodeAudioData(await src.file.arrayBuffer()); } catch { throw new Error('este áudio não abre'); }
            src.dur = src.buf.duration;
            makePeaks(src);
        }

        function makePeaks(src) {
            // picos para a forma de onda: 100 por segundo
            const n = Math.max(1, Math.ceil(src.dur * 100));
            const chans = Array.from({ length: Math.min(2, src.buf.numberOfChannels) }, (_, c) => src.buf.getChannelData(c));
            const per = chans[0].length / n;
            const peaks = new Float32Array(n);
            let max = 0;
            for (let i = 0; i < n; i++) {
                const s0 = Math.floor(i * per);
                const s1 = Math.min(chans[0].length, Math.floor((i + 1) * per));
                let m = 0;
                for (const d of chans) for (let j = s0; j < s1; j += 4) { const v = Math.abs(d[j]); if (v > m) m = v; }
                peaks[i] = m;
                if (m > max) max = m;
            }
            src.peaks = peaks;
            src.peakNorm = max > 0 ? 1 / max : 1;
        }

        function renderBin() {
            const bin = $('#ed-bin');
            bin.innerHTML = '';
            E.sources.forEach((s) => {
                const row = document.createElement('div');
                row.className = 'ed-bin-item';
                row.draggable = !!s.ready;
                row.dataset.sid = s.sid;
                row.innerHTML = `<i class="k fas fa-${s.kind === 'video' ? 'film' : 'music'}"></i>
                    <div class="min-w-0"><div class="ed-bin-name"></div><div class="ed-bin-meta"></div></div>
                    <button class="btn btn-icon" title="${s.kind === 'video' ? 'Colocar no fim da faixa V1' : 'Colocar na agulha (A1/A2)'}"${s.ready ? '' : ' disabled'}><i class="fas fa-plus"></i></button>`;
                $('.ed-bin-name', row).textContent = s.name;
                $('.ed-bin-meta', row).textContent = s.error ? s.error : s.ready ? `${fmtTime(s.dur)}${s.w ? ` · ${s.w}×${s.h}` : ''} · ${fmtBytes(s.file.size)}` : 'preparando…';
                $('button', row).addEventListener('click', () => addSourceClip(s));
                row.addEventListener('dragstart', (e) => { dragSid = s.sid; e.dataTransfer.setData('text/plain', String(s.sid)); e.dataTransfer.effectAllowed = 'copy'; });
                row.addEventListener('dragend', () => { dragSid = null; Object.values(lanes).forEach((l) => l.classList.remove('is-drop')); });
                bin.appendChild(row);
            });
            $('#ed-drop').classList.toggle('is-compact-ed', E.sources.length > 0);
        }

        function addSourceClip(s, at = null, track = null) {
            const snap = snapshot();
            if (s.kind === 'video') {
                const clip = { cid: ++E.seq, sid: s.sid, in: 0, out: s.dur, mute: false, vol: 1 };
                if (at == null) E.video.push(clip);
                else E.video.splice(at, 0, clip);
                E.sel = clip.cid;
            } else {
                const start = at ?? E.t;
                const t0 = track ?? (E.audio.some((a) => a.track === 0 && start < a.start + clen(a) && start + s.dur > a.start) ? 1 : 0);
                const clip = { cid: ++E.seq, sid: s.sid, in: 0, out: s.dur, start, track: t0, vol: 1, fi: 0, fo: 0 };
                E.audio.push(clip);
                E.sel = clip.cid;
            }
            pushUndo(snap);
            fitStage();
            renderAll();
            showFrame();
        }

        // soltar da lista de arquivos direto na faixa
        Object.entries(lanes).forEach(([key, lane]) => {
            lane.addEventListener('dragover', (e) => {
                const s = E.sources.find((x) => x.sid === dragSid);
                if (!s || (s.kind === 'video') !== (key === 'v')) return;
                e.preventDefault();
                lane.classList.add('is-drop');
            });
            lane.addEventListener('dragleave', () => lane.classList.remove('is-drop'));
            lane.addEventListener('drop', (e) => {
                e.preventDefault();
                lane.classList.remove('is-drop');
                const s = E.sources.find((x) => x.sid === +e.dataTransfer.getData('text/plain'));
                if (!s || !s.ready || (s.kind === 'video') !== (key === 'v')) return;
                const t = timeAt(e.clientX);
                if (key === 'v') addSourceClip(s, vLayout().filter((r) => (r.start + r.end) / 2 < t).length);
                else addSourceClip(s, t, key === 'a1' ? 1 : 0);
            });
        });

        // ---------- Desfazer ----------
        const snapshot = () => JSON.stringify({ video: E.video, audio: E.audio, sel: E.sel });
        function pushUndo(snap) {
            E.undo.push(snap);
            if (E.undo.length > 100) E.undo.shift();
            E.redo.length = 0;
        }
        function restore(json) {
            const st = JSON.parse(json);
            E.video = st.video;
            E.audio = st.audio;
            E.sel = st.sel;
            if (E.playing) pause();
            renderAll();
            showFrame();
        }
        function undoEdit() { if (!E.undo.length) return; E.redo.push(snapshot()); restore(E.undo.pop()); notify('Desfeito'); }
        function redoEdit() { if (!E.redo.length) return; E.undo.push(snapshot()); restore(E.redo.pop()); notify('Refeito'); }

        // ---------- Linha do tempo ----------
        function fitStage() {
            const first = E.video[0] && srcOf(E.video[0]);
            const [w, h] = resolution(first);
            stage.style.aspectRatio = `${w} / ${h}`;
            $('#ed-stage-empty').classList.toggle('is-hidden', E.video.length > 0);
        }

        function queueRender() {
            if (renderQueued) return;
            renderQueued = true;
            nextFrame().then(() => { renderQueued = false; renderTimeline(); });
        }

        function renderAll() {
            renderTimeline();
            renderInspector();
        }

        function renderTimeline() {
            const tot = total();
            const width = Math.max(scroller.clientWidth, (tot + 8) * E.pps);
            inner.style.width = `${width}px`;
            Object.values(lanes).forEach((l) => { l.querySelectorAll('.ed-clip').forEach((n) => n.remove()); });
            vLayout().forEach(({ c, start }) => lanes.v.appendChild(clipEl(c, start, 'v')));
            E.audio.forEach((c) => lanes[c.track === 1 ? 'a1' : 'a0'].appendChild(clipEl(c, c.start, 'a')));
            const endMark = $('#ed-end');
            endMark.style.left = `${vEnd() * E.pps}px`;
            endMark.classList.toggle('is-hidden', !E.video.length || total() <= vEnd() + 0.01);
            drawRuler();
            movePlayhead();
            $('#ed-total').textContent = fmtTime(finalEnd());
            $('#ed-undo').disabled = !E.undo.length;
            $('#ed-empty').classList.toggle('is-hidden', E.video.length + E.audio.length > 0);
        }

        function clipEl(c, start, kind) {
            const src = srcOf(c);
            const el = document.createElement('div');
            el.className = `ed-clip ed-${kind}${c.cid === E.sel ? ' is-sel' : ''}`;
            el.dataset.cid = c.cid;
            const w = Math.max(3, clen(c) * E.pps);
            el.style.left = `${start * E.pps}px`;
            el.style.width = `${w}px`;
            const cv = document.createElement('canvas');
            el.appendChild(cv);
            const name = document.createElement('span');
            name.className = 'ed-name';
            name.textContent = src ? src.name : '?';
            el.appendChild(name);
            let extra = '<i class="ed-edge l" data-drag="l"></i><i class="ed-edge r" data-drag="r"></i>';
            if (kind === 'a') {
                extra += `<i class="ed-fade" data-drag="fi" style="left:${Math.max(6, c.fi * E.pps)}px" title="Fade in"></i>`;
                extra += `<i class="ed-fade" data-drag="fo" style="left:${Math.min(w - 6, w - c.fo * E.pps)}px" title="Fade out"></i>`;
            }
            if (kind === 'v' && c.mute) extra += '<i class="fas fa-volume-xmark ed-mute" title="Som do vídeo desligado"></i>';
            if (kind === 'v' && (c.speed || 1) !== 1) extra += `<span class="ed-peak" title="Velocidade do clipe">${fmtSpeed(c.speed)}</span>`;
            if (kind === 'a' && src && src.peaks) {
                // pico do trecho com o volume do clipe
                let pk = 0;
                for (let i = Math.floor(c.in * 100), end = Math.min(src.peaks.length, Math.ceil(c.out * 100)); i < end; i++) pk = Math.max(pk, src.peaks[i]);
                pk *= c.vol;
                const tone = levelTone(pk);
                extra += `<span class="ed-peak lv-${tone}" title="Pico com o volume do clipe. Vermelho: passa de −1 dB (estoura) · Azul: abaixo de −20 dB (baixo)">${fmtDb(pk)}</span>`;
            }
            el.insertAdjacentHTML('beforeend', extra);
            drawClip(cv, c, src, kind, w, (kind === 'v' ? LANE_H.v : LANE_H.a) - 11); // faixa − borda (1) − folgas (5+5)
            return el;
        }

        function drawClip(cv, c, src, kind, w, h) {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const W = Math.min(8000, Math.round(w * dpr));
            const H = Math.round(h * dpr);
            cv.width = W;
            cv.height = H;
            const g = cv.getContext('2d');
            if (!src) return;
            if (kind === 'v') {
                const th = src.thumbs;
                if (!th) return;
                // a tela tem no máximo 8000 px: em clipes longos ela é esticada na largura, então a miniatura encolhe na mesma conta
                const sx = W / (w * dpr);
                const tileW = Math.max(2, H * th.ratio * sx);
                for (let x = 0; x < W; x += tileW) {
                    const t = c.in + ((x + tileW / 2) / W) * slen(c);
                    const tile = th.tiles[clamp(Math.floor((t / src.dur) * th.n), 0, th.n - 1)];
                    if (tile) g.drawImage(tile, x, 0, tileW, H);
                }
                if (c.mute) { g.fillStyle = 'rgba(0, 0, 0, .35)'; g.fillRect(0, 0, W, H); }
                return;
            }
            // áudio: forma de onda do trecho, já com volume e fades
            const pk = src.peaks;
            if (!pk) return;
            const mid = H / 2;
            const len = clen(c);
            const env = (x) => {
                const t = (x / W) * len;
                let k = 1;
                if (c.fi > 0 && t < c.fi) k = Math.min(k, t / c.fi);
                if (c.fo > 0 && t > len - c.fo) k = Math.min(k, (len - t) / c.fo);
                return clamp(k, 0, 1);
            };
            const amp = H * 0.46; // escala real: o volume do clipe entra na conta (até 200%)
            for (let x = 0; x < W; x++) {
                const t = c.in + (x / W) * len;
                const v = pk[clamp(Math.floor(t * 100), 0, pk.length - 1)] * c.vol * env(x);
                g.fillStyle = v >= LEVEL_HOT ? LEVEL_COLOR.hot : v < LEVEL_LOW ? LEVEL_COLOR.low : 'rgba(225, 230, 245, .85)';
                const a = Math.max(1, Math.min(1, v) * amp);
                g.fillRect(x, mid - a, 1, a * 2);
            }
            drawLevelLines(g, W, mid, amp, dpr);
            if (c.fi > 0 || c.fo > 0) {
                // envelope do fade
                g.strokeStyle = '#fff';
                g.lineWidth = 1.2 * dpr;
                g.beginPath();
                g.moveTo(0, c.fi > 0 ? H - 2 : 2);
                g.lineTo((c.fi / len) * W, 2);
                g.lineTo(W - (c.fo / len) * W, 2);
                g.lineTo(W, c.fo > 0 ? H - 2 : 2);
                g.stroke();
            }
        }

        function drawRuler() {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const w = scroller.clientWidth;
            rulerCv.style.width = `${w}px`;
            rulerCv.width = Math.round(w * dpr);
            rulerCv.height = Math.round(26 * dpr);
            const g = rulerCv.getContext('2d');
            g.scale(dpr, dpr);
            g.clearRect(0, 0, w, 26);
            const t0 = scroller.scrollLeft / E.pps;
            const t1 = t0 + w / E.pps;
            // passo legível: marcas a cada ~80 px
            const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
            const step = steps.find((s) => s * E.pps >= 80) || 600;
            g.font = "10.5px monospace";
            g.textBaseline = 'top';
            for (let t = Math.floor(t0 / step) * step; t <= t1; t += step) {
                const x = Math.round((t - t0) * E.pps) + 0.5;
                g.fillStyle = '#3a3a3a';
                g.fillRect(x, 14, 1, 12);
                g.fillStyle = '#8d8d8d';
                const m = Math.floor(t / 60);
                const s = t - m * 60;
                g.fillText(`${m}:${(step < 1 ? s.toFixed(step < 0.5 ? 2 : 1) : String(Math.round(s))).padStart(step < 1 ? 4 : 2, '0')}`, x + 4, 3);
                for (let k = 1; k < 4; k++) {
                    const xs = Math.round((t + (step * k) / 4 - t0) * E.pps) + 0.5;
                    g.fillStyle = '#262626';
                    g.fillRect(xs, 20, 1, 6);
                }
            }
        }
        scroller.addEventListener('scroll', drawRuler);

        function movePlayhead(follow = false) {
            const x = E.t * E.pps;
            playhead.style.left = `${x}px`;
            $('#ed-pos').textContent = fmtTime(E.t);
            if (follow) {
                const w = scroller.clientWidth;
                if (x > scroller.scrollLeft + w - 60 || x < scroller.scrollLeft) scroller.scrollLeft = Math.max(0, x - 80);
            }
        }

        // ---------- Arrastar: mover, recortar bordas, fades, agulha ----------
        $('#ed-tracks').addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const clipNode = e.target.closest('.ed-clip');
            if (!clipNode) { // fora dos clipes (régua ou faixa vazia): posiciona/arrasta a agulha
                if (!e.target.closest('.ed-lane, .ed-ruler')) return;
                e.preventDefault();
                if (E.sel) { E.sel = null; renderAll(); }
                scrubFrom(e);
                return;
            }
            e.preventDefault();
            const c = findClip(+clipNode.dataset.cid);
            if (!c) return;
            const mode = e.target.dataset.drag || 'move';
            const snap = snapshot();
            const orig = { ...c };
            const x0 = e.clientX;
            const video = isVideoClip(c);
            let moved = false;
            let target = video ? E.video.indexOf(c) : -1;
            if (E.sel !== c.cid) { E.sel = c.cid; renderAll(); }
            const node = () => inner.querySelector(`.ed-clip[data-cid="${c.cid}"]`);
            const marker = $('#ed-drop-mark');
            const move = (ev) => {
                if (!moved && Math.abs(ev.clientX - x0) < 3) return;
                if (!moved) { moved = true; if (E.playing) pause(); }
                const dx = (ev.clientX - x0) / E.pps;
                const sp = orig.speed || 1;
                const src = srcOf(c);
                if (video && mode === 'move') {
                    // V1: reordena — o clipe acompanha o mouse e a linha azul mostra onde entra
                    const n = node();
                    if (n) { n.classList.add('is-drag'); n.style.transform = `translateX(${ev.clientX - x0}px)`; }
                    const t = timeAt(ev.clientX);
                    const others = vLayout().filter((r) => r.c !== c);
                    target = others.filter((r) => (r.start + r.end) / 2 < t).length;
                    const edge = target === 0 ? (others[0] ? others[0].start : 0) : others[target - 1].end;
                    marker.style.left = `${Math.max(0, edge) * E.pps}px`;
                    marker.classList.remove('is-hidden');
                    return;
                }
                if (mode === 'l') {
                    if (video) c.in = clamp(orig.in + dx * sp, 0, orig.out - 0.1);
                    else {
                        const d = clamp(dx, Math.max(-orig.in, -orig.start), clen(orig) - 0.1);
                        c.in = orig.in + d;
                        c.start = orig.start + d;
                    }
                } else if (mode === 'r') {
                    c.out = clamp(orig.out + dx * sp, orig.in + 0.1, src ? src.dur : orig.out);
                } else if (mode === 'fi') {
                    c.fi = clamp(orig.fi + dx, 0, clen(c) - c.fo);
                } else if (mode === 'fo') {
                    c.fo = clamp(orig.fo - dx, 0, clen(c) - c.fi);
                } else {
                    // A1/A2: posição livre com ímã na agulha, no início e nas bordas dos outros clipes
                    let start = Math.max(0, orig.start + dx);
                    const snaps = [0, E.t, ...vLayout().flatMap((r) => [r.start, r.end]), ...E.audio.filter((a) => a !== c).flatMap((a) => [a.start, a.start + clen(a)])];
                    const tol = 8 / E.pps;
                    for (const sp of snaps) {
                        if (Math.abs(start - sp) < tol) { start = sp; break; }
                        if (Math.abs(start + clen(c) - sp) < tol) { start = sp - clen(c); break; }
                    }
                    c.start = Math.max(0, start);
                    const lane = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.ed-lane');
                    if (lane && lane.dataset.track !== 'v') c.track = lane.dataset.track === 'a1' ? 1 : 0;
                }
                if (c.fi + c.fo > clen(c)) { c.fi = Math.min(c.fi, clen(c)); c.fo = Math.max(0, clen(c) - c.fi); }
                renderTimeline();
                if (!video) return;
                showFrame();
            };
            const up = (ev) => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                window.removeEventListener('pointercancel', up);
                marker.classList.add('is-hidden');
                if (!moved) { seekTo(timeAt(ev.clientX)); renderInspector(); return; }
                if (video && mode === 'move') {
                    const from = E.video.indexOf(c);
                    if (target !== from) { E.video.splice(from, 1); E.video.splice(target, 0, c); }
                }
                if (snap !== snapshot()) pushUndo(snap);
                renderAll();
                showFrame();
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);
        });

        function scrubFrom(e) {
            const wasPlaying = E.playing;
            if (wasPlaying) pause();
            seekTo(timeAt(e.clientX));
            const move = (ev) => seekTo(timeAt(ev.clientX));
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                if (wasPlaying) play();
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        }

        // zoom: controle deslizante ou ⌘/Ctrl + roda (mantém o ponto sob o mouse)
        const zoomInput = $('#ed-zoom');
        function setZoom(pps, anchorX = null) {
            const ax = anchorX ?? scroller.clientWidth / 2;
            const tAnchor = (scroller.scrollLeft + ax) / E.pps;
            E.pps = clamp(pps, 8, 240);
            zoomInput.value = String(Math.round(E.pps));
            renderTimeline();
            scroller.scrollLeft = Math.max(0, tAnchor * E.pps - ax);
            drawRuler();
        }
        zoomInput.addEventListener('input', () => setZoom(+zoomInput.value));
        scroller.addEventListener('wheel', (e) => {
            if (!e.metaKey && !e.ctrlKey) return;
            e.preventDefault();
            setZoom(E.pps * Math.exp(-e.deltaY * 0.002), e.clientX - scroller.getBoundingClientRect().left);
        }, { passive: false });
        if ('ResizeObserver' in window) new ResizeObserver(() => queueRender()).observe(scroller);

        // ---------- Prévia ----------
        function resolution(first) {
            const v = $('#ed-res').value;
            if (v !== 'first') return v.split('x').map(Number);
            return first && first.w ? [first.w, first.h] : [1280, 720];
        }
        $('#ed-res').addEventListener('change', () => fitStage());

        const now = () => (E.playing && clock ? clock.t0 + Math.max(0, ctx.currentTime - clock.at) : E.t);

        function hideAll() {
            E.sources.forEach((s) => { if (s.el) { s.el.pause(); s.el.classList.remove('is-on'); } });
        }

        // Mostra o clipe de V1 que está na agulha (troca de elemento <video> entre fontes)
        function syncVideo(t, playing) {
            const r = vLayout().find((x) => t >= x.start && t < x.end) || null;
            if (!r) { if (cur) { cur.el.pause(); cur.el.classList.remove('is-on'); cur = null; } return; }
            const src = srcOf(r.c);
            if (!src || !src.el) return;
            const el = src.el;
            const speed = r.c.speed || 1;
            const want = r.c.in + (t - r.start) * speed;
            if (!cur || cur.clip !== r.c) {
                if (cur && cur.el !== el) { cur.el.pause(); cur.el.classList.remove('is-on'); }
                el.currentTime = want;
                el.muted = !!r.c.mute || speed !== 1;
                el.playbackRate = speed;
                el.volume = clamp(r.c.vol ?? 1, 0, 1);
                el.classList.add('is-on');
                if (playing) el.play().catch(() => {});
                cur = { clip: r.c, el };
            } else if (playing && Math.abs(el.currentTime - want) > 0.3 * Math.max(1, speed)) {
                el.currentTime = want;
            } else if (!playing) {
                el.currentTime = want;
            }
        }

        function showFrame() {
            if (E.playing) return;
            cur = null;
            hideAll();
            syncVideo(Math.min(E.t, Math.max(0, vEnd() - 0.001)), false);
        }

        function seekTo(t) {
            E.t = clamp(t, 0, total());
            if (E.playing) { pause(); E.t = clamp(t, 0, total()); play(); return; }
            movePlayhead();
            showFrame();
        }

        function scheduleAudio(t0, at) {
            for (const c of E.audio) {
                const src = srcOf(c);
                if (!src || !src.buf) continue;
                const len = clen(c);
                if (c.start + len <= t0) continue;
                const off = Math.max(0, t0 - c.start);
                const when = at + Math.max(0, c.start - t0);
                const node = ctx.createBufferSource();
                const gain = ctx.createGain();
                node.buffer = src.buf;
                node.connect(gain).connect(ctx.destination);
                const vol = c.vol;
                const env = (x) => {
                    let k = 1;
                    if (c.fi > 0 && x < c.fi) k = Math.min(k, x / c.fi);
                    if (c.fo > 0 && x > len - c.fo) k = Math.min(k, (len - x) / c.fo);
                    return clamp(k, 0, 1) * vol;
                };
                gain.gain.setValueAtTime(env(off), when);
                if (c.fi > 0 && off < c.fi) gain.gain.linearRampToValueAtTime(vol, when + (c.fi - off));
                if (c.fo > 0) {
                    const foStart = len - c.fo;
                    if (off < foStart) gain.gain.setValueAtTime(vol, when + (foStart - off));
                    gain.gain.linearRampToValueAtTime(0, when + (len - off));
                }
                node.start(when, c.in + off, len - off);
                nodes.push(node);
            }
        }

        function play() {
            if (!E.video.length && !E.audio.length) return;
            ctx = ctx || makeCtx();
            ctx.resume();
            if (E.t >= finalEnd() - 0.05) E.t = 0;
            const at = ctx.currentTime + 0.08;
            clock = { t0: E.t, at };
            E.playing = true;
            setPlayIcon(playBtn, true);
            scheduleAudio(E.t, at);
            cur = null;
            hideAll();
            loop();
        }

        function loop() {
            cancelAnimationFrame(raf);
            if (!E.playing) return;
            const t = now();
            if (t >= finalEnd()) { pause(); E.t = finalEnd(); movePlayhead(); return; }
            syncVideo(t, true);
            E.t = t;
            movePlayhead(true);
            raf = requestAnimationFrame(loop);
        }

        function pause() {
            if (!E.playing) return;
            E.t = now();
            E.playing = false;
            cancelAnimationFrame(raf);
            nodes.forEach((n) => { try { n.stop(); } catch { /* ok */ } });
            nodes = [];
            if (cur) cur.el.pause();
            setPlayIcon(playBtn, false);
            movePlayhead();
        }

        const toggle = () => (E.playing ? pause() : play());
        playBtn.addEventListener('click', toggle);
        stage.addEventListener('click', toggle);

        // ---------- Edição ----------
        function cut() {
            const t = E.playing ? now() : E.t;
            const inside = (c) => { const s = clipStart(c); return t > s + 0.05 && t < s + clen(c) - 0.05; };
            let c = E.sel ? findClip(E.sel) : null;
            if (!c || !inside(c)) c = vLayout().find((r) => t > r.start + 0.05 && t < r.end - 0.05)?.c || null;
            if (!c) { notify('Coloque a agulha dentro de um clipe para cortar'); shake($('#ed-cut')); return; }
            const snap = snapshot();
            if (isVideoClip(c)) {
                const at = c.in + (t - clipStart(c)) * (c.speed || 1);
                const right = { ...c, cid: ++E.seq, in: at };
                c.out = at;
                E.video.splice(E.video.indexOf(c) + 1, 0, right);
                E.sel = right.cid;
            } else {
                const at = c.in + (t - c.start);
                const right = { ...c, cid: ++E.seq, in: at, start: t, fi: 0 };
                c.out = at;
                c.fo = 0;
                c.fi = Math.min(c.fi, clen(c));
                right.fo = Math.min(right.fo, clen(right));
                E.audio.push(right);
                E.sel = right.cid;
            }
            pushUndo(snap);
            if (E.playing) { pause(); play(); }
            renderAll();
        }

        function removeSel() {
            const c = E.sel ? findClip(E.sel) : null;
            if (!c) { notify('Selecione um clipe para excluir'); return; }
            const snap = snapshot();
            if (isVideoClip(c)) E.video.splice(E.video.indexOf(c), 1);
            else E.audio.splice(E.audio.indexOf(c), 1);
            E.sel = null;
            E.t = Math.min(E.t, total());
            pushUndo(snap);
            if (E.playing) pause();
            fitStage();
            renderAll();
            showFrame();
        }

        $('#ed-cut').addEventListener('click', cut);
        $('#ed-del').addEventListener('click', removeSel);
        $('#ed-undo').addEventListener('click', undoEdit);

        // ---------- Inspetor do clipe selecionado ----------
        async function loadSound(src) {
            if (src.buf) return true;
            if (src.noSound) return false;
            ctx = ctx || makeCtx();
            try {
                src.buf = await ctx.decodeAudioData(await src.file.arrayBuffer());
                makePeaks(src);
                return true;
            } catch {
                src.noSound = true;
                return false;
            }
        }

        // som de um trecho do vídeo vira clipe de áudio na velocidade normal, a partir de start
        function pushExtracted(src, range, start) {
            const len = range.out - range.in;
            const busy = (t) => E.audio.some((a) => a.track === t && start < a.start + clen(a) - 0.001 && start + len > a.start + 0.001);
            const clip = { cid: ++E.seq, sid: src.sid, in: range.in, out: range.out, start, track: busy(0) && !busy(1) ? 1 : 0, vol: range.vol, fi: 0, fo: 0 };
            E.audio.push(clip);
            return clip;
        }

        // som do clipe de vídeo vira clipe de áudio alinhado (mesmo arquivo, mesmo trecho)
        async function extractAudio(c, btn) {
            const src = srcOf(c);
            if (!src) return;
            if (!src.buf) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lendo o som…';
                if (!(await loadSound(src))) {
                    renderInspector();
                    notify('Este vídeo não tem som para extrair');
                    return;
                }
            }
            if (!E.video.includes(c)) return;
            const snap = snapshot();
            const clip = pushExtracted(src, { in: c.in, out: c.out, vol: c.mute ? 1 : (c.vol ?? 1) }, clipStart(c));
            c.mute = true;
            E.sel = clip.cid;
            pushUndo(snap);
            renderAll();
            notify(`Áudio extraído para ${clip.track ? 'A2' : 'A1'} · vídeo mudo`);
        }

        // ---------- Velocidade ----------
        // Ao mudar a velocidade o vídeo fica mudo e o som vai para A1/A2 na velocidade normal.
        let speedBusy = false;

        async function separateForSpeed(c) {
            if (c.mute) return;
            const src = srcOf(c);
            if (!src) return;
            const cid = c.cid;
            const range = { in: c.in, out: c.out, vol: c.vol ?? 1 };
            const start = clipStart(c);
            c.mute = true;
            if (!src.buf && !src.noSound) notify('Separando o áudio…');
            const ok = await loadSound(src);
            const live = E.video.find((x) => x.cid === cid);
            if (!live || !live.mute || (live.speed || 1) === 1) return; // desfeito enquanto lia o som
            if (!ok) { live.mute = false; renderTimeline(); return; }
            const clip = pushExtracted(src, range, start);
            renderTimeline();
            if (!speedBusy) renderInspector();
            notify(`Áudio separado na ${clip.track ? 'A2' : 'A1'}`);
        }

        // Áudios que começam depois do clipe acompanham o vídeo quando ele encurta ou alonga
        function setSpeed(c, v) {
            const end = clipStart(c) + clen(c);
            c.speed = v;
            const delta = clipStart(c) + clen(c) - end;
            E.audio.forEach((a) => { if (a.start >= end - 0.001) a.start = Math.max(0, a.start + delta); });
            E.t = Math.min(E.t, total());
        }

        function clipMeta(c) {
            return `trecho ${fmtTime(c.in)} → ${fmtTime(c.out)} · ${clen(c).toFixed(2)} s`;
        }

        function speedPanel(box, c) {
            const wrap = document.createElement('div');
            wrap.className = 'ed-sp mt-4';
            wrap.innerHTML = `<span class="lbl">Velocidade</span>
                <div class="seg"><button data-v="whole" class="on">Clipe inteiro</button><button data-v="range">Só um trecho</button></div>
                <div class="ed-sp-range is-hidden">
                    <canvas></canvas><i class="ed-sp-shade l"></i><i class="ed-sp-shade r"></i>
                    <i class="ed-sp-box"></i><i class="ed-sp-h" data-h="a"></i><i class="ed-sp-h" data-h="b"></i>
                </div>
                <div class="ed-sp-now"><b></b><span></span></div>
                <input type="range" min="${SPEED_LOG[0]}" max="${SPEED_LOG[1]}" step="0.01" aria-label="Velocidade do trecho" title="Arraste para acelerar ou desacelerar · duplo clique volta a 1×">
                <div class="ed-sp-ticks"></div>
                <div class="ed-sp-final"></div>`;
            box.appendChild(wrap);
            const rangeBox = $('.ed-sp-range', wrap);
            const slider = $('input', wrap);
            const nowB = $('.ed-sp-now b', wrap);
            const nowS = $('.ed-sp-now span', wrap);
            const finalEl = $('.ed-sp-final', wrap);
            const meta = $('.ed-bin-meta', box);
            let mode = 'whole';
            let a = c.in + slen(c) * 0.25;
            let b = c.in + slen(c) * 0.75;
            let snap = null;

            function refresh() {
                const v = c.speed || 1;
                const base = mode === 'range' ? b - a : slen(c);
                const after = base / v;
                const d = after - base;
                nowB.textContent = fmtSpeed(v);
                nowS.textContent = `${fmtSpan(base)} → ${fmtSpan(after)} · ${Math.abs(d) < 0.005 ? 'sem mudança' : `${d < 0 ? 'reduziu' : 'aumentou'} ${fmtSpan(Math.abs(d))}`}`;
                const whole = E.video.reduce((n, x) => n + slen(x), 0);
                finalEl.textContent = `Vídeo final: ${fmtTime(whole)} → ${fmtTime(vEnd())}`;
                meta.textContent = clipMeta(c);
            }

            function apply(v) {
                if (E.playing) pause();
                if (!snap && v !== (c.speed || 1)) {
                    snap = snapshot();
                    speedBusy = true;
                    if (mode === 'range') {
                        // o trecho vira um clipe próprio; os lados continuam como estavam
                        const i = E.video.indexOf(c);
                        if (c.out - b >= 0.05) E.video.splice(i + 1, 0, { ...c, cid: ++E.seq, in: b });
                        if (a - c.in >= 0.05) E.video.splice(i, 0, { ...c, cid: ++E.seq, out: a });
                        c.in = a;
                        c.out = b;
                        mode = 'whole';
                        rangeBox.classList.add('is-off');
                    }
                    separateForSpeed(c);
                }
                if (!snap) return;
                setSpeed(c, v);
                renderTimeline();
                showFrame();
                refresh();
            }

            function commit() {
                if (!snap) return;
                if (snap !== snapshot()) pushUndo(snap);
                snap = null;
                speedBusy = false;
                renderAll();
                showFrame();
            }

            slider.value = Math.log2(c.speed || 1);
            slider.addEventListener('input', () => apply(speedFromSlider(+slider.value)));
            slider.addEventListener('change', commit);
            slider.addEventListener('dblclick', () => { slider.value = 0; apply(1); commit(); });
            const ticks = $('.ed-sp-ticks', wrap);
            [0.25, 0.5, 1, 2, 4, 8, 16].forEach((n) => {
                const t = document.createElement('button');
                t.textContent = fmtSpeed(n);
                t.style.left = `${((Math.log2(n) - SPEED_LOG[0]) / (SPEED_LOG[1] - SPEED_LOG[0])) * 100}%`;
                t.addEventListener('click', () => { slider.value = Math.log2(n); apply(n); commit(); });
                ticks.appendChild(t);
            });

            // escolha do trecho: duas alças sobre as miniaturas do clipe
            function placeRange() {
                const pa = ((a - c.in) / slen(c)) * 100;
                const pb = ((b - c.in) / slen(c)) * 100;
                $('.ed-sp-h[data-h="a"]', rangeBox).style.left = `${pa}%`;
                $('.ed-sp-h[data-h="b"]', rangeBox).style.left = `${pb}%`;
                $('.ed-sp-box', rangeBox).style.cssText = `left:${pa}%;width:${pb - pa}%`;
                $('.ed-sp-shade.l', rangeBox).style.width = `${pa}%`;
                $('.ed-sp-shade.r', rangeBox).style.width = `${100 - pb}%`;
            }
            rangeBox.addEventListener('pointerdown', (e) => {
                const h = e.target.dataset.h;
                if (!h) return;
                e.preventDefault();
                if (E.playing) pause();
                const r = rangeBox.getBoundingClientRect();
                const move = (ev) => {
                    const at = c.in + clamp((ev.clientX - r.left) / r.width, 0, 1) * slen(c);
                    if (h === 'a') a = Math.min(at, b - 0.2); else b = Math.max(at, a + 0.2);
                    a = Math.max(a, c.in);
                    b = Math.min(b, c.out);
                    placeRange();
                    refresh();
                    seekTo(clipStart(c) + ((h === 'a' ? a : b) - c.in) / (c.speed || 1));
                };
                const up = () => {
                    window.removeEventListener('pointermove', move);
                    window.removeEventListener('pointerup', up);
                    window.removeEventListener('pointercancel', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up);
                window.addEventListener('pointercancel', up);
            });
            initSeg($('.seg', wrap), (v) => {
                mode = v;
                rangeBox.classList.toggle('is-hidden', v !== 'range');
                if (v === 'range') {
                    const cv = $('canvas', rangeBox);
                    drawClip(cv, { ...c, mute: false }, srcOf(c), 'v', rangeBox.clientWidth || 270, 40);
                    placeRange();
                }
                refresh();
            });
            refresh();
        }

        function knobEdit(c, apply) {
            if (!knobSnap) knobSnap = snapshot();
            apply();
            clearTimeout(knobTimer);
            knobTimer = setTimeout(() => { if (knobSnap && knobSnap !== snapshot()) pushUndo(knobSnap); knobSnap = null; $('#ed-undo').disabled = !E.undo.length; }, 700);
            renderTimeline();
            if (E.playing) { pause(); play(); }
            else if (isVideoClip(c)) showFrame();
        }

        function renderInspector() {
            const box = $('#ed-insp');
            const c = E.sel ? findClip(E.sel) : null;
            box.innerHTML = '';
            if (!c) { box.innerHTML = '<p class="hint" style="margin:0">Clique num clipe da linha do tempo para ajustar som, volume e fades.</p>'; return; }
            const src = srcOf(c);
            const video = isVideoClip(c);
            const head = document.createElement('div');
            head.innerHTML = `<div class="ed-bin-name"></div><div class="ed-bin-meta mt-1"></div>`;
            $('.ed-bin-name', head).textContent = src ? src.name : '?';
            $('.ed-bin-meta', head).textContent = `${clipMeta(c)}${video ? '' : ` · começa em ${fmtTime(c.start)}`}`;
            box.appendChild(head);
            const sped = video && (c.speed || 1) !== 1;
            if (video && !sped) {
                const segWrap = document.createElement('div');
                segWrap.className = 'mt-4';
                segWrap.innerHTML = '<span class="lbl">Som do vídeo</span><div class="seg"><button data-v="on">Ligado</button><button data-v="mute">Mudo</button></div>';
                box.appendChild(segWrap);
                const seg = $('.seg', segWrap);
                $$('button', seg).forEach((b) => b.classList.toggle('on', (b.dataset.v === 'mute') === !!c.mute));
                initSeg(seg, (v) => knobEdit(c, () => { c.mute = v === 'mute'; }));
                const ext = document.createElement('button');
                ext.className = 'btn w-full mt-4';
                ext.innerHTML = '<i class="fas fa-file-audio"></i> Extrair áudio para A1';
                ext.title = 'O vídeo fica mudo e o som dele vira um clipe de áudio no mesmo lugar (A1, ou A2 se A1 estiver ocupada)';
                ext.addEventListener('click', () => extractAudio(c, ext));
                box.appendChild(ext);
            }
            const knobs = document.createElement('div');
            knobs.className = 'knobs mt-4';
            box.appendChild(knobs);
            if (sped) knobs.remove();
            else new Knob(knobs, {
                label: 'Volume', min: 0, max: video ? 100 : 200, step: 1, value: Math.round((c.vol ?? 1) * 100),
                format: (v) => `${v}%`, onChange: (v) => knobEdit(c, () => { c.vol = v / 100; })
            });
            if (!video) {
                const maxF = Math.min(30, clen(c));
                new Knob(knobs, { label: 'Fade in', min: 0, max: maxF, step: 0.05, value: c.fi, format: (v) => `${v.toFixed(2)} s`, onChange: (v) => knobEdit(c, () => { c.fi = Math.min(v, clen(c) - c.fo); }) });
                new Knob(knobs, { label: 'Fade out', min: 0, max: maxF, step: 0.05, value: c.fo, format: (v) => `${v.toFixed(2)} s`, onChange: (v) => knobEdit(c, () => { c.fo = Math.min(v, clen(c) - c.fi); }) });
            }
            if (!video && src && src.peaks) {
                // acerta o volume do clipe para o pico encostar logo abaixo da linha vermelha (−1 dB)
                let raw = 0;
                for (let i = Math.floor(c.in * 100), end = Math.min(src.peaks.length, Math.ceil(c.out * 100)); i < end; i++) raw = Math.max(raw, src.peaks[i]);
                const fit = document.createElement('button');
                fit.className = 'btn w-full mt-4';
                fit.innerHTML = '<i class="fas fa-compress"></i> Ajustar pico a −1 dB';
                fit.title = 'Muda só o volume deste clipe: abaixa se estiver estourando, sobe se estiver baixo (até 200%)';
                fit.disabled = !(raw > 0);
                fit.addEventListener('click', () => {
                    const vol = clamp(LEVEL_HOT / raw, 0, 2);
                    knobEdit(c, () => { c.vol = +vol.toFixed(3); });
                    renderInspector();
                    notify(`Volume do clipe: ${Math.round(c.vol * 100)}% · pico ${fmtDb(raw * c.vol)}`);
                });
                box.appendChild(fit);
            }
            const hint = document.createElement('p');
            hint.className = 'hint';
            if (video) speedPanel(box, c);
            hint.textContent = sped ? 'Com a velocidade alterada o vídeo fica sem som; o áudio fica separado na faixa, na velocidade normal.' : video ? 'Arraste para reordenar · puxe as bordas para recortar.' : 'Arraste para posicionar (gruda na agulha e nas bordas) · bolinhas brancas = fades.';
            box.appendChild(hint);
        }

        // ---------- Exportar (ffmpeg neste computador) ----------
        const qualitySeg = initSeg($('#ed-quality'));
        $('#ed-export').addEventListener('click', exportFinal);
        $('#ed-cancel').addEventListener('click', () => { E.cancel = true; $('#ed-cancel').disabled = true; progress.set('Cancelando…', 0); });

        async function api(url, options = {}) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 90000);
            let res;
            try {
                res = await fetch(url, { ...options, signal: ctrl.signal });
            } catch (err) {
                throw new Error(err.name === 'AbortError' ? 'O motor local não respondeu em 90 s' : 'Sem conexão com o servidor');
            } finally {
                clearTimeout(timer);
            }
            let json;
            try { json = await res.json(); } catch { throw new Error(`Resposta inválida deste computador (HTTP ${res.status})`); }
            if (json.error) throw new Error(json.error);
            return json;
        }

        async function checkServer() {
            if (E.server) return E.server;
            try {
                const st = await (await fetch(window.MOTOR + 'status', { cache: 'no-store' })).json();
                if (st.ffmpeg) E.server = st;
            } catch { /* sem o motor */ }
            // o mesmo "Como ativar" do Baixar, enquanto faltar o que precisa instalar
            const ajuda = $('#ed-help');
            if (!ajuda.innerHTML) ajuda.innerHTML = $('#dl-help').innerHTML;
            ajuda.classList.toggle('is-hidden', !!E.server);
            return E.server;
        }

        const checkCancel = () => { if (E.cancel) throw new Error('Exportação cancelada'); };

        async function upload(src, label) {
            const file = src.file;
            if (file.size > E.server.maxBytes) throw new Error(`${file.name} é maior que o limite deste computador`);
            const size = E.server.chunk;
            const parts = Math.max(1, Math.ceil(file.size / size));
            let id = '';
            for (let i = 0; i < parts; i++) {
                checkCancel();
                const form = new FormData();
                form.append('index', String(i));
                form.append('name', file.name);
                if (id) form.append('id', id);
                form.append('chunk', file.slice(i * size, (i + 1) * size), 'chunk.bin');
                id = (await api(window.MOTOR + 'upload', { method: 'POST', body: form })).id;
                progress.set(`${label} · ${Math.round(((i + 1) / parts) * 100)}%`, (i + 1) / parts);
            }
            src.serverId = id;
            src.serverFile = file;
        }

        function buildProject() {
            const first = srcOf(E.video[0]);
            const [width, height] = resolution(first);
            const r3 = (v) => +v.toFixed(3);
            return {
                width, height, quality: qualitySeg.value,
                video: E.video.map((c) => ({ id: srcOf(c).serverId, in: r3(c.in), out: r3(c.out), mute: !!c.mute, vol: r3(c.vol ?? 1), speed: r3(c.speed || 1) })),
                audio: E.audio.map((c) => ({ id: srcOf(c).serverId, in: r3(c.in), out: r3(c.out), start: r3(c.start), vol: r3(c.vol), fi: r3(c.fi), fo: r3(c.fo) }))
            };
        }

        async function exportFinal() {
            if (E.busy) return;
            if (!E.video.length) { notify('Coloque pelo menos um vídeo na faixa V1'); shake($('#ed-export')); return; }
            if (!(await checkServer())) { notify('A versão final é montada pelo ffmpeg deste computador, que não está disponível'); return; }
            E.busy = true;
            E.cancel = false;
            pause();
            const restoreBtn = busyButton($('#ed-export'), 'Exportando…');
            const cancelBtn = $('#ed-cancel');
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('is-hidden');
            $('#ed-result').classList.add('is-hidden');
            progress.show();
            try {
                let renderId = null;
                for (let attempt = 0; attempt < 2 && !renderId; attempt++) {
                    const used = [...new Set([...E.video, ...E.audio].map((c) => srcOf(c)))];
                    const pending = used.filter((s) => s.serverFile !== s.file || !s.serverId);
                    for (let i = 0; i < pending.length; i++) await upload(pending[i], `Enviando ${i + 1} de ${pending.length}: ${pending[i].name}`);
                    checkCancel();
                    progress.set('Montando neste computador…', 0);
                    try {
                        const form = new FormData();
                        form.append('project', JSON.stringify(buildProject()));
                        renderId = (await api(window.MOTOR + 'render', { method: 'POST', body: form })).id;
                    } catch (err) {
                        // temporário expirou neste computador: envia de novo uma vez
                        if (attempt === 0 && /expirou|não está mais/i.test(err.message)) { E.sources.forEach((s) => { s.serverFile = null; }); continue; }
                        throw err;
                    }
                }
                const started = Date.now();
                let last = -1;
                let lastChange = Date.now();
                for (;;) {
                    if (E.cancel) { api(`${window.MOTOR}cancel&id=${renderId}`).catch(() => {}); checkCancel(); }
                    await sleep(700);
                    const job = await api(`${window.MOTOR}job&id=${renderId}`);
                    if (job.state === 'done') {
                        progress.set('Pronto', 1);
                        $('#ed-res-size').textContent = `${fmtBytes(job.size)} · ${fmtTime(vEnd())}`;
                        const link = $('#ed-download');
                        link.href = `${window.MOTOR}download&id=${renderId}`;
                        link.setAttribute('download', 'montagem.mp4');
                        reveal($('#ed-result'));
                        notify('Versão final pronta');
                        break;
                    }
                    if (job.state === 'error') throw new Error(String(job.log || 'ffmpeg falhou').trim().split('\n').pop());
                    if (job.progress !== last) { last = job.progress; lastChange = Date.now(); }
                    else if (Date.now() - lastChange > 120000) throw new Error('A montagem parou de avançar há 2 min — tente de novo');
                    progress.set(`Montando neste computador… ${Math.floor((Date.now() - started) / 60000)}:${String(Math.floor(((Date.now() - started) / 1000) % 60)).padStart(2, '0')}`, job.progress);
                }
                progress.hide();
            } catch (err) {
                console.error(err);
                progress.set(err.message || 'Falha na exportação', 0);
                notify('Não deu certo — veja a mensagem no painel');
            } finally {
                E.busy = false;
                cancelBtn.classList.add('is-hidden');
                restoreBtn();
            }
        }

        renderAll();

        tools.editor = {
            // vindo das abas Vídeo/Baixar: o arquivo (já neste computador, se tiver id) e os trechos cortados
            importClip(file, serverId = null, segments = null) {
                addFiles([file], { serverId, segments });
            },
            hide: () => pause(),
            show: () => { checkServer(); queueRender(); showFrame(); },
            key(e) {
                const k = e.key.toLowerCase();
                if (e.metaKey || e.ctrlKey) {
                    if (k !== 'z') return false;
                    if (e.shiftKey) redoEdit(); else undoEdit();
                    return true;
                }
                if (e.key === ' ') { toggle(); return true; }
                if (k === 'c') { cut(); return true; }
                if (e.key === 'Delete' || e.key === 'Backspace') { removeSel(); return true; }
                if (e.key === 'Escape') { E.sel = null; renderAll(); return true; }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    if (E.playing) pause();
                    seekTo(E.t + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30));
                    return true;
                }
                return false;
            }
        };
    })();


    /* =====================================================================
       Baixar — vídeo a partir de um link (yt-dlp neste computador)
       ===================================================================== */
    (() => {
        const S = { id: null, file: null, url: null, busy: false, cancel: false, status: null };
        const progress = progressUI($('#dl-progress'));
        const input = $('#dl-url');
        const goBtn = $('#dl-go');
        const cancelBtn = $('#dl-cancel');

        goBtn.addEventListener('click', go);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        $('#dl-paste').addEventListener('click', async (e) => {
            e.preventDefault();
            try { input.value = (await navigator.clipboard.readText()).trim(); input.focus(); } catch { notify('Sem acesso à área de transferência — cole com ⌘V'); }
        });
        cancelBtn.addEventListener('click', () => { S.cancel = true; cancelBtn.disabled = true; progress.set('Cancelando…', 0); });
        $('#dl-save').addEventListener('click', async () => {
            if (!S.file) return;
            if (!S.job?.original) { downloadBlob(S.file, S.file.name); return; }
            // Era um GIF: salva o arquivo original, não a conversão usada na edição
            const restore = busyButton($('#dl-save'), 'Preparando…');
            try {
                const res = await fetch(`${window.MOTOR}file&id=${S.id}&orig=1`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                downloadBlob(await res.blob(), S.job.originalName);
            } catch (err) {
                notify(`Não foi possível salvar o original (${err.message})`);
            } finally {
                restore();
            }
        });
        $('#dl-edit').addEventListener('click', () => {
            if (!S.file) return;
            $('#dl-preview').pause();
            tools.editor.importClip(S.file, S.id);
            goTo('editor');
            notify('Vídeo adicionado às faixas');
        });

        async function api(url, options = {}) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 90000);
            let res;
            try {
                res = await fetch(url, { ...options, signal: ctrl.signal });
            } catch (err) {
                throw new Error(err.name === 'AbortError' ? 'O motor local não respondeu em 90 s' : 'Sem conexão com o servidor');
            } finally {
                clearTimeout(timer);
            }
            let json;
            try { json = await res.json(); } catch { throw new Error(`Resposta inválida deste computador (HTTP ${res.status})`); }
            if (json.error) throw new Error(json.error);
            return json;
        }

        async function checkStatus() {
            if (S.status !== null) return;
            S.status = false;
            let st = null;
            try { st = await (await fetch(window.MOTOR + 'status', { cache: 'no-store' })).json(); } catch { /* sem o motor */ }
            S.status = st || false;
            const ok = !!(st && st.ffmpeg && st.ytdlp);
            const chip = $('#dl-status');
            chip.className = `chip ${ok ? 'ok' : 'warn'}`;
            chip.lastElementChild.textContent = ok ? `yt-dlp ${st.ytdlp}` : !st ? 'só no app do Oceano' : !st.ffmpeg ? 'sem ffmpeg' : 'yt-dlp não instalado';
            $('#dl-help').classList.toggle('is-hidden', ok);
            goBtn.disabled = !ok;
        }

        async function go() {
            if (S.busy || goBtn.disabled) return;
            const url = input.value.trim();
            if (!url) { shake(goBtn); notify('Cole um link primeiro'); input.focus(); return; }
            S.busy = true;
            S.cancel = false;
            const restore = busyButton(goBtn, 'Baixando…');
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('is-hidden');
            $('#dl-result').classList.add('is-hidden');
            progress.show();
            progress.set('Lendo o link…', 0);
            try {
                const form = new FormData();
                form.append('url', url);
                form.append('quality', $('#dl-quality').value);
                const { id } = await api(window.MOTOR + 'fetch', { method: 'POST', body: form });
                S.id = id;
                let job;
                let last = -1;
                let lastChange = Date.now();
                for (;;) {
                    if (S.cancel) { api(`${window.MOTOR}cancel&id=${id}`).catch(() => {}); throw new Error('Download cancelado'); }
                    await sleep(800);
                    job = await api(`${window.MOTOR}fetchjob&id=${id}`);
                    if (job.state === 'done') break;
                    if (job.state === 'error') throw new Error(job.error);
                    if (job.progress !== last) { last = job.progress; lastChange = Date.now(); }
                    else if (Date.now() - lastChange > 150000) throw new Error('O download parou de avançar — tente de novo');
                    progress.set(job.stage, job.progress);
                }
                progress.set('Trazendo o arquivo…', 1);
                const res = await fetch(`${window.MOTOR}file&id=${id}`);
                if (!res.ok) throw new Error(`Não foi possível trazer o arquivo (HTTP ${res.status})`);
                const blob = await res.blob();
                S.job = job;
                S.file = new File([blob], job.name, { type: blob.type || 'video/mp4' });
                if (S.url) URL.revokeObjectURL(S.url);
                S.url = URL.createObjectURL(S.file);
                $('#dl-preview').src = S.url;
                $('#dl-title').textContent = job.title;
                $('#dl-meta').textContent = job.original
                    ? `${job.original.toUpperCase()} original · ${job.width}×${job.height} · ${fmtTime(job.duration)} · ${fmtBytes(job.originalSize)} — convertido em MP4 para a prévia e a edição`
                    : `${job.width}×${job.height} · ${fmtTime(job.duration)} · ${fmtBytes(job.size)}`;
                $('#dl-save').innerHTML = `<i class="fas fa-download"></i> ${job.original ? `Salvar ${job.original.toUpperCase()} original` : 'Salvar no computador'}`;
                progress.hide();
                reveal($('#dl-result'));
                notify('Vídeo baixado');
            } catch (err) {
                console.error(err);
                progress.set(err.message || 'Falha no download', 0);
                notify('Não deu certo — veja a mensagem');
            } finally {
                S.busy = false;
                cancelBtn.classList.add('is-hidden');
                restore();
            }
        }

        tools.baixar = { show: checkStatus };
    })();


    /* =====================================================================
       Pixelizar — efeito ao vivo sobre o vídeo + exportação GIF / PNG / .h
       ===================================================================== */
    (() => {
        const PALETTES = {
            bw: ['#000000', '#ffffff'],
            blue: ['#0040ff', '#ffffff'],
            tres: ['#000000', '#0040ff', '#ffffff'],
            gray4: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
            gb: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
            pico: ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa']
        };
        const HINTS = {
            video: '<b>Vídeo .webm</b>: os quadros pixelizados no fps escolhido, sem o som. Abre no navegador e em editores de vídeo.',
            gif: '<b>GIF animado</b>: abre no Preview/Quick Look do macOS e no navegador. Python: Pillow · C/ESP32: gifdec ou AnimatedGIF.',
            png: '<b>PNG indexado</b> com os frames empilhados na vertical (frame <i>i</i> começa na linha <i>i × altura</i>). Metadados JSON no próprio arquivo. Abre no macOS.',
            zip: '<b>.zip</b> com um PNG indexado por frame (nome_0001.png…). Bom para sprites e pipelines em Python.',
            h: '<b>Header C/C++</b> com PROGMEM: paleta RGB565/RGB888 + frames empacotados (1/2/4/8 bits por pixel), pronto para ESP32/Arduino.'
        };
        const bayer = (n) => {
            let m = [[0]];
            while (m.length < n) {
                const s = m.length;
                const next = [];
                for (let y = 0; y < 2 * s; y++) {
                    next[y] = [];
                    for (let x = 0; x < 2 * s; x++) next[y][x] = 4 * m[y % s][x % s] + (y < s ? (x < s ? 0 : 2) : (x < s ? 3 : 1));
                }
                m = next;
            }
            return Float32Array.from(m.flat(), (v) => (v + 0.5) / (n * n) - 0.5);
        };
        const BAYER = { bayer4: [bayer(4), 4], bayer8: [bayer(8), 8] };

        const S = {
            file: null, url: null, d: 0, a: 0, b: 0, size: 'free', freeW: 160, W: 160, H: 90,
            algo: 'fs', palId: 'bw', pal: [...PALETTES.bw], bright: 0, contrast: 0, strength: 100, fps: 12,
            original: false, dirty: true, lastKey: -1, busy: false, src: null, P: null
        };
        const video = $('#dt-video');
        // a fonte é um vídeo ou uma foto: a foto vira um único quadro, com os mesmos filtros e exportações
        const larguraFonte = () => (S.foto ? S.foto.naturalWidth : video.videoWidth);
        const alturaFonte = () => (S.foto ? S.foto.naturalHeight : video.videoHeight);
        const stage = $('#dt-stage');
        const crop = $('#dt-crop');
        const canvas = $('#dt-canvas');
        const editor = $('#dt-editor');
        const playBtn = $('#dt-play');
        const progress = progressUI($('#dt-progress'));
        const work = document.createElement('canvas');
        const wctx = work.getContext('2d', { willReadFrequently: true });
        const octx = canvas.getContext('2d');
        const buffers = {};
        let raf = 0;
        let wasPlaying = false;
        let strip = null;

        const tl = new RangeTimeline($('#dt-timeline'), {
            onSeek: (t) => { video.currentTime = t; },
            onRange: (a, b, which) => { S.a = a; S.b = b; video.currentTime = which === 'a' ? a : Math.max(a, b - 1 / S.fps); updateInfo(); },
            onStart: () => { wasPlaying = !video.paused; video.pause(); },
            onEnd: (h) => { if (wasPlaying && h === 'seek') play(); }
        });
        const knobHost = $('#dt-knobs');
        new Knob(knobHost, { label: 'Brilho', min: -100, max: 100, step: 1, value: 0, bipolar: true, format: (v) => (v > 0 ? `+${v}` : `${v}`), onChange: (v) => { S.bright = v; kick(); } });
        new Knob(knobHost, { label: 'Contraste', min: -100, max: 100, step: 1, value: 0, bipolar: true, format: (v) => (v > 0 ? `+${v}` : `${v}`), onChange: (v) => { S.contrast = v; kick(); } });
        new Knob(knobHost, { label: 'Intensidade', min: 0, max: 100, step: 1, value: 100, format: (v) => `${v}%`, onChange: (v) => { S.strength = v; kick(); } });
        new Knob(knobHost, { label: 'FPS', min: 1, max: 24, step: 1, value: 12, format: (v) => `${v} fps`, onChange: (v) => { S.fps = v; S.lastKey = -1; updateInfo(); kick(); } });
        const scopeSeg = initSeg($('#dt-scope'), updateInfo);
        const formatSeg = initSeg($('#dt-format'), updateInfo);
        const scaleSeg = initSeg($('#dt-scale'), updateInfo);

        bindDrop($('#dt-drop'), $('#dt-input'), (files) => load(files[0]));
        playBtn.addEventListener('click', toggle);
        stage.addEventListener('click', toggle);
        $('#dt-prev').addEventListener('click', () => step(-1));
        $('#dt-next').addEventListener('click', () => step(1));
        $('#dt-in').addEventListener('click', () => tl.setRange(video.currentTime, S.b, 'a'));
        $('#dt-out').addEventListener('click', () => tl.setRange(S.a, video.currentTime + 1 / S.fps, 'b'));
        $('#dt-original').addEventListener('click', toggleOriginal);
        $('#dt-export').addEventListener('click', exportDither);
        $('#dt-avatar').addEventListener('click', usarComoAvatar);
        $('#dt-size').addEventListener('change', (e) => { S.size = e.target.value; geometry(true); });
        $('#dt-width').addEventListener('input', (e) => { const v = parseInt(e.target.value, 10); if (v >= 16 && v <= 640) { S.freeW = v; geometry(true); } });
        $('#dt-algo').addEventListener('change', (e) => { S.algo = e.target.value; kick(); });
        $('#dt-palette').addEventListener('change', (e) => { S.palId = e.target.value; S.pal = [...PALETTES[S.palId]]; preparePalette(); renderSwatches(); updateInfo(); kick(); });
        $('#dt-bitorder').addEventListener('change', updateInfo);
        video.addEventListener('play', () => { setPlayIcon(playBtn, true); kick(); });
        video.addEventListener('pause', () => { setPlayIcon(playBtn, false); kick(); });
        video.addEventListener('seeked', kick);
        video.addEventListener('loadeddata', kick);
        let stripW = 0;
        if ('ResizeObserver' in window) {
            new ResizeObserver(([entry]) => {
                const w = entry.contentRect.width;
                if (S.url && w && Math.abs(w - stripW) > 60) buildStrip();
            }).observe(tl.bg);
        }
        function load(file) {
            if (!file) return;
            const ehFoto = file.type.startsWith('image/');
            if (!ehFoto && !file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|ogv)$/i.test(file.name)) { notify('Escolha uma foto ou um vídeo'); return; }
            if (S.busy) { notify('Aguarde a exportação terminar'); return; }
            video.pause();
            if (S.url) URL.revokeObjectURL(S.url);
            S.file = file;
            S.url = URL.createObjectURL(file);
            S.foto = null;
            editor.classList.toggle('dt-e-foto', ehFoto);
            // a foto fica atrás do recorte, como o vídeo: é ela que aparece no botão Original
            const fotoVisivel = $('#dt-foto');
            fotoVisivel.hidden = !ehFoto;
            if (ehFoto) fotoVisivel.src = S.url; else fotoVisivel.removeAttribute('src');
            if (ehFoto) {
                video.removeAttribute('src');
                video.load();
                const img = new Image();
                img.onload = () => { S.foto = img; onMeta(); };
                img.onerror = () => notify('Não consegui abrir esta imagem');
                img.src = S.url;
                return;
            }
            video.src = S.url;
            waitEvent(video, 'loadedmetadata', 15000).then(onMeta).catch(() => notify('Este navegador não reproduz este vídeo'));
        }

        async function onMeta() {
            S.d = S.foto ? 1 / S.fps : await ensureDuration(video);
            S.a = 0;
            S.b = S.d;
            const ratio = larguraFonte() / alturaFonte() || 16 / 9;
            stage.style.aspectRatio = `${larguraFonte() || 16} / ${alturaFonte() || 9}`;
            stage.style.maxWidth = `calc(56vh * ${ratio})`;
            tl.setDuration(S.d);
            compactDrop($('#dt-drop'), S.file);
            reveal(editor);
            $('#dt-dur').textContent = fmtTime(S.d);
            geometry(false);
            requestAnimationFrame(buildStrip);
        }

        function buildStrip() {
            if (S.foto) return;
            if (strip) strip.cancelled = true;
            strip = { cancelled: false, duration: S.d };
            stripW = tl.bg.getBoundingClientRect().width;
            filmstrip(tl.bg, S.url, strip);
        }

        function target() {
            if (S.size !== 'free') return S.size.split('x').map(Number);
            const ratio = larguraFonte() / alturaFonte() || 16 / 9;
            return [S.freeW, Math.max(1, Math.round(S.freeW / ratio))];
        }

        // Recorte central (cover) para o tamanho alvo; a janela azul mostra a área usada
        function geometry(animate) {
            const vw = larguraFonte();
            const vh = alturaFonte();
            if (!vw) return;
            const [W, H] = target();
            S.W = W;
            S.H = H;
            const ta = W / H;
            let sx = 0;
            let sy = 0;
            let sw = vw;
            let sh = vh;
            if (ta > vw / vh) { sh = vw / ta; sy = (vh - sh) / 2; } else { sw = vh * ta; sx = (vw - sw) / 2; }
            S.src = { sx, sy, sw, sh };
            const box = { left: `${(sx / vw) * 100}%`, top: `${(sy / vh) * 100}%`, width: `${(sw / vw) * 100}%`, height: `${(sh / vh) * 100}%` };
            if (hasGsap && animate) gsap.to(crop, { ...box, duration: 0.7, ease: EASE, overwrite: true });
            else Object.assign(crop.style, box);
            work.width = canvas.width = W;
            work.height = canvas.height = H;
            $('#dt-free').classList.toggle('is-hidden', S.size !== 'free');
            updateInfo();
            kick();
        }

        const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

        function preparePalette() {
            const cols = S.pal.map(hexToRgb);
            const n = cols.length;
            const lum = cols.map(([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b);
            const order = cols.map((_, i) => i).sort((i, j) => lum[i] - lum[j]);
            const u32 = new Uint32Array(n);
            cols.forEach(([r, g, b], i) => { u32[i] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; });
            // Até 4 cores: tons ordenados por luminância (duotone/tritone).
            // Mais que isso: cor mais próxima em RGB, com tabela de busca 15 bits.
            let lut = null;
            if (n > 4) {
                lut = new Uint8Array(32768);
                for (let i = 0; i < 32768; i++) {
                    const r = ((i >> 10) & 31) * 8.2258;
                    const g = ((i >> 5) & 31) * 8.2258;
                    const b = (i & 31) * 8.2258;
                    let best = 0;
                    let bestD = Infinity;
                    for (let k = 0; k < n; k++) {
                        const dr = r - cols[k][0];
                        const dg = g - cols[k][1];
                        const db = b - cols[k][2];
                        const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
                        if (dist < bestD) { bestD = dist; best = k; }
                    }
                    lut[i] = best;
                }
            }
            S.P = { cols, n, order, u32, lut, tone: n <= 4 };
        }

        function renderSwatches() {
            const host = $('#dt-swatches');
            host.innerHTML = '';
            S.pal.forEach((hex, i) => {
                const sw = document.createElement('label');
                sw.className = 'swatch';
                sw.style.background = hex;
                sw.title = hex;
                const input = document.createElement('input');
                input.type = 'color';
                input.value = hex;
                input.addEventListener('input', () => {
                    S.pal[i] = input.value;
                    sw.style.background = input.value;
                    sw.title = input.value;
                    preparePalette();
                    kick();
                });
                sw.appendChild(input);
                host.appendChild(sw);
            });
            // limpa só o que a animação mexeu: 'all' apagava também o background (as cores ficavam pretas)
            if (hasGsap) gsap.from(host.children, { scale: 0.6, opacity: 0, duration: 0.5, ease: EASE, stagger: 0.025, clearProps: 'opacity,transform' });
        }

        const buf = (name, Type, n) => (buffers[name] && buffers[name].length === n ? buffers[name] : (buffers[name] = new Type(n)));

        function ditherFrame(px, W, H) {
            const { n, order, lut, tone } = S.P;
            const N = W * H;
            const out = buf('out', Uint8Array, N);
            const cf = Math.pow((S.contrast + 100) / 100, 2);
            const br = S.bright * 1.28;
            const k = S.strength / 100;
            const adj = (v) => (v - 128) * cf + 128 + br;
            const ordered = BAYER[S.algo];
            const diffuse = S.algo === 'fs' || S.algo === 'atkinson';
            const atkinson = S.algo === 'atkinson';

            if (tone) {
                const last = n - 1;
                const L = buf('lum', Float32Array, N);
                for (let i = 0, p = 0; i < N; i++, p += 4) L[i] = (adj(0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255) * last;
                for (let y = 0; y < H; y++) {
                    const rev = diffuse && !atkinson && y & 1; // serpentina no Floyd–Steinberg
                    for (let xx = 0; xx < W; xx++) {
                        const x = rev ? W - 1 - xx : xx;
                        const i = y * W + x;
                        let v = L[i];
                        if (ordered) v += ordered[0][(y % ordered[1]) * ordered[1] + (x % ordered[1])] * k;
                        v = clamp(v, 0, last);
                        const q = Math.round(v);
                        out[i] = order[q];
                        if (!diffuse) continue;
                        const err = (v - q) * k;
                        if (atkinson) {
                            const e = err / 8;
                            if (x + 1 < W) L[i + 1] += e;
                            if (x + 2 < W) L[i + 2] += e;
                            if (y + 1 < H) {
                                if (x > 0) L[i + W - 1] += e;
                                L[i + W] += e;
                                if (x + 1 < W) L[i + W + 1] += e;
                            }
                            if (y + 2 < H) L[i + 2 * W] += e;
                        } else {
                            const dir = rev ? -1 : 1;
                            if (x + dir >= 0 && x + dir < W) L[i + dir] += (err * 7) / 16;
                            if (y + 1 < H) {
                                if (x - dir >= 0 && x - dir < W) L[i + W - dir] += (err * 3) / 16;
                                L[i + W] += (err * 5) / 16;
                                if (x + dir >= 0 && x + dir < W) L[i + W + dir] += err / 16;
                            }
                        }
                    }
                }
                return out;
            }

            const R = buf('r', Float32Array, N);
            const G = buf('g', Float32Array, N);
            const B = buf('b', Float32Array, N);
            for (let i = 0, p = 0; i < N; i++, p += 4) { R[i] = adj(px[p]); G[i] = adj(px[p + 1]); B[i] = adj(px[p + 2]); }
            const spread = (255 / Math.cbrt(n) / 1.5) * k;
            const { cols } = S.P;
            const add = (j, er, eg, eb, f) => { R[j] += er * f; G[j] += eg * f; B[j] += eb * f; };
            for (let y = 0; y < H; y++) {
                const rev = diffuse && !atkinson && y & 1;
                for (let xx = 0; xx < W; xx++) {
                    const x = rev ? W - 1 - xx : xx;
                    const i = y * W + x;
                    let r = R[i];
                    let g = G[i];
                    let b = B[i];
                    if (ordered) {
                        const o = ordered[0][(y % ordered[1]) * ordered[1] + (x % ordered[1])] * spread;
                        r += o; g += o; b += o;
                    }
                    r = clamp(r, 0, 255);
                    g = clamp(g, 0, 255);
                    b = clamp(b, 0, 255);
                    const q = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
                    out[i] = q;
                    if (!diffuse) continue;
                    const er = (r - cols[q][0]) * k;
                    const eg = (g - cols[q][1]) * k;
                    const eb = (b - cols[q][2]) * k;
                    if (atkinson) {
                        if (x + 1 < W) add(i + 1, er, eg, eb, 0.125);
                        if (x + 2 < W) add(i + 2, er, eg, eb, 0.125);
                        if (y + 1 < H) {
                            if (x > 0) add(i + W - 1, er, eg, eb, 0.125);
                            add(i + W, er, eg, eb, 0.125);
                            if (x + 1 < W) add(i + W + 1, er, eg, eb, 0.125);
                        }
                        if (y + 2 < H) add(i + 2 * W, er, eg, eb, 0.125);
                    } else {
                        const dir = rev ? -1 : 1;
                        if (x + dir >= 0 && x + dir < W) add(i + dir, er, eg, eb, 7 / 16);
                        if (y + 1 < H) {
                            if (x - dir >= 0 && x - dir < W) add(i + W - dir, er, eg, eb, 3 / 16);
                            add(i + W, er, eg, eb, 5 / 16);
                            if (x + dir >= 0 && x + dir < W) add(i + W + dir, er, eg, eb, 1 / 16);
                        }
                    }
                }
            }
            return out;
        }

        function renderFrame() {
            if (!S.src || (!S.foto && video.readyState < 2)) return null;
            const { sx, sy, sw, sh } = S.src;
            wctx.imageSmoothingEnabled = true;
            wctx.imageSmoothingQuality = 'high';
            wctx.drawImage(S.foto || video, sx, sy, sw, sh, 0, 0, S.W, S.H);
            const idx = ditherFrame(wctx.getImageData(0, 0, S.W, S.H).data, S.W, S.H);
            const img = buffers.img && buffers.img.width === S.W && buffers.img.height === S.H ? buffers.img : (buffers.img = octx.createImageData(S.W, S.H));
            const px = new Uint32Array(img.data.buffer);
            const pal = S.P.u32;
            for (let i = 0; i < idx.length; i++) px[i] = pal[idx[i]];
            octx.putImageData(img, 0, 0);
            return idx;
        }

        const frameCount = () => Math.max(1, Math.round((S.b - S.a) * S.fps));
        const frameKey = (t) => Math.floor((t - S.a) * S.fps + 1e-4);

        function loop() {
            raf = 0;
            if (!S.url) return;
            if (!video.paused && video.currentTime >= S.b) video.currentTime = S.a; // loop no recorte, como um GIF
            const t = video.currentTime;
            const key = frameKey(t);
            if (S.dirty || key !== S.lastKey) {
                if (!S.original && !S.busy) renderFrame();
                S.lastKey = key;
                S.dirty = false;
            }
            tl.setTime(t);
            $('#dt-pos').textContent = fmtTime(t);
            $('#dt-frame').textContent = `frame ${clamp(key + 1, 1, frameCount())}/${frameCount()}`;
            if (!video.paused) raf = requestAnimationFrame(loop);
        }

        function kick() {
            S.dirty = true;
            if (!raf) raf = requestAnimationFrame(loop);
        }

        function play() {
            if (video.currentTime < S.a || video.currentTime >= S.b - 0.02) video.currentTime = S.a;
            video.play().catch(() => {});
        }

        function toggle() {
            if (!S.url || S.busy) return;
            if (video.paused) play(); else video.pause();
            flash(stage, !video.paused);
        }

        function step(dir) {
            if (!S.url || S.busy) return;
            video.pause();
            const k = clamp(frameKey(video.currentTime) + dir, 0, frameCount() - 1);
            video.currentTime = Math.min(S.d, S.a + k / S.fps + 0.0005);
        }

        function toggleOriginal() {
            S.original = !S.original;
            crop.classList.toggle('is-off', S.original);
            $('#dt-original').classList.toggle('on', S.original);
            kick();
        }

        function bitsPerPixel() { return S.P.n <= 2 ? 1 : S.P.n <= 4 ? 2 : S.P.n <= 16 ? 4 : 8; }

        function updateInfo() {
            if (!S.P) return;
            const fmt = formatSeg.value;
            const frames = scopeSeg.value === 'frame' ? 1 : frameCount();
            const bpp = bitsPerPixel();
            const rowBytes = Math.ceil((S.W * bpp) / 8);
            $('#dt-tag').textContent = `${S.W}×${S.H} · ${S.P.n} cores · ${S.fps} fps`;
            $('#dt-format-hint').innerHTML = HINTS[fmt];
            $('#dt-scale-wrap').classList.toggle('is-hidden', fmt === 'h');
            $('#dt-h-wrap').classList.toggle('is-hidden', fmt !== 'h' || bpp !== 1);
            const scale = fmt === 'h' ? 1 : +scaleSeg.value;
            let text = `${frames} ${frames === 1 ? 'frame' : 'frames'} · ${S.W * scale}×${S.H * scale} px · ${bpp} bit/px`;
            if (fmt === 'h') text += ` · ≈ ${fmtBytes(frames * rowBytes * S.H)} em flash`;
            $('#dt-estimate').textContent = text;
            segs.forEach((s) => s.refresh());
        }

        async function seek(t) {
            if (S.foto) return;
            t = clamp(t, 0, Math.max(0, S.d - 0.001));
            if (Math.abs(video.currentTime - t) < 1e-4 && video.readyState >= 2) return;
            video.currentTime = t;
            await waitEvent(video, 'seeked', 6000);
        }

        function scaleIdx(idx, W, H, s) {
            if (s === 1) return idx;
            const out = new Uint8Array(W * s * H * s);
            const row = new Uint8Array(W * s);
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) row.fill(idx[y * W + x], x * s, x * s + s);
                for (let r = 0; r < s; r++) out.set(row, (y * s + r) * W * s);
            }
            return out;
        }

        function buildHeader(frames, ident) {
            const { cols, n, order } = S.P;
            const W = S.W;
            const H = S.H;
            const bpp = bitsPerPixel();
            const lsb = bpp === 1 && $('#dt-bitorder').value === 'lsb';
            const lightOn = $('#dt-lighton').checked;
            // valor gravado por índice de cor; no 1 bit, "1" é a cor clara (ou a escura)
            let map = cols.map((_, i) => i);
            if (bpp === 1) {
                const light = order[n - 1];
                map = cols.map((_, i) => ((i === light) === lightOn ? 1 : 0));
            }
            const palette = bpp === 1 ? [0, 1].map((bit) => cols[map.indexOf(bit)]) : cols;
            const rowBytes = Math.ceil((W * bpp) / 8);
            const frameBytes = rowBytes * H;
            const U = ident.toUpperCase();
            const hex = (v, d) => `0x${v.toString(16).toUpperCase().padStart(d, '0')}`;
            const pack = (idx) => {
                const bytes = new Uint8Array(frameBytes);
                for (let y = 0; y < H; y++) {
                    let o = y * rowBytes;
                    let acc = 0;
                    let bits = 0;
                    for (let x = 0; x < W; x++) {
                        const v = map[idx[y * W + x]];
                        if (lsb) acc |= v << bits; else acc = (acc << bpp) | v;
                        bits += bpp;
                        if (bits === 8) { bytes[o++] = acc & 0xff; acc = 0; bits = 0; }
                    }
                    if (bits) bytes[o] = lsb ? acc : (acc << (8 - bits)) & 0xff;
                }
                return bytes;
            };
            const lines = [
                '/*',
                ` * ${ident}.h — gerado no Oceano (Pixelizar)`,
                ` * ${W}x${H} px · ${frames.length} frame(s) · ${S.fps} fps · ${n} cores · ${bpp} bit(s) por pixel`,
                ` * Layout: linha a linha, ${lsb ? 'LSB' : 'MSB'} primeiro, cada linha alinhada em byte (${rowBytes} bytes por linha).`
            ];
            if (bpp === 1) {
                lines.push(` * Bit 1 = cor ${lightOn ? 'clara (pixel aceso)' : 'escura'}.`);
                lines.push(lsb
                    ? ` * u8g2:         u8g2.drawXBMP(0, 0, ${U}_WIDTH, ${U}_HEIGHT, ${ident}_frames[i]);`
                    : ` * Adafruit GFX: display.drawBitmap(0, 0, ${ident}_frames[i], ${U}_WIDTH, ${U}_HEIGHT, SSD1306_WHITE);`);
            } else {
                lines.push(` * Cada pixel é um índice da paleta (${bpp} bits, o pixel mais à esquerda nos bits altos).`);
            }
            lines.push(` * Troque de frame a cada 1000 / ${U}_FPS ms.`, ' */', '#pragma once', '#include <stdint.h>', '#if defined(__AVR__)', '#include <avr/pgmspace.h>', '#endif', '#ifndef PROGMEM', '#define PROGMEM', '#endif', '');
            lines.push(
                `#define ${U}_WIDTH ${W}`, `#define ${U}_HEIGHT ${H}`, `#define ${U}_FRAMES ${frames.length}`, `#define ${U}_FPS ${S.fps}`,
                `#define ${U}_BPP ${bpp}`, `#define ${U}_COLORS ${palette.length}`, `#define ${U}_FRAME_BYTES ${frameBytes}`, ''
            );
            const c565 = palette.map(([r, g, b]) => hex(((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3), 4));
            const c888 = palette.map(([r, g, b]) => hex((r << 16) | (g << 8) | b, 6));
            lines.push('// Paleta (índice → cor): RGB565 para TFT, RGB888 para web/Python');
            lines.push(`static const uint16_t ${ident}_palette565[${U}_COLORS] = { ${c565.join(', ')} };`);
            lines.push(`static const uint32_t ${ident}_palette888[${U}_COLORS] = { ${c888.join(', ')} };`, '');
            lines.push(`static const uint8_t ${ident}_frames[${U}_FRAMES][${U}_FRAME_BYTES] PROGMEM = {`);
            frames.forEach((idx, f) => {
                const bytes = pack(idx);
                lines.push(`  { // frame ${f}`);
                for (let i = 0; i < bytes.length; i += 16) {
                    lines.push(`    ${Array.from(bytes.subarray(i, i + 16), (v) => hex(v, 2)).join(', ')},`);
                }
                lines.push('  },');
            });
            lines.push('};', '');
            return new Blob([lines.join('\n')], { type: 'text/x-c' });
        }

        // grava os quadros já pixelizados em um vídeo, no ritmo do fps escolhido
        async function videoDosQuadros(frames, scale) {
            const W = S.W * scale, H = S.H * scale, tela = document.createElement('canvas');
            tela.width = W; tela.height = H;
            const g = tela.getContext('2d'), img = g.createImageData(W, H), px = new Uint32Array(img.data.buffer);
            const fluxo = tela.captureStream(0), pista = fluxo.getVideoTracks()[0];
            const pedacos = [], grav = new MediaRecorder(fluxo, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: 12000000 });
            grav.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
            const fim = new Promise((ok) => { grav.onstop = ok; });
            grav.start();
            const repetir = frames.length === 1 ? Math.max(1, Math.round(S.fps)) : 1;   // foto: um segundo parado
            for (let r = 0; r < repetir; r++) for (let i = 0; i < frames.length; i++) {
                const idx = scale > 1 ? scaleIdx(frames[i], S.W, S.H, scale) : frames[i];
                for (let p = 0; p < idx.length; p++) px[p] = S.P.u32[idx[p]];
                g.putImageData(img, 0, 0);
                pista.requestFrame();
                progress.set('Gravando o vídeo…', (r * frames.length + i + 1) / (repetir * frames.length));
                await new Promise((ok) => setTimeout(ok, 1000 / S.fps));
            }
            grav.stop();
            await fim;
            return new Blob(pedacos, { type: 'video/webm' });
        }

        // monta uma folha com até 12 quadros e entrega para a Navegadora, como avatar em pixel art
        async function usarComoAvatar() {
            if (!S.url || S.busy) return;
            const ponte = window.oceanoPonte;
            const painel = ponte ? { importarPixel: (arquivo, w, h) => ponte.pedir('avatarPixel', { arquivo, w, h }) } : await window.parent?.oceano?.carregarPainel?.('assistente').catch(() => null);
            if (!painel?.importarPixel) { notify('O avatar só pode ser trocado dentro do Oceano'); return; }
            const total = Math.min(12, frameCount()), passo = frameCount() / total, K = Math.min(1, 512 / Math.max(S.W, S.H));
            const W = Math.max(8, Math.floor(S.W * K)), H = Math.max(8, Math.floor(S.H * K));
            const folha = document.createElement('canvas');
            folha.width = W * total; folha.height = H;
            const g = folha.getContext('2d');
            g.imageSmoothingEnabled = false;
            const keepT = video.currentTime;
            video.pause();
            S.busy = true;
            try {
                for (let i = 0; i < total; i++) {
                    await seek(S.a + (i * passo) / S.fps + 0.0005);
                    if (!renderFrame()) throw new Error('A imagem ainda está carregando');
                    g.drawImage(canvas, 0, 0, canvas.width, canvas.height, i * W, 0, W, H);
                }
                const blob = await new Promise((ok) => folha.toBlob(ok, 'image/png'));
                const nome = `${baseName(S.file.name)}`.slice(0, 20) || 'Pixelizado';
                await painel.importarPixel(new File([blob], `${nome}.png`, { type: 'image/png' }), W, H);
                notify('Pronto: já é o avatar da Navegadora');
            } catch (err) { notify(err.message || 'Não deu para usar como avatar'); } finally {
                S.busy = false;
                if (!S.foto) video.currentTime = keepT;
            }
        }

        async function exportDither() {
            if (!S.url || S.busy) return;
            const fmt = formatSeg.value;
            const scope = scopeSeg.value;
            const scale = fmt === 'h' ? 1 : +scaleSeg.value;
            const total = scope === 'frame' ? 1 : frameCount();
            if (total > 1500 && !confirm(`São ${total} frames — pode demorar e gerar um arquivo grande. Continuar?`)) return;
            const restore = busyButton($('#dt-export'), 'Exportando…');
            const keepT = video.currentTime;
            video.pause();
            S.busy = true;
            progress.show();
            try {
                const frames = [];
                if (scope === 'frame') {
                    const idx = renderFrame();
                    if (!idx) throw new Error('Vídeo ainda carregando');
                    frames.push(idx.slice());
                } else {
                    for (let i = 0; i < total; i++) {
                        await seek(S.a + i / S.fps + 0.0005);
                        const idx = renderFrame();
                        if (idx) frames.push(idx.slice());
                        progress.set(`Capturando frame ${i + 1} de ${total}`, (i + 1) / total);
                    }
                }
                progress.set('Codificando…', 1);
                await nextFrame();
                const ident = safeIdent(baseName(S.file.name));
                const W = S.W * scale;
                const H = S.H * scale;
                const palette = S.P.cols;
                const tag = `${W}x${H}_${frames.length}f_${S.fps}fps`;
                let blob;
                let filename;
                if (fmt === 'video') {
                    blob = await videoDosQuadros(frames, scale);
                    filename = `${ident}_${tag}.webm`;
                } else if (fmt === 'gif') {
                    const { GIFEncoder } = await import(LIB.gifenc);
                    const gif = GIFEncoder();
                    const depth = Math.max(2, Math.ceil(Math.log2(palette.length)));
                    frames.forEach((idx, i) => {
                        // GIF guarda centésimos de segundo: alterna os atrasos para a média bater o fps exato
                        const cs = Math.round(((i + 1) * 100) / S.fps) - Math.round((i * 100) / S.fps);
                        const opts = { delay: cs * 10, colorDepth: depth };
                        if (i === 0) Object.assign(opts, { palette, repeat: 0 });
                        gif.writeFrame(scaleIdx(idx, S.W, S.H, scale), W, H, opts);
                    });
                    gif.finish();
                    blob = new Blob([gif.bytes()], { type: 'image/gif' });
                    filename = `${ident}_${tag}.gif`;
                } else if (fmt === 'png') {
                    const size = W * H;
                    const sheet = new Uint8Array(size * frames.length);
                    frames.forEach((idx, i) => sheet.set(scaleIdx(idx, S.W, S.H, scale), i * size));
                    const meta = JSON.stringify({ generator: 'Oceano', width: W, height: H, frames: frames.length, fps: S.fps, layout: 'vertical', palette: S.pal });
                    blob = await encodeIndexedPNG(sheet, W, H * frames.length, palette, meta);
                    filename = `${ident}_${tag}.png`;
                } else if (fmt === 'zip') {
                    const files = [];
                    for (let i = 0; i < frames.length; i++) {
                        const png = await encodeIndexedPNG(scaleIdx(frames[i], S.W, S.H, scale), W, H, palette);
                        files.push({ name: `${ident}_${String(i + 1).padStart(4, '0')}.png`, data: new Uint8Array(await png.arrayBuffer()) });
                    }
                    blob = zipStore(files);
                    filename = `${ident}_${tag}.zip`;
                } else {
                    blob = buildHeader(frames, ident);
                    filename = `${ident}.h`;
                }
                downloadBlob(blob, filename);
                notify(`${filename} · ${fmtBytes(blob.size)}`);
            } catch (err) {
                console.error(err);
                notify(err.message || 'Falha na exportação');
            } finally {
                S.busy = false;
                progress.hide();
                restore();
                try { await seek(keepT); } catch { /* ok */ }
                kick();
            }
        }

        preparePalette();
        renderSwatches();

        tools.dither = {
            hide: () => { if (!S.busy) video.pause(); },
            show: () => { if (S.url) geometry(false); },
            key(e) {
                if (!S.url || S.busy) return false;
                const k = e.key.toLowerCase();
                if (e.key === ' ') { toggle(); return true; }
                if (e.key === 'ArrowLeft') { step(-1); return true; }
                if (e.key === 'ArrowRight') { step(1); return true; }
                if (k === 'i') { tl.setRange(video.currentTime, S.b, 'a'); return true; }
                if (k === 'o') { tl.setRange(S.a, video.currentTime + 1 / S.fps, 'b'); return true; }
                if (k === 'v') { toggleOriginal(); return true; }
                return false;
            }
        };
    })();
})();
