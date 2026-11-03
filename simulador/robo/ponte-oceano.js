// no app o simulador tem origem própria: quem fala com ele é só a interface do navegador
const ORIGEM_PAI = window.oceanoPonte?.origemPai || location.origin;
// Ponte com quem abriu o simulador num quadro (o navegador Oceano): pedidos por postMessage, só do próprio pai e da mesma origem.
// { robo: 'pedido', id, cmd, args } → { robo: 'resposta', id, ok, valor | erro }
// Só comandos desta lista: nada aqui instala, baixa ou lê arquivo do computador.
const R = () => window.robo;
// quadros por segundo e quanto cada membro se mexe, para o painel de consumo do navegador
let quadros = 0, fps = 0, marca = performance.now();
const contar = (t) => { quadros++; if (t - marca >= 1000) { fps = Math.round(quadros * 1000 / (t - marca)); quadros = 0; marca = t; } requestAnimationFrame(contar); };
requestAnimationFrame(contar);
let antes = null;
function membros(juntas) {
  const agora = performance.now(), grupos = {};
  for (const j of juntas) {
    const nome = String(j.nome).split(' ')[0];
    const a = antes?.j[j.nome], dt = antes ? (agora - antes.t) / 1000 : 0;
    const g = grupos[nome] ||= { nome, juntas: 0, grausPorS: 0 };
    g.juntas++;
    if (dt > 0 && a != null) g.grausPorS += Math.abs(j.grausCmd - a) / dt;
  }
  antes = { t: agora, j: Object.fromEntries(juntas.map(j => [j.nome, j.grausCmd])) };
  return Object.values(grupos).map(g => ({ ...g, grausPorS: Math.round(g.grausPorS / g.juntas) }));
}
const COMANDOS = {
  estado: () => R().estado(),
  robos: () => R().OF.robots.map(r => ({ id: r.id, nome: r.nome, base: r.base, ativo: !r.off, deFabrica: !!r.prot })),
  carregar: ({ id }) => { if (!R().PRESETS[id]) throw new Error('robô não existe'); R().load(id); return R().estado(); },
  motores: () => Object.entries(R().MOTORS).filter(([, m]) => !m.hide).map(([id, m]) => ({ id, nome: m.n, torqueNm: m.tmax, grausPorS: m.speed, gramas: m.g, estimado: !!m.est, giraSemParar: !!m.cont })),
  motor: ({ id }) => { if (!R().MOTORS[id]) throw new Error('motor não existe'); R().MOT.want = id; R().motorSet(id); return R().estado(); },
  andar: ({ vx = 0, vz = 0, wz = 0 }) => { R().api.walk({ vx, vz, wz }); return true; },
  parar: () => { R().api.stop(); return true; },
  testarMotor: async () => R().motorRun(),
  estudo: async () => R().estudoRun(),
  oficina: () => { R().oficinaAbrir(); return true; },
  // modelos 3D: os originais só leem e duplicam; escrever vale para os robôs criados na oficina (docs/ROBO-MODELOS.md)
  modelos: () => R().modelosIA.lista(),
  modeloLer: a => R().modelosIA.ler(a),
  modeloMontagem: a => R().modelosIA.mudarMontagem(a),
  modeloTrocar: a => R().modelosIA.trocarArquivo(a),
  modeloDuplicar: a => R().modelosIA.duplicar(a),
  consumo: () => {
    const G = R().GOV, e = R().estado();
    const mem = performance.memory;
    return { robo: e.robo, modo: e.modo, mb: Math.round(G.mb), limite: G.limit, leve: !!G.leve, nivel: G.lvl, corte: G.cut || '', fps, previsaoLigada: !G.predOff, previsaoPct: G.predPct, fisicaHz: G.hz, jsMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null, membros: membros(e.juntas || []) };
  },
  regulador: ({ limite, leve }) => {
    const G = R().GOV;
    if ([256, 512, 1024, 2048].includes(limite)) { G.limit = limite; const s = document.querySelector('#govLim'); if (s) s.value = String(limite); }
    if (typeof leve === 'boolean' && leve !== G.leve) document.querySelector('#govLeve')?.click();
    try { localStorage.setItem('robo-gov', JSON.stringify({ limit: G.limit, leve: G.leve })); } catch (e) {}
    R().govTick?.();
    return { limite: G.limit, leve: G.leve };
  },
};
// O design do simulador é o padrão. As cores do tema só entram quando o Oceano avisa que a pessoa ligou isso nas Configurações.
function aplicarTema(ligado, c) {
  document.querySelector('#temaOceano')?.remove();
  document.documentElement.classList.toggle('tema-oceano', !!ligado);
  if (!ligado || !c) { R()?.corCena?.(null); return; }
  const st = document.createElement('style'); st.id = 'temaOceano';
  st.textContent = `:root{--bg:${c.fundo};--fg:${c.texto};--dim:${c.suave};--line:${c.borda};--acc:${c.acento};--panel:${c.painel}}
.panel,#right,#impP,#dmgP,.panel.dragging{background:${c.painel}!important}
select,button.b,textarea,input[type=number],input[type=text],.seg button,#dock button{background:${c.elevado};color:${c.texto};border-color:${c.borda}}
.seg button.on,button.b.acc,tr.sel td,.asmrow.on{background:${c.acento}!important;border-color:${c.acento}!important;color:${c.fundo}!important}
#govP{background:${c.acento}}#govBar0{background:repeating-conic-gradient(#000 0 25%,${c.acento} 0 50%) 0 0/2px 2px}
#alBox{border-color:${c.acento}}.alFx,#alChip{background-image:repeating-linear-gradient(135deg,#000 0 16px,${c.acento} 16px 32px)}#alTri{background:${c.acento}}#alCond{color:${c.suave}}#alSug{border-color:${c.acento}}#alSug li:before{color:${c.acento}}#alAc button.pri{background:${c.acento};border-color:${c.acento};color:${c.fundo}}`;
  document.head.appendChild(st); R()?.corCena?.(c.fundo);
}
addEventListener('message', async (e) => {
  if (e.data?.robo === 'tema' && e.source === window.parent && window.parent !== window && e.origin === ORIGEM_PAI) { aplicarTema(e.data.ligado, e.data.cores); return; }
  const d = e.data; if (!d || d.robo !== 'pedido' || e.source !== window.parent || window.parent === window || e.origin !== ORIGEM_PAI) return;
  const responde = (x) => e.source.postMessage({ robo: 'resposta', id: d.id, ...x }, e.origin);
  const f = Object.prototype.hasOwnProperty.call(COMANDOS, d.cmd) ? COMANDOS[d.cmd] : null;
  if (!f) { responde({ ok: false, erro: 'comando desconhecido' }); return; }
  try { responde({ ok: true, valor: JSON.parse(JSON.stringify(await f(d.args || {}))) }); } catch (err) { responde({ ok: false, erro: String(err.message || err) }); }
});
if (window.parent !== window) { try { window.parent.postMessage({ robo: 'pronto' }, ORIGEM_PAI); } catch (e) {} }
