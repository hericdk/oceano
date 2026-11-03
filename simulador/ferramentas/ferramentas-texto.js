// --- Routing & Tabs ---
function initRouter() {
    const hash = window.location.hash.substring(1) || 'case-converter';
    const tabs = document.querySelectorAll('.tab-content');
    const links = document.querySelectorAll('.nav-link');
    
    let found = false;
    tabs.forEach(tab => {
        if (tab.id === hash) {
            tab.classList.add('active');
            found = true;
        } else {
            tab.classList.remove('active');
        }
    });

    if (!found && tabs.length > 0) {
        tabs[0].classList.add('active');
    }

    links.forEach(link => {
        if (link.getAttribute('href') === '#' + (hash === 'video' ? 'editor' : hash)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

window.addEventListener('hashchange', initRouter);
window.addEventListener('DOMContentLoaded', initRouter);

// --- Utilities ---
function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el.value) return;
    navigator.clipboard.writeText(el.value).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}

function copyText(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}

function clearField(elementId) {
    document.getElementById(elementId).value = '';
}

function autoResizeTextarea(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}

// --- Case Converter ---
function convertCase(type) {
    const input = document.getElementById('cc-input');
    let text = input.value;
    if (!text) return;

    switch(type) {
        case 'upper':
            text = text.toUpperCase();
            break;
        case 'lower':
            text = text.toLowerCase();
            break;
        case 'title':
            const minorWords = [
                'com', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 
                'para', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'um', 'uma', 'uns', 'umas', 
                'o', 'a', 'os', 'as', 'e', 'ou', 'sob', 'sobre', 'sem', 'atrás', 'até', 
                'desde', 'entre', 'an', 'the', 'and', 'but', 'for', 'nor', 'on', 'at', 
                'to', 'from', 'by', 'of', 'in', 'with'
            ];
            text = text.toLowerCase().replace(/[a-zA-ZÀ-ÿ]+/g, function(word, index, fullStr) {
                const charBefore = fullStr.substring(0, index).trim().slice(-1);
                const isStart = index === 0 || charBefore === '' || /[\.\!\?\n\r\-\/]/.test(charBefore);
                
                if (isStart || minorWords.indexOf(word) === -1) {
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
            });
            break;
        case 'sentence':
            text = text.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, match => match.toUpperCase());
            break;
    }
    input.value = text;
    copyToClipboard('cc-input');
}

// --- Lorem Ipsum ---
const loremWords = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo", "consequat"];

// --- Lero-lero do mar: frases sem sentido para preencher telas, sempre com concordância certa ---
const LERO = {
    plural: ['os cinco faroleiros sonolentos', 'as sete gaivotas teimosas', 'os três marujos boxeadores', 'as velhas boias de sinalização', 'os doze capitães distraídos', 'as nove sereias contadoras', 'os dois cartógrafos de chinelo', 'as quatro baleias filósofas', 'os seis grumetes poetas', 'as oito âncoras saudosas', 'os onze caranguejos advogados', 'as dez lanternas de popa', 'os pescadores da ilha de trás', 'as ondas mais pontuais do porto'],
    singular: ['o faroleiro de plantão', 'a gaivota contadora', 'o capitão sem bússola', 'a sereia aposentada', 'o velho timoneiro', 'a maré mais pontual do cais', 'o polvo navegador', 'a escuna de segunda mão', 'o marujo de primeira viagem', 'a boia solitária', 'o golfinho despachante', 'a bússola indecisa', 'o guarda-costas do farol', 'a tartaruga do correio'],
    predicado: [['navegam em círculos', 'navega em círculos'], ['pulam rapidamente do convés', 'pula rapidamente do convés'], ['remendam as velas com linha de pipa', 'remenda as velas com linha de pipa'], ['acendem o farol com fósforo molhado', 'acende o farol com fósforo molhado'], ['contam estrelas em voz baixa', 'conta estrelas em voz baixa'], ['desenham mapas de ilhas imaginárias', 'desenha mapas de ilhas imaginárias'], ['discutem o preço da maré', 'discute o preço da maré'], ['içam a bandeira errada', 'iça a bandeira errada'], ['medem a neblina com régua', 'mede a neblina com régua'], ['ancoram longe de tudo', 'ancora longe de tudo'], ['trocam cartas com os atuns', 'troca cartas com os atuns'], ['dobram o cabo sem avisar', 'dobra o cabo sem avisar'], ['ensaiam sinais de luz para ninguém', 'ensaia sinais de luz para ninguém'], ['guardam o vento numa garrafa', 'guarda o vento numa garrafa'], ['seguem a corrente por educação', 'segue a corrente por educação'], ['pedem informação aos cardumes', 'pede informação aos cardumes']],
    fecho: ['ao cair da tarde', 'antes de a maré virar', 'sob a luz do farol', 'em plena calmaria', 'a dois nós por hora', 'na volta do temporal', 'bem depois do horizonte', 'quando a neblina deixa', 'no fim do quarto de vigia', 'entre uma onda e outra', 'perto do último cais', 'sem consultar a carta náutica'],
};
const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
function fraseLero() {
    const plural = Math.random() < 0.5;
    const quem = sortear(plural ? LERO.plural : LERO.singular), faz = sortear(LERO.predicado)[plural ? 0 : 1];
    const frase = Math.random() < 0.6 ? `${quem} ${faz} ${sortear(LERO.fecho)}` : `${quem} ${faz}`;
    return frase.charAt(0).toUpperCase() + frase.slice(1) + '.';
}
function frasesLero(n) {
    const vistas = new Set();
    for (let tentativa = 0; vistas.size < n && tentativa < n * 20; tentativa++) vistas.add(fraseLero());
    while (vistas.size < n) vistas.add(fraseLero() + '\u200b'.repeat(vistas.size));
    return [...vistas].map(f => f.replace(/\u200b/g, ''));
}
function gerarLero(count, tipo) {
    if (tipo === 'words') return frasesLero(count).join('\n');
    return Array.from({ length: count }, () => frasesLero(3 + Math.floor(Math.random() * 4)).join(' ')).join('\n\n');
}
function modoLorem(modo) {
    document.querySelectorAll('#lorem-modo [data-modo]').forEach(b => { const on = b.dataset.modo === modo; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    document.getElementById('lorem-unidade').textContent = modo === 'lero' ? 'Frases' : 'Palavras';
    document.getElementById('lorem-converter').hidden = modo === 'lero';
    document.getElementById('lorem').dataset.modo = modo;
    generateLorem();
}
document.getElementById('lorem-modo').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (b) modoLorem(b.dataset.modo); });

function generateLorem() {
    const count = parseInt(document.getElementById('lorem-count').value) || 1;
    const selectedType = document.querySelector('input[name="lorem-type"]:checked');
    const type = selectedType ? selectedType.value : 'paragraphs';
    let result = '';

    if (document.getElementById('lorem').dataset.modo === 'lero') {
        result = gerarLero(count, type);
    } else if (type === 'words') {
        let words = [];
        for(let i=0; i<count; i++) {
            words.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
        }
        result = words.join(' ');
        result = result.charAt(0).toUpperCase() + result.slice(1) + '.';
    } else {
        let paras = [];
        for(let i=0; i<count; i++) {
            const baseLength = Math.floor(Math.random() * 20) + 20;
            // Varia ate 150% a mais em relacao ao tamanho base de cada paragrafo.
            const pLength = Math.floor(baseLength * (1 + Math.random() * 1.5));
            let pWords = [];
            for(let j=0; j<pLength; j++) {
                pWords.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
            }
            let p = pWords.join(' ');
            p = p.charAt(0).toUpperCase() + p.slice(1) + '.';
            paras.push(p);
        }
        result = paras.join('\n\n');
    }
    document.getElementById('lorem-output').value = result;
    autoResizeTextarea('lorem-output');
}

function scrambleText() {
    const input = document.getElementById('lorem-output');
    let text = input.value;
    if (!text) return;
    
    const scrambled = text.replace(/[a-zA-ZÀ-ÿ]+/g, (match) => {
        const isCapitalized = match[0] === match[0].toUpperCase();
        const isAllCap = match === match.toUpperCase() && match.length > 1;
        let randomWord = loremWords[Math.floor(Math.random() * loremWords.length)];
        
        if (isAllCap) return randomWord.toUpperCase();
        if (isCapitalized) return randomWord.charAt(0).toUpperCase() + randomWord.slice(1);
        return randomWord;
    });
    input.value = scrambled;
}
