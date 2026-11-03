// Baú de senhas: a cifra. Tudo acontece aqui, na tela, com a Web Crypto do navegador:
//  - as senhas são cifradas com AES-256-GCM por uma chave do baú aleatória (cada gravação com um vetor novo);
//  - a chave do baú fica trancada pela senha-mestra (PBKDF2-SHA-256, 600 mil voltas) e pela chave de recuperação;
//  - o que vai para o disco é só o texto cifrado. Sem a senha-mestra ninguém abre, nem o Oceano.
// Nem a senha-mestra nem a chave de recuperação são guardadas; perder as duas = perder o baú.

const VOLTAS = 600000, VOLTAS_REC = 100000;   // a chave de recuperação já é longa e aleatória: precisa de menos voltas
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const AES = { name: 'AES-GCM', length: 256 };

async function chaveDe(segredo, sal, voltas) {
  const base = await crypto.subtle.importKey('raw', enc.encode(segredo), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: voltas }, base, AES, false, ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']);
}

// Formato 2: as senhas são cifradas com uma chave do baú (aleatória). Essa chave é guardada duas vezes, trancada
// por duas "fechaduras": a senha-mestra e a chave de recuperação. Qualquer uma das duas abre; trocar a senha-mestra
// só tranca de novo a chave do baú, sem recifrar tudo.
async function trancarCom(chaveBau, segredo, voltas) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const kek = await chaveDe(segredo, sal, voltas);
  return { kdf: 'PBKDF2-SHA256', voltas, sal: b64(sal), iv: b64(iv), chave: b64(await crypto.subtle.wrapKey('raw', chaveBau, kek, { name: 'AES-GCM', iv })) };
}
async function destrancar(trava, segredo) {
  try {
    const kek = await chaveDe(segredo, deB64(trava.sal), trava.voltas);
    return await crypto.subtle.unwrapKey('raw', deB64(trava.chave), kek, { name: 'AES-GCM', iv: deB64(trava.iv) }, AES, true, ['encrypt', 'decrypt']);
  } catch { return null; }
}

// chave de recuperação: 24 letras/números (120 bits), em 6 grupos de 4, sem caracteres que se confundem
const ALFA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function gerarRecuperacao() {
  const r = crypto.getRandomValues(new Uint8Array(24));
  return [...r].map(v => ALFA[v & 31]).join('').match(/.{4}/g).join('-');
}
const limparRec = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');

// cria um baú vazio: senha-mestra + chave de recuperação (que a pessoa anota; o Oceano não guarda)
export async function criar(senha) {
  const chave = await crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt']);
  const recuperacao = gerarRecuperacao();
  const travas = { senha: await trancarCom(chave, senha, VOLTAS), recuperacao: await trancarCom(chave, limparRec(recuperacao), VOLTAS_REC) };
  return { chave, travas, recuperacao };
}

async function abrirDados(guardado, chave) {
  try { return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(guardado.iv) }, chave, deB64(guardado.dados)))); }
  catch { return null; }
}

// abre com a senha-mestra; errada → null. O formato 1 (sem recuperação) é aberto e passa para o 2 na próxima gravação.
export async function abrir(guardado, senha) {
  if (guardado.formato === 'oceano-bau/1') {
    const antiga = await chaveDe(senha, deB64(guardado.sal), guardado.voltas || VOLTAS);
    const itens = await abrirDados(guardado, antiga);
    if (!itens) return null;
    const chave = await crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt']);
    return { chave, travas: { senha: await trancarCom(chave, senha, VOLTAS) }, itens };
  }
  const chave = await destrancar(guardado.travas.senha, senha);
  const itens = chave && await abrirDados(guardado, chave);
  return itens ? { chave, travas: guardado.travas, itens } : null;
}

// abre com a chave de recuperação (depois a pessoa escolhe uma senha-mestra nova)
export async function abrirComRecuperacao(guardado, codigo) {
  if (!guardado.travas?.recuperacao) return null;
  const chave = await destrancar(guardado.travas.recuperacao, limparRec(codigo));
  const itens = chave && await abrirDados(guardado, chave);
  return itens ? { chave, travas: guardado.travas, itens } : null;
}

// Touch ID: a chave do baú sai em base64 para o app guardar atrás da digital, e volta para abrir sem senha
export async function exportarChave(aberto) { return b64(await crypto.subtle.exportKey('raw', aberto.chave)); }
export async function abrirComChave(guardado, chaveB64) {
  if (!guardado.travas || !chaveB64) return null;
  try {
    const chave = await crypto.subtle.importKey('raw', deB64(chaveB64), AES, true, ['encrypt', 'decrypt']);
    const itens = await abrirDados(guardado, chave);
    return itens ? { chave, travas: guardado.travas, itens } : null;
  } catch { return null; }
}

// troca a senha-mestra / gera outra chave de recuperação (a antiga deixa de abrir)
export async function trocarSenha(aberto, nova) { aberto.travas = { ...aberto.travas, senha: await trancarCom(aberto.chave, nova, VOLTAS) }; }
export async function novaRecuperacao(aberto) {
  const recuperacao = gerarRecuperacao();
  aberto.travas = { ...aberto.travas, recuperacao: await trancarCom(aberto.chave, limparRec(recuperacao), VOLTAS_REC) };
  return recuperacao;
}

// cifra os itens para guardar
export async function fechar(aberto, itens) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aberto.chave, enc.encode(JSON.stringify(itens)));
  return { formato: 'oceano-bau/2', travas: aberto.travas, iv: b64(iv), dados: b64(dados), atualizado: Date.now() };
}

// CSV exportado por Chrome, Edge, Safari, Firefox, Bitwarden, 1Password (colunas com nomes parecidos)
export function lerCsv(texto) {
  const linhas = [], campo = [], linha = [];
  let dentro = false, atual = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentro) { if (c === '"' && texto[i + 1] === '"') { atual += '"'; i++; } else if (c === '"') dentro = false; else atual += c; continue; }
    if (c === '"') dentro = true;
    else if (c === ',') { linha.push(atual); atual = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(atual); atual = ''; if (linha.some(Boolean)) linhas.push([...linha]); linha.length = 0; }
    else atual += c;
  }
  if (atual || linha.length) { linha.push(atual); if (linha.some(Boolean)) linhas.push([...linha]); }
  void campo;
  if (linhas.length < 2) return [];
  const cab = linhas[0].map(h => h.trim().toLowerCase());
  const col = (...nomes) => cab.findIndex(h => nomes.includes(h));
  const iUrl = col('url', 'login_uri', 'website', 'site', 'web site'), iUser = col('username', 'login_username', 'user', 'login', 'email'),
    iSenha = col('password', 'login_password', 'senha'), iNome = col('name', 'title', 'nome'), iNota = col('note', 'notes', 'nota', 'extra');
  if (iSenha < 0) return [];
  return linhas.slice(1).map(l => ({
    id: crypto.randomUUID(), site: (l[iUrl] || '').trim(), nome: (l[iNome] || '').trim(), usuario: (l[iUser] || '').trim(),
    senha: l[iSenha] || '', nota: iNota >= 0 ? l[iNota] || '' : '', criado: Date.now(),
  })).filter(x => x.senha);
}

// gerador de senha forte (sem caracteres que se confundem)
export function gerarSenha(n = 20) {
  const c = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_.!@#';
  const r = crypto.getRandomValues(new Uint32Array(n));
  return [...r].map(v => c[v % c.length]).join('');
}
