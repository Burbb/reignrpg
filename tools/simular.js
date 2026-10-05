#!/usr/bin/env node
// Valida o conteúdo e joga milhares de runs aleatórias pra medir o equilíbrio.
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
for (const a of D.ARCOS) {
  for (const id of [a.inicio, a.fim, a.fixa && a.fixa.id].filter(Boolean)) {
    if (!D.CARTAS[id]) erros.push(`Arco ${a.n}: carta "${id}" não existe`);
  }
}
for (const c of D.LISTA_CARTAS) {
  if (!D.QUEM[c.quem]) erros.push(`${c.id}: personagem "${c.quem}" não existe`);
  if (c.texto.length > 150) avisos.push(`${c.id}: texto com ${c.texto.length} caracteres (meta: até 150)`);
  if (c.opcoes.length < 3) erros.push(`${c.id}: menos de 3 opções`);
  const semRequisito = c.opcoes.filter(o => !o.requer).length;
  if (semRequisito < 1) erros.push(`${c.id}: nenhuma opção sempre disponível`);
  for (const o of c.opcoes) {
    if (o.rotulo.length > 22) avisos.push(`${c.id}: rótulo "${o.rotulo}" longo (${o.rotulo.length})`);
    if (!ICONES.has(o.icone)) erros.push(`${c.id}: ícone "${o.icone}" não existe`);
    for (const alvo of [o, ...(o.casos || [])]) {
      if (alvo.proxima && !D.CARTAS[alvo.proxima]) erros.push(`${c.id}: proxima "${alvo.proxima}" não existe`);
      if (alvo.morte && !D.MORTES[alvo.morte]) erros.push(`${c.id}: morte "${alvo.morte}" não existe`);
      if (alvo.final && !D.FINAIS[alvo.final]) erros.push(`${c.id}: final "${alvo.final}" não existe`);
    }
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
const runsPor = Number(process.argv[3] || 25);
const rng = rngSemente(42);

const stat = {
  runs: 0, cartas: 0, mortes: {}, finais: {}, chegouArco: { 1: 0, 2: 0, 3: 0 },
  ouroCaravana: [], caveira: [], primeiroVerdadeiro: [], cartasPorTipo: {}, travou: 0
};

for (let j = 0; j < jogadores; j++) {
  const meta = N.novoMeta();
  let achouVerdadeiro = false;
  for (let r = 0; r < runsPor; r++) {
    const est = N.novaRun(meta, rng);
    stat.runs++;
    let passos = 0;
    while (est.fase !== 'morte' && est.fase !== 'final') {
      if (++passos > 200) { stat.travou++; break; }
      stat.chegouArco[est.arco] = (stat.chegouArco[est.arco] || 0) + (est.posArco === 1 && est.fase === 'carta' ? 1 : 0);
      if (est.fase === 'caravana') {
        stat.ouroCaravana.push(est.ouro);
        for (const id of est.caravana) if (rng() < 0.6) N.comprar(est, id);
        N.sairCaravana(est, meta, rng);
        continue;
      }
      stat.caveira.push(N.caveira(est, meta).pct);
      const vis = N.opcoesVisiveis(est, meta);
      if (!vis.length) { erros.push(`Sem opções em ${est.cartaId}`); break; }
      // Jogador "esperto pela metade": evita escolhas que já o mataram (déjà vu) na maioria das vezes.
      let pos = Math.floor(rng() * vis.length);
      const chave = est.cartaId + ':' + vis[pos].i;
      if (meta.dejavu[chave] && rng() < 0.8) pos = (pos + 1) % vis.length;
      N.escolher(est, meta, pos, rng);
      stat.cartas++;
      if (est.fase === 'morte' && N.podeVoltar(est) && rng() < 0.9) N.voltarNoTempo(est);
    }
    if (est.fase === 'morte') stat.mortes[est.morte] = (stat.mortes[est.morte] || 0) + 1;
    if (est.fase === 'final') stat.finais[est.final] = (stat.finais[est.final] || 0) + 1;
    if (est.final === 'verdadeiro' && !achouVerdadeiro) { achouVerdadeiro = true; stat.primeiroVerdadeiro.push(r + 1); }
  }
}

const pct = (n, t) => (100 * n / t).toFixed(1).padStart(5) + '%';
const media = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length) : 0;

console.log('\n== Validação ==');
if (!erros.length) console.log('Sem erros.');
erros.forEach(e => console.log('ERRO  ' + e));
avisos.forEach(a => console.log('aviso ' + a));

console.log(`\n== Simulação: ${jogadores} jogadores × ${runsPor} runs (escolhas aleatórias) ==`);
console.log(`Cartas por run (média): ${(stat.cartas / stat.runs).toFixed(1)}`);
console.log(`Runs que chegaram ao arco II: ${pct(stat.chegouArco[2], stat.runs)} · arco III: ${pct(stat.chegouArco[3], stat.runs)}`);
console.log(`Ouro ao chegar na caravana (média): ${media(stat.ouroCaravana).toFixed(0)}`);
console.log(`Caveira média por carta: ${media(stat.caveira).toFixed(0)}%`);
console.log('\nComo as runs terminaram:');
const fins = [
  ...Object.entries(stat.mortes).map(([k, v]) => ['☠ ' + D.MORTES[k].titulo, v]),
  ...Object.entries(stat.finais).map(([k, v]) => ['★ ' + D.FINAIS[k].titulo, v])
].sort((a, b) => b[1] - a[1]);
for (const [nome, v] of fins) console.log(`  ${pct(v, stat.runs)}  ${nome}`);
const nunca = Object.keys(D.MORTES).filter(k => !stat.mortes[k]).concat(Object.keys(D.FINAIS).filter(k => !stat.finais[k]));
if (nunca.length) console.log('Nunca aconteceu: ' + nunca.join(', '));
console.log(`\nFinal verdadeiro: ${stat.primeiroVerdadeiro.length} de ${jogadores} jogadores; primeira vez na run ${media(stat.primeiroVerdadeiro).toFixed(1)} (média)`);
if (stat.travou) console.log(`Runs travadas: ${stat.travou}`);

process.exit(erros.length ? 1 : 0);
