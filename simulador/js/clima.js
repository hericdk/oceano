// O céu da tela do farol: nuvens, vento e tempestades variam a cada abertura e ao longo do dia, sem sair deste computador.
// Se a pessoa escrever a cidade dela, o clima de lá manda na cena. Só o nome da cidade e a posição dela vão ao Open-Meteo,
// sem conta e sem chave, e só com essa opção ligada. Tudo desliga em Configurações ou no chip do relógio.
import { icone } from './icones.js';

import { sensivel } from './sensivel.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CALMO = { cobertura: 0.7, vento: 0.2, chuva: 0, raios: 0 };
const TEMPESTADE = { cobertura: 1, vento: 1, chuva: 1, raios: 1 };
const MEIA_HORA = 30 * 60 * 1000;

// sorteia o céu de agora; à tarde tende a ter mais nuvens, de vez em quando vem uma tempestade
export function sortearCeu(hora, sorte = Math.random) {
  if (sorte() < 0.05) return { ...TEMPESTADE };
  const tarde = hora >= 13 && hora <= 19 ? 0.15 : 0;
  const chuvisco = sorte() < 0.08 ? 0.25 + sorte() * 0.2 : 0;
  return { cobertura: Math.min(1, 0.25 + sorte() * 0.65 + tarde + chuvisco), vento: 0.1 + sorte() * 0.5, chuva: chuvisco, raios: 0 };
}

// código do tempo da OMM → cena
export function ceuDoTempo({ weather_code: c = 0, wind_speed_10m: v = 0 } = {}) {
  const vento = Math.min(1, 0.1 + v / 45);
  if (c >= 95) return { ...TEMPESTADE };
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { cobertura: 1, vento: Math.max(vento, 0.8), chuva: c === 65 || c === 82 ? 1 : 0.8, raios: c === 65 || c === 82 ? 1 : 0 };
  if (c >= 51 && c <= 57) return { cobertura: 1, vento, chuva: 0.35, raios: 0 };
  if (c >= 71 && c <= 86) return { cobertura: 1, vento, chuva: 0.3, raios: 0 };
  if (c === 45 || c === 48 || c === 3) return { cobertura: 1, vento, chuva: 0, raios: 0 };
  if (c === 2) return { cobertura: 0.7, vento, chuva: 0, raios: 0 };
  if (c === 1) return { cobertura: 0.4, vento, chuva: 0, raios: 0 };
  return { cobertura: 0.15, vento, chuva: 0, raios: 0 };
}

// os códigos de tempo do Open-Meteo: o nome em português e o ícone em pixel
export function descreverTempo(c = 0) {
  if (c === 0) return { ceu: 'Céu limpo', icone: 'sol' };
  if (c <= 2) return { ceu: 'Poucas nuvens', icone: 'nuvem' };
  if (c === 3) return { ceu: 'Nublado', icone: 'nuvem' };
  if (c <= 48) return { ceu: 'Neblina', icone: 'nuvem' };
  if (c <= 57) return { ceu: 'Garoa', icone: 'chuva' };
  if (c <= 67 || (c >= 80 && c <= 82)) return { ceu: 'Chuva', icone: 'chuva' };
  if (c <= 77 || c === 85 || c === 86) return { ceu: 'Neve', icone: 'neve' };
  return { ceu: 'Trovoada', icone: 'raio' };
}
const POR_NOME = ({ name, admin1, country }) => [name, admin1, country].filter(Boolean).filter((v, i, l) => l.indexOf(v) === i).join(', ');

export function criarClima(app, guardado, buscar = (...a) => fetch(...a)) {
  let conf = { vivo: true, real: false, cidade: '', lat: null, lon: null, ...guardado.ler('clima', {}) };
  let tempoReal = null, agora = null, atualizado = 0, sorteioTimer = 0, recado = '';
  const salvar = () => guardado.gravar('clima', conf);
  const avisar = () => app.emitir('clima');

  function aplicar() {
    if (app.ceuLimpo) return app.mar.definirClima({ ...CALMO });   // os primeiros passos mostram o sol
    if (conf.real && tempoReal) return app.mar.definirClima(tempoReal);
    app.mar.definirClima(conf.vivo ? sortearCeu(app.mar.hora()) : { ...CALMO });
  }

  async function buscarTempo() {
    if (!conf.real || conf.lat == null) return;
    app.registrarRede('api.open-meteo.com', 'Clima da sua cidade (você ligou)', 'a posição da cidade, sem identificar você');
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${conf.lat.toFixed(2)}&longitude=${conf.lon.toFixed(2)}&current=weather_code,wind_speed_10m,temperature_2m,apparent_temperature,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`;
    try {
      const r = await buscar(u, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error();
      const d = await r.json(), at = d.current || {};
      tempoReal = ceuDoTempo(at);
      agora = { ...descreverTempo(at.weather_code), temperatura: at.temperature_2m, sensacao: at.apparent_temperature, umidade: at.relative_humidity_2m, vento: at.wind_speed_10m, maxima: d.daily?.temperature_2m_max?.[0], minima: d.daily?.temperature_2m_min?.[0], chanceChuva: d.daily?.precipitation_probability_max?.[0] };
      atualizado = Date.now(); recado = '';
    } catch { tempoReal = null; agora = null; recado = 'Não consegui ver o clima agora. O céu segue variando sozinho.'; }
    aplicar(); avisar();
  }

  // o autocompletar: as letras digitadas vão ao Open-Meteo, e por isso só depois de a pessoa ligar a opção
  async function procurarCidades(nome) {
    const n = String(nome).trim().slice(0, 80);
    if (n.length < 2) return [];
    app.registrarRede('geocoding-api.open-meteo.com', 'Achar a sua cidade (você pediu)', 'o nome da cidade');
    try {
      const r = await buscar(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=${encodeURIComponent((app.idioma?.atual?.() || 'pt').slice(0, 2))}&format=json&name=${encodeURIComponent(n)}`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      return ((await r.json()).results || []).filter(c => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)).map(c => ({ nome: String(c.name).slice(0, 80), rotulo: POR_NOME(c).slice(0, 120), lat: c.latitude, lon: c.longitude }));
    } catch { return []; }
  }
  async function escolherCidade(c) {
    conf = { ...conf, real: true, cidade: c.nome, lat: c.lat, lon: c.lon };
    salvar();
    await buscarTempo();
    return { cidade: conf.cidade };
  }

  async function definirCidade(nome) {
    const n = String(nome).trim().slice(0, 80);
    if (!n) return { erro: 'Escreva o nome da cidade.' };
    app.registrarRede('geocoding-api.open-meteo.com', 'Achar a sua cidade (você pediu)', 'o nome da cidade');
    let achada;
    try {
      const r = await buscar(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&format=json&name=${encodeURIComponent(n)}`, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      achada = (await r.json()).results?.[0];
    } catch { return { erro: 'Não consegui procurar a cidade agora.' }; }
    if (!achada || !Number.isFinite(achada.latitude) || !Number.isFinite(achada.longitude)) return { erro: 'Não achei essa cidade.' };
    conf = { ...conf, real: true, cidade: String(achada.name).slice(0, 80), lat: achada.latitude, lon: achada.longitude };
    salvar();
    await buscarTempo();
    return { cidade: conf.cidade };
  }

  function definir(chave, valor) {
    conf = { ...conf, [chave]: valor }; salvar();
    if (chave === 'real' && !valor) { tempoReal = null; agora = null; }
    if (chave === 'real' && valor) buscarTempo();
    aplicar(); avisar();
  }

  // o céu muda de tempos em tempos, sem hora marcada
  function agendar() {
    clearTimeout(sorteioTimer);
    sorteioTimer = setTimeout(() => { if (!(conf.real && tempoReal)) aplicar(); agendar(); }, (4 + Math.random() * 8) * 60000);
  }
  setInterval(() => { if (conf.real && Date.now() - atualizado >= MEIA_HORA) buscarTempo(); }, 60000);

  aplicar(); agendar();
  if (conf.real) buscarTempo();

  return { config: () => ({ ...conf }), agora: () => agora, procurarCidades, escolherCidade, definir, definirCidade, aplicar, recado: () => recado, tempo: () => tempoReal };
}

export const htmlClima = app => {
  const c = app.clima?.config();
  if (!c) return '';
  return `<div class="clima-cfg" data-clima-cfg>
    <label class="cfg-chave"><input type="checkbox" data-clima="vivo" ${c.vivo ? 'checked' : ''}> nuvens, vento e tempestades variam sozinhos</label>
    <label class="cfg-chave"><input type="checkbox" data-clima="real" ${c.real ? 'checked' : ''}> usar o clima da minha cidade</label>
    <form class="clima-cidade" data-clima-form ${c.real ? '' : 'hidden'}>
      <p class="clima-agora" data-clima-agora role="status"></p>
      <div class="clima-campo">
        <input name="cidade" placeholder="${c.cidade ? 'Trocar a cidade' : 'Sua cidade'}" aria-label="Sua cidade" autocomplete="off" maxlength="80" role="combobox" aria-expanded="false" aria-controls="clima-sugestoes" aria-autocomplete="list">
        <ul class="clima-sugestoes" id="clima-sugestoes" role="listbox" data-clima-sugestoes hidden></ul>
      </div>
    </form>
    <p class="nota" data-clima-msg role="status">${esc(app.clima.recado())}</p>
    <p class="nota">Com a cidade ligada, o nome dela vai ao Open-Meteo. Chovendo lá, a tempestade aparece aqui.</p>
  </div>`;
};

export function ligarClima(el, app) {
  const caixa = el.querySelector('[data-clima-cfg]');
  if (!caixa) return;
  const form = caixa.querySelector('[data-clima-form]'), msg = caixa.querySelector('[data-clima-msg]'), campo = form.elements.cidade;
  const lista = caixa.querySelector('[data-clima-sugestoes]'), linhaAgora = caixa.querySelector('[data-clima-agora]');
  let opcoes = [], ativa = -1, espera = 0, pedido = 0;
  const pintarAgora = () => {
    const c = app.clima.config(), a = app.clima.agora();
    linhaAgora.hidden = !c.cidade;
    linhaAgora.innerHTML = c.cidade ? `${a ? icone(a.icone) : ''}<b data-sensivel>${esc(c.cidade)}</b>${a ? `<span>${Number.isFinite(a.temperatura) ? Math.round(a.temperatura) + '° · ' : ''}${esc(a.ceu)}</span>` : ''}` : '';
  };
  const fechar = () => { lista.hidden = true; lista.innerHTML = ''; opcoes = []; ativa = -1; campo.setAttribute('aria-expanded', 'false'); campo.removeAttribute('aria-activedescendant'); };
  const pintarLista = () => {
    lista.innerHTML = opcoes.map((c, n) => `<li id="clima-op-${n}" role="option" aria-selected="${n === ativa}" data-n="${n}" data-sensivel>${esc(c.rotulo)}</li>`).join('');
    lista.hidden = !opcoes.length;
    campo.setAttribute('aria-expanded', String(!!opcoes.length));
    if (ativa >= 0) campo.setAttribute('aria-activedescendant', 'clima-op-' + ativa); else campo.removeAttribute('aria-activedescendant');
  };
  const escolher = async c => {
    fechar(); campo.value = ''; msg.textContent = 'Procurando…';
    await app.clima.escolherCidade(c);
    msg.textContent = app.clima.recado(); campo.placeholder = 'Trocar a cidade'; pintarAgora();
  };
  pintarAgora();
  app.on?.('clima', pintarAgora);
  caixa.addEventListener('change', e => {
    const k = e.target.dataset.clima; if (!k) return;
    app.clima.definir(k, e.target.checked);
    if (k === 'real') form.hidden = !e.target.checked;
    if (k === 'real' && e.target.checked && !app.clima.config().cidade) campo.focus();
  });
  campo.addEventListener('input', () => {
    clearTimeout(espera);
    const n = campo.value, meu = ++pedido;
    if (n.trim().length < 2) return fechar();
    espera = setTimeout(async () => { const r = await app.clima.procurarCidades(n); if (meu !== pedido) return; opcoes = r; ativa = r.length ? 0 : -1; msg.textContent = r.length ? '' : 'Não achei essa cidade.'; pintarLista(); }, 250);
  });
  campo.addEventListener('keydown', e => {
    if (e.key === 'Escape') return fechar();
    if (!opcoes.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ativa = (ativa + (e.key === 'ArrowDown' ? 1 : opcoes.length - 1)) % opcoes.length; pintarLista(); }
  });
  lista.addEventListener('pointerdown', e => { const li = e.target.closest('[data-n]'); if (li) { e.preventDefault(); escolher(opcoes[+li.dataset.n]); } });
  campo.addEventListener('blur', () => setTimeout(fechar, 120));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (opcoes[ativa]) return escolher(opcoes[ativa]);
    msg.textContent = 'Procurando…';
    const r = await app.clima.definirCidade(campo.value);
    msg.textContent = r.erro || app.clima.recado();
    if (r.cidade) campo.value = '';
    pintarAgora();
  });
}
