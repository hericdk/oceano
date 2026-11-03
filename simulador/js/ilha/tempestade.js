// Ilha — tempestade sobre a vila: enquanto uma IA trabalha no assunto daquele grupo, as nuvens se juntam
// em cima dela, chove e caem raios (um raio extra a cada passo do gato). Terminou: as nuvens ficam paradas, sem
// chuva, até conferir; elas se espalham e somem (expo-out). Próximo passo pedido: a chuva volta.
import * as THREE from '../../vendor/three.module.min.js';
import { texturaNuvem } from './cena.js';

const N_NUVENS = 11, GOTAS = 220, PONTOS_RAIO = 9;
const ESCURA = new THREE.Color(0x4a5060), CLARA = new THREE.Color(0xc9ced8);

export function criarTempestades(cena, vilas) {
  const tex = texturaNuvem();
  const porGrupo = new Map();

  function montar(v) {
    const raio = Math.max(14, (v.comp || 10) * 1.1), alto = (v.h || 0) + 26;
    const grupo = new THREE.Group();
    cena.add(grupo);
    const nuvens = [];
    for (let k = 0; k < N_NUVENS; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: false, color: CLARA.clone() }));
      const a = (k / N_NUVENS) * Math.PI * 2, d = raio * (0.25 + (k % 4) * 0.22);
      sp.userData = { a, d, e: 16 + (k % 5) * 5, y: alto + (k % 3) * 3, gira: 0.04 + (k % 3) * 0.02 };
      grupo.add(sp); nuvens.push(sp);
    }
    // chuva: riscos curtos dentro do círculo da vila
    const pos = new Float32Array(GOTAS * 6), gotas = [];
    for (let k = 0; k < GOTAS; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * raio * 0.9;
      gotas.push({ x: v.x + Math.cos(a) * d, z: v.z + Math.sin(a) * d, y: (v.h || 0) + Math.random() * 24, vel: 30 + Math.random() * 12 });
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const chuva = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc8d6ec, transparent: true, opacity: 0, depthWrite: false }));
    chuva.frustumCulled = false; grupo.add(chuva);
    // raio: linha quebrada da nuvem ao chão + luz rápida
    const geoR = new THREE.BufferGeometry(); geoR.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PONTOS_RAIO * 3), 3));
    const raioL = new THREE.Line(geoR, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    raioL.frustumCulled = false; grupo.add(raioL);
    const luz = new THREE.PointLight(0xcfe0ff, 0, raio * 5, 1.4);
    luz.position.set(v.x, alto - 4, v.z); grupo.add(luz);
    const t = { v, raio, alto, grupo, nuvens, pos, gotas, geo, chuva, raioL, geoR, luz,
      estado: 'nada', forca: 0, chuvaF: 0, escuro: 0, espalha: 0, proxRaio: 1 + Math.random() * 2, flash: 0 };
    porGrupo.set(v.id, t);
    return t;
  }

  function cair(t) {
    const arr = t.geoR.attributes.position.array, a = Math.random() * Math.PI * 2, d = Math.random() * t.raio * 0.6;
    let x = t.v.x + Math.cos(a) * d, z = t.v.z + Math.sin(a) * d;
    const chao = (t.v.h || 0), topo = t.alto - 2;
    for (let i = 0; i < PONTOS_RAIO; i++) {
      const u = i / (PONTOS_RAIO - 1);
      arr[i * 3] = x; arr[i * 3 + 1] = topo + (chao - topo) * u; arr[i * 3 + 2] = z;
      x += (Math.random() - 0.5) * 3.2; z += (Math.random() - 0.5) * 3.2;
    }
    t.geoR.attributes.position.needsUpdate = true;
    t.flash = 1;
  }

  return {
    // lista vinda de /api/tempestades: um estado por vila (trabalhando ganha de pronto)
    definir(itens) {
      const alvo = new Map();
      for (const it of itens) if (it.estado === 'trabalhando' || (it.estado === 'pronto' && alvo.get(it.grupo) !== 'trabalhando')) alvo.set(it.grupo, it.estado);
      for (const v of vilas) {
        const e = alvo.get(v.id) || 'nada';
        let t = porGrupo.get(v.id);
        if (!t && e === 'nada') continue;
        t ||= montar(v);
        if (t.estado !== e && e !== 'nada') t.espalha = 0;
        t.estado = e;
      }
    },
    // um passo do gato (ferramenta, tarefa): raio na hora, mesmo antes do próximo poll
    raio(grupo) {
      const v = vilas.find(x => x.id === grupo) || vilas.find(x => x.central);
      if (!v) return;
      const t = porGrupo.get(v.id) || montar(v);
      if (t.estado === 'nada') t.estado = 'trabalhando';
      t.forca = Math.max(t.forca, 0.6);
      cair(t);
    },
    estadoDe: id => porGrupo.get(id)?.estado || 'nada',
    atualizar(tempo, dt, dist) {
      // de muito perto as nuvens ficam acima do quadro: a chuva e o clarão continuam visíveis
      const vis = THREE.MathUtils.smoothstep(dist, 20, 70);
      for (const t of porGrupo.values()) {
        const trab = t.estado === 'trabalhando', pronto = t.estado === 'pronto';
        const k = 1 - Math.exp(-dt * 1.6);
        t.forca += ((trab || pronto ? 1 : 0) - t.forca) * k;
        t.chuvaF += ((trab ? 1 : 0) - t.chuvaF) * k;
        t.escuro += ((trab ? 1 : 0) - t.escuro) * k;
        if (t.estado === 'nada') t.espalha = Math.min(1, t.espalha + dt / 1.4);
        const esp = 1 - Math.pow(2, -10 * t.espalha);   // expo-out: some rápido no começo, suave no fim
        t.grupo.visible = t.forca > 0.01 || t.flash > 0;
        if (!t.grupo.visible) continue;
        for (const n of t.nuvens) {
          const u = n.userData, a = u.a + tempo * u.gira, d = u.d * (1 + esp * 1.6) * (0.6 + 0.4 * t.forca);
          n.position.set(t.v.x + Math.cos(a) * d, u.y + Math.sin(tempo * 0.6 + u.a) * 0.6 + esp * 6, t.v.z + Math.sin(a) * d);
          const e = u.e * (0.7 + 0.3 * t.forca) * (1 + esp * 0.4);
          n.scale.set(e, e * 0.55, 1);
          n.material.opacity = 0.92 * t.forca * (1 - esp) * Math.max(0.35, vis);
          n.material.color.copy(CLARA).lerp(ESCURA, t.escuro);
          if (t.flash > 0) n.material.color.lerp(new THREE.Color(0xffffff), t.flash * 0.7);
        }
        // chuva
        t.chuva.material.opacity = 0.8 * t.chuvaF;
        let j = 0;
        for (const g of t.gotas) {
          if (t.chuvaF < 0.02) { t.pos.fill(0, j, j + 6); j += 6; continue; }
          g.y -= g.vel * dt;
          if (g.y < (t.v.h || 0)) g.y = t.alto - 4 - Math.random() * 4;
          t.pos[j++] = g.x; t.pos[j++] = g.y; t.pos[j++] = g.z;
          t.pos[j++] = g.x - 0.12; t.pos[j++] = g.y + 1.4; t.pos[j++] = g.z;
        }
        t.geo.attributes.position.needsUpdate = true;
        // raios só enquanto trabalha
        if (trab) { t.proxRaio -= dt; if (t.proxRaio <= 0) { cair(t); t.proxRaio = 1.6 + Math.random() * 3.2; } }
        t.raioL.material.opacity = t.flash > 0.55 ? 1 : t.flash > 0.3 ? 0.4 : 0;
        t.luz.intensity = t.flash * 60;
        t.flash = Math.max(0, t.flash - dt * 3.2);
      }
    },
    descartar() {
      for (const t of porGrupo.values()) {
        cena.remove(t.grupo);
        t.geo.dispose(); t.geoR.dispose();
        for (const n of t.nuvens) n.material.dispose();
      }
      tex.dispose();
      porGrupo.clear();
    },
  };
}
