# winampFM dentro do Oceano

Cópia do simulador do winampFM (github.com/hericdk/winampFM, GPL-3.0, de @hericdk): o firmware do FM-1 com a
interface estilo Winamp, rodando em WebAssembly. O Oceano abre esta página (`index.html?remix`) ao lado do player
de CDs para remixar por cima com o teclado do computador, um teclado MIDI ou um FM-1 de verdade no USB.

Para atualizar: copie de novo `winampFM/sim/` (index.html, sim.js, fm1-3d.js, fm1-sim.css, fm1-worklet.js,
winampfm.wasm, demos.js, a fonte) e refaça os três ajustes em index.html: three.js local (three-r128.min.js),
sem tour.js, e o modo `?remix` (esconde a barra de demos).
