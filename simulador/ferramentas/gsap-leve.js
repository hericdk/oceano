// Animações das ferramentas: o pouco que elas usam, sobre a Web Animations API, sem biblioteca externa.
(() => {
  const CURVAS = { 'expo.out': 'cubic-bezier(.16,1,.3,1)', 'power2.out': 'cubic-bezier(.22,.61,.36,1)', 'power3.out': 'cubic-bezier(.16,.84,.44,1)', none: 'linear' };
  const TRANSFORMACAO = new Set(['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotation']);
  const CONTROLE = new Set(['duration', 'ease', 'delay', 'stagger', 'overwrite', 'onComplete', 'onUpdate', 'clearProps']);
  const estados = new WeakMap(), vivas = new WeakMap();
  const alvos = t => (typeof t === 'string' ? [...document.querySelectorAll(t)] : t?.length !== undefined && !t.nodeType ? [...t] : t ? [t] : []);
  const estado = el => { if (!estados.has(el)) estados.set(el, { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0 }); return estados.get(el); };
  const montar = t => `translate(${t.x}px, ${t.y}px) scale(${t.scale * t.scaleX}, ${t.scale * t.scaleY}) rotate(${t.rotation}deg)`;
  const valorCss = (k, v) => (typeof v === 'number' && k !== 'opacity' && k !== 'zIndex' ? `${v}px` : String(v));
  const separar = vars => Object.entries(vars).filter(([k]) => !CONTROLE.has(k));

  function aplicar(el, vars) {
    let mudouT = false;
    for (const [k, v] of separar(vars)) {
      if (TRANSFORMACAO.has(k)) { estado(el)[k] = v; mudouT = true; } else el.style[k] = valorCss(k, v);
    }
    if (mudouT) el.style.transform = montar(estado(el));
  }
  function limpar(el, lista) {
    if (!lista) return;
    if (lista === 'all') { el.removeAttribute('style'); estados.delete(el); return; }
    for (const k of lista.split(',').map(s => s.trim())) {
      if (TRANSFORMACAO.has(k) || k === 'transform') { el.style.transform = ''; estados.delete(el); } else el.style[k] = '';
    }
  }
  function parar(el) { for (const a of vivas.get(el) || []) a.cancel(); vivas.delete(el); }

  function correr(el, de, para, cfg, i) {
    if (cfg.overwrite !== false) parar(el);
    if (de) aplicar(el, de);
    const q0 = {}, q1 = {};
    let temT = false;
    for (const [k, v] of separar(para)) {
      if (TRANSFORMACAO.has(k)) temT = true;
      else { q0[k] = el.style[k] || getComputedStyle(el)[k]; q1[k] = valorCss(k, v); }
    }
    if (temT) {
      const fim = { ...estado(el) };
      for (const [k, v] of separar(para)) if (TRANSFORMACAO.has(k)) fim[k] = v;
      q0.transform = montar(estado(el)); q1.transform = montar(fim);
    }
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduzir ? 0 : (cfg.duration ?? 0.5) * 1000;
    let vivo = !!cfg.onUpdate;
    const avisar = () => { if (!vivo) return; cfg.onUpdate(); requestAnimationFrame(avisar); };
    if (vivo) requestAnimationFrame(avisar);
    const a = el.animate([q0, q1], { duration: ms, delay: reduzir ? 0 : ((cfg.delay || 0) + (cfg.stagger || 0) * i) * 1000, easing: CURVAS[cfg.ease] || CURVAS['expo.out'], fill: 'both' });
    vivas.set(el, [...(vivas.get(el) || []), a]);
    return a.finished.then(() => { vivo = false; aplicar(el, para); a.cancel(); limpar(el, cfg.clearProps); return true; }, () => { vivo = false; return false; });
  }
  // objeto comum (zoom e deslocamento da comparação de imagens): anima os números e avisa a cada quadro
  function numeros(o, para) {
    const inicio = performance.now(), ms = (para.duration ?? 0.5) * 1000, de = {};
    for (const [k] of separar(para)) de[k] = o[k];
    let vivo = true;
    (function passo(agora) {
      if (!vivo) return;
      const p = ms ? Math.min(1, (agora - inicio) / ms) : 1, q = 1 - Math.pow(2, -10 * p);
      for (const [k, v] of separar(para)) o[k] = de[k] + (v - de[k]) * (p === 1 ? 1 : q);
      para.onUpdate?.();
      if (p < 1) requestAnimationFrame(passo); else para.onComplete?.();
    })(inicio);
    return { kill: () => { vivo = false; } };
  }
  function grupo(t, de, para) {
    if (t && !t.nodeType && t.length === undefined && typeof t === 'object' && !(t instanceof Element)) return numeros(t, para);
    const lista = alvos(t);
    const todas = lista.map((el, i) => correr(el, de, para, para, i));
    if (para.onComplete) Promise.all(todas).then(r => { if (r.every(Boolean)) para.onComplete(); });
    return { kill: () => lista.forEach(parar) };
  }
  // de: valores iniciais; o destino é o que o elemento já tem agora
  function destinoAtual(el, de) {
    const fim = {};
    for (const [k] of separar(de)) fim[k] = TRANSFORMACAO.has(k) ? estado(el)[k] : (el.style[k] || getComputedStyle(el)[k]);
    return fim;
  }
  window.gsap = {
    to: (t, vars) => grupo(t, null, vars),
    fromTo: (t, de, para) => grupo(t, de, para),
    from(t, vars) {
      const lista = alvos(t);
      const todas = lista.map((el, i) => { const fim = destinoAtual(el, vars); return correr(el, vars, { ...fim, ...Object.fromEntries(Object.entries(vars).filter(([k]) => CONTROLE.has(k))) }, vars, i); });
      if (vars.onComplete) Promise.all(todas).then(r => { if (r.every(Boolean)) vars.onComplete(); });
      return { kill: () => lista.forEach(parar) };
    },
    set(t, vars) { for (const el of alvos(t)) { parar(el); aplicar(el, vars); limpar(el, vars.clearProps); } },
    killTweensOf(t) { alvos(t).forEach(parar); },
  };
})();
