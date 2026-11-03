// oceano://stave (e o endereço antigo oceano://strudel) — o Stave (https://stave.live, AGPL-3.0), estúdio em volta do Strudel, compilado a partir
// de terceiros/stave (veja terceiros/construir-stave.sh) e servido em /stave. Roda num iframe, longe da
// interface do navegador. Com o fundo "transparente", a página também fica sem fundo e o mar aparece por trás.

import { srcFerramenta, sandboxFerramenta, origemFerramenta } from './quadros.js';
import { ouvirDownloads } from './musica.js';

const fundoGuardado = () => { try { return localStorage.getItem('oceano:fundo') === 'transparente' ? 'transparente' : 'efeitos'; } catch { return 'efeitos'; } };

export const strudel = {
  titulo: () => 'Stave',
  icone: 'stave',
  html: (r, app) => `${app.musica?.abas('stave') || ''}<iframe class="strudel-quadro" src="${srcFerramenta(app, 'stave', '')}" title="Strudel · Stave" allow="autoplay; midi; clipboard-write" ${sandboxFerramenta(app)}></iframe>
    <button class="stave-gravar" data-stave-gravar title="Gravar um vídeo da tela com a música por cima (baixa um .webm)"><i></i><span>gravar vídeo</span></button>`,
  montar(el, r, app) {
    // gravar vídeo: captura esta aba com o som (a música do Stave) e baixa o arquivo ao parar
    let gravador = null;
    const botao = el.querySelector('[data-stave-gravar]');
    const parar = () => gravador?.state === 'recording' && gravador.stop();
    botao.onclick = async () => {
      if (gravador?.state === 'recording') return parar();
      let fluxo;
      try {
        fluxo = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include', systemAudio: 'include' });
      } catch { return app.aviso('Gravação cancelada.', 'Stave'); }
      if (!fluxo.getAudioTracks().length) app.aviso('Sem som na gravação: na janela do navegador, marque “compartilhar áudio da aba”.', 'Stave');
      const tipo = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
      const pedacos = [];
      gravador = new MediaRecorder(fluxo, { mimeType: tipo, videoBitsPerSecond: 6_000_000 });
      gravador.ondataavailable = e => e.data.size && pedacos.push(e.data);
      gravador.onstop = () => {
        fluxo.getTracks().forEach(t => t.stop());
        botao.classList.remove('gravando'); botao.querySelector('span').textContent = 'gravar vídeo';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(pedacos, { type: 'video/webm' }));
        a.download = `stave-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.webm`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        app.aviso('Vídeo baixado.', 'Stave');
      };
      fluxo.getVideoTracks()[0].onended = parar;   // "parar de compartilhar" do navegador também encerra
      gravador.start(1000);
      botao.classList.add('gravando'); botao.querySelector('span').textContent = 'parar e baixar';
    };
    // o áudio que o Stave baixa também chega na caixa de sons (vira CD ou vai para o sampler)
    const quadro = el.querySelector('iframe');
    quadro.addEventListener('load', () => ouvirDownloads(quadro.contentWindow, 'Stave', s => app.musica?.receber(s)));
    const aplicar = f => el.classList.toggle('strudel-transparente', f === 'transparente');
    aplicar(fundoGuardado());
    const ouvir = e => {
      if (e.source !== el.querySelector('iframe')?.contentWindow) return;
      if (e.data?.strudel === 'fundo') aplicar(e.data.valor);
      // o áudio que o Stave baixa também vai para a caixa de sons; o que chega de lá é só um arquivo de áudio, conferido aqui
      if (e.data?.strudel === 'download' && e.data.blob instanceof Blob && e.data.blob.size < 200 * 1024 * 1024) app.musica?.receber({ blob: e.data.blob, nome: String(e.data.nome || 'stave.wav').slice(0, 120), de: 'Stave' });
    };
    window.addEventListener('message', ouvir);
    // ao sair da página o iframe some e o som para junto
    return { desmontar: () => { parar(); window.removeEventListener('message', ouvir); el.classList.remove('strudel-transparente'); } };
  },
};
