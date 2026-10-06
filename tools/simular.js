#!/usr/bin/env node
// Valida o conteúdo e joga milhares de runs pra medir o equilíbrio.
// Joga com dois perfis:
//   aleatório -> escolhe qualquer carta
//   atento    -> olha as barras e evita empurrar uma que já está perto do extremo (uma pessoa jogando)
//   sensato   -> sabe exatamente quanto cada carta sobe a caveira (como com o Olho do Falcão)
// Uso: node tools/simular.js [jogadores] [runsPorJogador]
'use strict';
require('../js/cartas.js');
require('../js/nucleo.js');

const D = globalThis.DADOS;
const N = globalThis.Nucleo;

// ── Validação do conteúdo ──
const erros = [];
const avisos = [];
const ICONES = new Set(['caveira', 'moeda', 'cabeca', 'goblin', 'rato', 'chama', 'adaga', 'bota', 'olho', 'balao', 'mascara', 'saco', 'ampulheta', 'chave', 'coracao']);
const textoDe = b => (typeof b === 'string' ? b : b.t);
const quemDe = (b, c) => (typeof b === 'string' ? c.quem : (b.quem || c.quem));

for (const a of D.ARCOS) {
  const fixas = a.fixas || (a.fixa ? [a.fixa] : []);
  for (const id of [a.inicio, a.fim, ...fixas.map(f => f.id)]) {
    if (!D.CARTAS[id]) erros.push(`Arco ${a.n}: carta "${id}" não existe`);
  }
}
for (const c of D.LISTA_CARTAS) {
  if (!D.QUEM[c.quem]) erros.push(`${c.id}: personagem "${c.quem}" não existe`);
  const batidas = [].concat(c.texto, c.textoLoop || [], c.extras || []);
  for (const b of batidas) {
    if (!D.QUEM[quemDe(b, c)]) erros.push(`${c.id}: personagem "${quemDe(b, c)}" não existe`);
    if (textoDe(b).length > 160) avisos.push(`${c.id}: batida com ${textoDe(b).length} caracteres (meta: até 160)`);
  }
  if (!c.opcoes.some(o => !o.requer)) erros.push(`${c.id}: nenhuma opção sempre disponível`);
  if (c.opcoes.filter(o => !o.requer).length < 2 && c.tipo !== 'fim') avisos.push(`${c.id}: só uma opção sempre disponível`);
  for (const o of c.opcoes) {
    if (o.rotulo.length > 24) avisos.push(`${c.id}: rótulo "${o.rotulo}" longo (${o.rotulo.length})`);
    if (!ICONES.has(o.icone)) erros.push(`${c.id}: ícone "${o.icone}" não existe`);
    for (const alvo of [o, ...(o.casos || [])]) {
      if (alvo.proxima && !D.CARTAS[alvo.proxima]) erros.push(`${c.id}: proxima "${alvo.proxima}" não existe`);
      if (alvo.morte && !D.MORTES[alvo.morte]) erros.push(`${c.id}: morte "${alvo.morte}" não existe`);
      if (alvo.final && !D.FINAIS[alvo.final]) erros.push(`${c.id}: final "${alvo.final}" não existe`);
    }
    const custo = o.ef || o.rel || o.morte || o.final || o.ouroEvento || o.proxima;
    if (!custo) avisos.push(`${c.id}: "${o.rotulo}" não custa nada`);
  }
}
for (const [id, m] of Object.entries(D.MORTES)) {
  if (!D.QUEM[m.quem]) erros.push(`morte ${id}: personagem "${m.quem}" não existe`);
}

// ── Simulação ──
function rngSemente(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jogadores = Number(process.argv[2] || 2000);
const runsPor = Number(process.argv[3] || 10);

function simular(perfil, semente) {
  const rng = rngSemente(semente);
  const st = {
    runs: 0, cartas: 0, fins: {}, cartasVistas: {}, caveiraMax: [], primeiraRun: { morte: 0, final: 0 },
    companheirosNaSaida: {}, saidasPorRun: [], travou: 0
  };
  for (let j = 0; j < jogadores; j++) {
    const meta = N.novoMeta();
    for (let r = 0; r < runsPor; r++) {
      const est = N.novaRun(meta, rng);
      st.runs++;
      let passos = 0, cavMax = 0;
      while (est.fase === 'carta' || est.fase === 'caravana') {
        if (++passos > 200) { st.travou++; break; }
        if (est.fase === 'caravana') { N.sairCaravana(est, meta, rng); continue; }
        st.cartasVistas[est.cartaId] = (st.cartasVistas[est.cartaId] || 0) + 1;
        cavMax = Math.max(cavMax, N.caveira(est, meta).pct);
        const vis = N.opcoesVisiveis(est, meta);
        if (!vis.length) { erros.push(`Sem opções em ${est.cartaId}`); break; }
        let pos = Math.floor(rng() * vis.length);
        if (perfil === 'atento' && rng() < 0.8) {
          // Vê só o que a tela mostra: as barras e quais eixos cada carta mexe.
          // Evita empurrar uma barra que já está perto do extremo e evita o déjà vu.
          let melhor = Infinity;
          vis.forEach((x, i) => {
            const ef = N.efeitosVisiveis(est, meta, i);
            let nota = rng() * 2;
            for (const [k, d] of Object.entries(ef)) {
              const v = k === 'rep' ? est.rep : est.eixos[k];
              nota += Math.max(0, Math.abs(v + d) - 3) ** 2;
            }
            if (meta.dejavu[est.cartaId + ':' + x.i]) nota += 500;
            if (nota < melhor) { melhor = nota; pos = i; }
          });
        }
        if (perfil === 'sensato' && rng() < 0.8) {
          let melhor = Infinity;
          vis.forEach((x, i) => {
            const pv = N.previsao(est, meta, i);
            const nota = pv.morte ? 1000 : pv.delta + rng() * 6;
            const dv = meta.dejavu[est.cartaId + ':' + x.i] ? 500 : 0;
            if (nota + dv < melhor) { melhor = nota + dv; pos = i; }
          });
        }
        N.escolher(est, meta, pos, rng);
        st.cartas++;
      }
      st.caveiraMax.push(cavMax);
      const chave = est.fase === 'morte' ? '☠ ' + D.MORTES[est.morte].titulo : '★ ' + D.FINAIS[est.final].titulo;
      st.fins[chave] = (st.fins[chave] || 0) + 1;
      if (r === 0) st.primeiraRun[est.fase === 'morte' ? 'morte' : 'final']++;
      if (est.fase === 'final') {
        const n = N.companheiros(est).length;
        st.companheirosNaSaida[n] = (st.companheirosNaSaida[n] || 0) + 1;
      }
    }
  }
  return st;
}

const pct = (n, t) => (100 * n / t).toFixed(1).padStart(5) + '%';
const media = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : 0;

console.log('\n== Validação ==');
if (!erros.length) console.log('Sem erros.');
erros.forEach(e => console.log('ERRO  ' + e));
avisos.forEach(a => console.log('aviso ' + a));

for (const perfil of ['aleatório', 'atento', 'sensato']) {
  const st = simular(perfil, 42);
  const mortes = Object.entries(st.fins).filter(([k]) => k.startsWith('☠')).reduce((s, [, v]) => s + v, 0);
  console.log(`\n== Jogador ${perfil}: ${jogadores} jogadores × ${runsPor} runs ==`);
  console.log(`Morre em ${pct(mortes, st.runs)} das runs · na PRIMEIRA run: ${pct(st.primeiraRun.morte, jogadores)}`);
  console.log(`Cartas por run: ${(st.cartas / st.runs).toFixed(1)} · caveira máxima média: ${media(st.caveiraMax).toFixed(0)}% · runs que passaram de 60%: ${pct(st.caveiraMax.filter(x => x >= 60).length, st.runs)}`);
  const comp = Object.entries(st.companheirosNaSaida).map(([n, v]) => `${n}: ${v}`).join(' · ');
  console.log(`Companheiros na saída (quantos → runs): ${comp}`);
  console.log('Como as runs terminaram:');
  for (const [nome, v] of Object.entries(st.fins).sort((a, b) => b[1] - a[1])) console.log(`  ${pct(v, st.runs)}  ${nome}`);
  const nunca = [...Object.keys(D.MORTES).map(k => '☠ ' + D.MORTES[k].titulo), ...Object.keys(D.FINAIS).map(k => '★ ' + D.FINAIS[k].titulo)].filter(k => !st.fins[k]);
  if (nunca.length) console.log('Nunca aconteceu: ' + nunca.join(', '));
  if (perfil === 'aleatório') {
    const nuncaVista = D.LISTA_CARTAS.filter(c => !st.cartasVistas[c.id]).map(c => c.id);
    if (nuncaVista.length) console.log('Cartas nunca vistas: ' + nuncaVista.join(', '));
  }
  if (st.travou) console.log(`Runs travadas: ${st.travou}`);
}

process.exit(erros.length ? 1 : 0);
