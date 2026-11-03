// Formato de tema oceano-tema/1: validação, importação de paletas e contraste.
// Um tema é só dado. Qualquer coisa fora do formato é descartada.

export const FORMATO = 'oceano-tema/1';
export const MAX_CORES = 16;

export const TOKENS = {
  fundo: 'Fundo das páginas',
  painel: 'Painéis e barra de abas',
  elevado: 'Barra de ferramentas e botões secundários',
  borda: 'Bordas e divisórias',
  texto: 'Texto principal',
  suave: 'Texto secundário',
  acento: 'Ícones, links e botões',
  destaque: 'Aba ativa e alertas',
  sol: 'Brilhos e seleção',
};

const HEX = /^#[0-9a-f]{6}$/i;

// ---------- estilo do mar (campo opcional "mar" do tema) ----------

export const DITHERS = {
  bayer2: 'Bayer 2×2 · grosso',
  bayer4: 'Bayer 4×4 · clássico',
  bayer8: 'Bayer 8×8 · suave',
  ruido: 'Ruído · orgânico',
  'meio-tom': 'Meio-tom · pontos de jornal',
  linhas: 'Linhas · scanline',
  xadrez: 'Xadrez · só 50%',
  nenhum: 'Sem pixelizar · faixas chapadas',
};

// [mínimo, máximo, padrão] de cada ajuste numérico
export const AJUSTES_MAR = {
  pixel:      [1, 8, 3],      // tamanho do pixel na tela
  escala:     [1, 4, 1],      // tamanho de cada célula do padrão de dither
  forca:      [0, 1.5, 1],    // 0 = sem mistura entre cores
  contraste:  [0.5, 2, 1],
  brilho:     [-0.4, 0.4, 0],
  ondas:      [0.2, 2, 1],    // altura das ondas
  velocidade: [0, 2.5, 1],
  espuma:     [0, 1.5, 1],
  chuva:      [0, 1, 0],      // 0 = céu limpo; acima fecha o céu e faz chover
};
const LIGA_DESLIGA_MAR = { contorno: false, animar: false, nuvens: true, farol: true, relampago: false };

export function normalizarMar(m, nCores) {
  m = m && typeof m === 'object' ? m : {};
  const r = { dither: m.dither in DITHERS ? m.dither : 'bayer4' };
  // hora do dia da cena: 0–24 fixa o sol/lua, "relogio" segue a hora do computador
  r.hora = typeof m.hora === 'number' && isFinite(m.hora) ? Math.min(24, Math.max(0, m.hora)) : 'relogio';
  for (const [k, [min, max, padrao]] of Object.entries(AJUSTES_MAR)) {
    const v = typeof m[k] === 'number' && isFinite(m[k]) ? m[k] : padrao;
    r[k] = Math.min(max, Math.max(min, k === 'pixel' || k === 'escala' ? Math.round(v) : v));
  }
  for (const [k, padrao] of Object.entries(LIGA_DESLIGA_MAR)) r[k] = typeof m[k] === 'boolean' ? m[k] : padrao;
  // cores do mar: índices da paleta; null = paleta inteira
  const cores = Array.isArray(m.cores)
    ? [...new Set(m.cores.filter(i => Number.isInteger(i) && i >= 0 && i < nCores))].sort((a, b) => a - b)
    : null;
  r.cores = cores && cores.length >= 2 ? cores : null;
  return r;
}

export function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'tema';
}

// Devolve { tema, erros }. tema só vem preenchido se não houver erros.
export function validarTema(obj) {
  const erros = [];
  if (!obj || typeof obj !== 'object') return { erros: ['O arquivo não é um objeto JSON.'] };
  if (obj.formato !== FORMATO) erros.push(`O campo "formato" precisa ser "${FORMATO}".`);
  const paleta = Array.isArray(obj.paleta) ? obj.paleta.map(c => String(c).toLowerCase()) : [];
  if (paleta.length < 2 || paleta.length > MAX_CORES) erros.push(`A paleta precisa ter de 2 a ${MAX_CORES} cores.`);
  paleta.forEach((c, i) => { if (!HEX.test(c)) erros.push(`Cor ${i + 1} inválida: "${c}" (use #rrggbb).`); });
  const ui = {};
  for (const t of Object.keys(TOKENS)) {
    const v = obj.ui?.[t];
    if (!Number.isInteger(v) || v < 0 || v >= paleta.length) erros.push(`O token "${t}" precisa apontar para uma cor da paleta (0 a ${paleta.length - 1}).`);
    else ui[t] = v;
  }
  const nome = String(obj.nome ?? '').trim().slice(0, 40);
  if (!nome) erros.push('O tema precisa de um nome.');
  if (erros.length) return { erros };
  return {
    erros,
    tema: {
      formato: FORMATO,
      id: slug(obj.id || nome),
      nome,
      autor: String(obj.autor ?? 'você').slice(0, 40),
      descricao: String(obj.descricao ?? '').slice(0, 160),
      paleta,
      ui,
      mar: normalizarMar(obj.mar, paleta.length),
    },
  };
}

// Conferência rígida de um arquivo vindo de fora: ou é exatamente um tema, ou é bloqueado inteiro.
// Nada é aproveitado de um arquivo com campo a mais, valor de outro tipo ou texto que pareça código.
export const MAX_TEMA_BYTES = 64 * 1024;
const CAMPOS = ['formato', 'id', 'nome', 'autor', 'descricao', 'paleta', 'ui', 'mar'];
const TEXTO_SEGURO = /^[^<>{}\\`\u0000-\u001f\u007f]*$/;

export function conferirTema(texto) {
  const t = String(texto);
  if (new Blob([t]).size > MAX_TEMA_BYTES) return { erros: ['Bloqueado: grande demais para um tema (máx. 64 KB).'] };
  let obj;
  try { obj = JSON.parse(t); } catch { return { erros: ['Bloqueado: não é um JSON válido.'] }; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { erros: ['Bloqueado: um tema é um único objeto JSON.'] };
  const erros = [];
  const sobra = (dados, permitidos, onde) => { for (const k of Object.keys(dados)) if (!permitidos.includes(k)) erros.push(`Bloqueado: campo "${onde}${k}" não faz parte de um tema.`); };
  sobra(obj, CAMPOS, '');
  for (const k of ['id', 'nome', 'autor', 'descricao']) {
    if (obj[k] === undefined) continue;
    if (typeof obj[k] !== 'string' || !TEXTO_SEGURO.test(obj[k]) || /https?:|javascript:|url\(/i.test(obj[k])) erros.push(`Bloqueado: "${k}" só aceita texto simples.`);
  }
  if (obj.ui === null || typeof obj.ui !== 'object' || Array.isArray(obj.ui)) erros.push('Bloqueado: "ui" precisa ligar cada parte da tela a uma cor.');
  else sobra(obj.ui, Object.keys(TOKENS), 'ui.');
  if (obj.mar !== undefined) {
    if (obj.mar === null || typeof obj.mar !== 'object' || Array.isArray(obj.mar)) erros.push('Bloqueado: "mar" precisa ser um objeto.');
    else {
      sobra(obj.mar, ['dither', 'hora', 'cores', ...Object.keys(AJUSTES_MAR), ...Object.keys(LIGA_DESLIGA_MAR)], 'mar.');
      for (const [k, v] of Object.entries(obj.mar)) {
        const ok = k === 'dither' ? v in DITHERS : k === 'hora' ? v === 'relogio' || typeof v === 'number' : k === 'cores' ? v === null || (Array.isArray(v) && v.every(Number.isInteger)) : k in AJUSTES_MAR ? typeof v === 'number' : k in LIGA_DESLIGA_MAR ? typeof v === 'boolean' : true;
        if (!ok) erros.push(`Bloqueado: valor de "mar.${k}" inválido.`);
      }
    }
  }
  const r = validarTema(obj);
  return r.tema && !erros.length ? { tema: r.tema, erros: [] } : { erros: [...erros, ...r.erros] };
}

// Aceita lista de hex (Lospec .hex), GIMP .gpl ("R G B nome") ou um JSON de tema.
export function lerPaleta(texto) {
  const t = String(texto).trim();
  if (t.startsWith('{')) {
    const r = conferirTema(t);
    return r.tema ? { tema: r.tema } : { erros: r.erros };
  }
  const cores = [];
  for (const linha of t.split(/\r?\n/)) {
    const gpl = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\b/.exec(linha);
    if (gpl) {
      cores.push('#' + gpl.slice(1, 4).map(n => Math.min(255, +n).toString(16).padStart(2, '0')).join(''));
      continue;
    }
    for (const m of linha.matchAll(/#?\b([0-9a-f]{6})\b/gi)) cores.push('#' + m[1].toLowerCase());
  }
  const unicas = [...new Set(cores)];
  if (unicas.length < 2) return { erros: ['Não encontrei pelo menos 2 cores (#rrggbb, .hex ou .gpl).'] };
  return { paleta: unicas.slice(0, MAX_CORES), cortadas: Math.max(0, unicas.length - MAX_CORES) };
}

// ---------- cor ----------

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminancia(hex) {
  const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function hsl(hex) {
  const [r, g, b] = rgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

const distHue = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

// Distribui os tokens numa paleta crua: escuros para fundos, claros para texto,
// as mais saturadas para acento e destaque, a mais amarelada clara para "sol".
export function tokensAutomaticos(paleta) {
  const idx = paleta.map((c, i) => ({ i, l: luminancia(c), h: hsl(c) }));
  const porLuz = [...idx].sort((a, b) => a.l - b.l);
  const n = porLuz.length;
  const pega = k => porLuz[Math.min(n - 1, Math.max(0, k))].i;
  const meio = porLuz.slice(1, n - 1).length ? porLuz.slice(1, n - 1) : porLuz;
  const saturadas = [...meio].sort((a, b) => b.h[1] * (1 - Math.abs(b.h[2] - 0.55)) - a.h[1] * (1 - Math.abs(a.h[2] - 0.55)));
  const acento = saturadas[0];
  const destaque = saturadas.find(c => c !== acento && distHue(c.h[0], acento.h[0]) > 50) || saturadas[1] || acento;
  const sol = [...idx].filter(c => c.l > 0.35).sort((a, b) => distHue(a.h[0], 48) - distHue(b.h[0], 48) || b.l - a.l)[0] || porLuz[n - 1];
  return {
    fundo: pega(0),
    painel: pega(1),
    elevado: pega(2),
    borda: pega(3),
    texto: pega(n - 1),
    suave: pega(n - 2),
    acento: acento.i,
    destaque: destaque.i,
    sol: sol.i,
  };
}

// Pares que precisam ser legíveis, com o mínimo recomendado (WCAG).
export const CHECAGENS = [
  ['texto', 'fundo', 4.5, 'Texto sobre o fundo'],
  ['texto', 'painel', 4.5, 'Texto sobre painéis'],
  ['suave', 'painel', 3, 'Texto secundário sobre painéis'],
  ['acento', 'fundo', 3, 'Links e ícones sobre o fundo'],
  ['fundo', 'acento', 3, 'Texto dos botões'],
  ['destaque', 'painel', 3, 'Destaques sobre painéis'],
];
