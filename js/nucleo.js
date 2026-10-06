// Regras do jogo, sem nada de tela. Roda no navegador e no Node (tools/simular.js).
(function (raiz) {
  'use strict';

  const EIXOS = ['coracao', 'palavra', 'passo'];
  const EIXOS_HUD = ['coracao', 'palavra', 'passo', 'rep'];
  const LIMITE = 10;
  const LIMITE_REL = 5;
  const HISTORICO_MAX = 8;
  const VOLTA_AMPULHETA = 5;

  const D = () => raiz.DADOS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const copia = o => JSON.parse(JSON.stringify(o));

  // ── Meta: o que sobrevive entre runs (o "ladrão lembra") ──
  function novoMeta() {
    return { runs: 0, totalMortes: 0, mortes: {}, finais: {}, dejavu: {} };
  }
  const mortesDescobertas = meta => Object.keys(meta.mortes).length;

  // ── Condições ──
  function valor(est, chave) {
    if (chave === 'rep') return est.rep;
    if (chave === 'ouro') return est.ouro;
    return est.eixos[chave];
  }
  function compara(a, op, b) {
    if (op === '<=') return a <= b;
    if (op === '>=') return a >= b;
    if (op === '<') return a < b;
    if (op === '>') return a > b;
    return a === b;
  }
  function cumpre(c, est, meta) {
    if (c.qualquer) return c.qualquer.some(x => cumpre(x, est, meta));
    if (c.flag) return !!est.flags[c.flag];
    if (c.semFlag) return !est.flags[c.semFlag];
    if (c.rel) return compara(est.rel[c.rel] || 0, c.op, c.v);
    if (c.meta) {
      const v = c.meta === 'mortes' ? mortesDescobertas(meta) : (meta[c.meta] || 0);
      return compara(v, c.op, c.v);
    }
    return compara(valor(est, c.eixo), c.op, c.v);
  }
  const cumpreTodas = (lista, est, meta) => !lista || lista.every(c => cumpre(c, est, meta));

  // ── A caveira ──
  // Cada morte com condições tem uma "proximidade" de 0 a 1:
  //  - condições de flag são portas: se não batem, proximidade 0;
  //  - condições numéricas valem 1 se batem e caem linearmente com a distância
  //    (8 pontos de eixo, 4 de relação ou 60 de ouro, até chegar a 0);
  //  - a proximidade é a média das condições numéricas.
  // A caveira mostra a maior proximidade entre as mortes do arco atual, com uma curva
  // (p^1.6) pra que longe pareça calmo e perto suba rápido.
  function proximidade(morte, est, meta) {
    let soma = 0, n = 0;
    for (const c of morte.cond) {
      if (c.eixo || c.rel) {
        const x = c.rel ? (est.rel[c.rel] || 0) : valor(est, c.eixo);
        const faixa = c.rel ? 4 : c.eixo === 'ouro' ? 60 : 8;
        const dist = c.op.startsWith('<') ? x - c.v : c.v - x;
        soma += dist <= 0 ? 1 : Math.max(0, 1 - dist / faixa);
        n++;
      } else if (!cumpre(c, est, meta)) {
        return 0;
      }
    }
    return n ? soma / n : 1;
  }
  function mortesDoArco(est) {
    return Object.entries(D().MORTES).filter(([, m]) => m.cond && m.arcos.includes(est.arco));
  }
  function caveira(est, meta) {
    let melhor = 0, id = null;
    for (const [mid, m] of mortesDoArco(est)) {
      const p = proximidade(m, est, meta);
      if (p > melhor) { melhor = p; id = mid; }
    }
    return { pct: Math.round(100 * Math.pow(melhor, 1.6)), id };
  }

  // ── Run ──
  function novaRun(meta, rng) {
    meta.runs += 1;
    const est = {
      run: meta.runs, arco: 1, posArco: 0, total: 0, fase: 'carta', cartaId: null,
      eixos: { coracao: 0, palavra: 0, passo: 0 }, rep: 0, ouro: 0,
      rel: Object.fromEntries((D().COMPANHEIROS || []).map(c => [c, 0])),
      flags: {}, vistas: {}, fixaFeita: {}, fila: [], alerta: {}, fortuna: {},
      poderes: { falcao: 0, sussurro: 0 }, itens: { capa: 0, ampulheta: 0 }, bolsa: false,
      caravana: null, compras: {}, morte: null, morteNova: false, morteChave: null,
      final: null, finalNovo: false, historico: [], log: []
    };
    sacar(est, meta, rng);
    return est;
  }

  const cartaAtual = est => D().CARTAS[est.cartaId];
  const companheiros = est => (D().COMPANHEIROS || []).filter(c => est.flags['com_' + c]);

  // Texto da carta em batidas: cada batida é { quem, t }.
  // `texto` pode ser uma frase ou uma lista; `extras` acrescentam (ou trocam, com `troca: i`)
  // batidas conforme o que já aconteceu na run.
  function batidas(est, meta) {
    const carta = cartaAtual(est);
    if (!carta) return [];
    const norm = b => (typeof b === 'string' ? { quem: carta.quem, t: b } : { quem: b.quem || carta.quem, t: b.t });
    let base = (meta.runs > 1 && carta.textoLoop) ? carta.textoLoop : carta.texto;
    const lista = (Array.isArray(base) ? base : [base]).map(norm);
    for (const ex of carta.extras || []) {
      if (!cumpreTodas(ex.se, est, meta)) continue;
      const b = norm(ex);
      if (typeof ex.troca === 'number' && lista[ex.troca]) lista[ex.troca] = b;
      else if (ex.antes) lista.unshift(b);
      else lista.push(b);
    }
    return lista;
  }

  function opcoesVisiveis(est, meta) {
    const carta = cartaAtual(est);
    if (!carta) return [];
    return carta.opcoes
      .map((o, i) => ({ o, i }))
      .filter(x => cumpreTodas(x.o.requer, est, meta))
      .slice(0, 3);
  }

  // Etiqueta de uma opção destravada: diz ao jogador por que ela apareceu
  // ("CRUEL", "BRUTO", "CHAVES"). Assim os eixos e as escolhas passadas ficam visíveis.
  function etiqueta(o) {
    for (const c of o.requer || []) {
      if (c.etiqueta) return c.etiqueta;
      if (c.eixo === 'ouro') return c.v + ' OURO';
      if (c.eixo) {
        const info = D().EIXOS_INFO[c.eixo];
        return (c.op.startsWith('>') ? (c.v > 0 ? info.mais : info.menos) : (c.v < 0 ? info.menos : info.mais)).toUpperCase();
      }
      if (c.flag && c.flag.startsWith('com_')) {
        const curto = (D().REL_INFO || {})[c.flag.slice(4)];
        const q = D().QUEM[c.flag.slice(4)];
        if (curto || q) return (curto || q.nome.split(' ').pop()).toUpperCase();
      }
      if (c.flag && D().ITENS_FLAG && D().ITENS_FLAG[c.flag]) return D().ITENS_FLAG[c.flag].toUpperCase();
      if (c.qualquer) {
        const sub = etiqueta({ requer: c.qualquer });
        if (sub) return sub;
      }
    }
    return null;
  }

  function resolver(o, est, meta) {
    if (o.casos) {
      for (const c of o.casos) {
        if (cumpreTodas(c.se, est, meta)) return Object.assign({}, o, c);
      }
    }
    return o;
  }

  function ouroDoEvento(est, r, rng) {
    // Cada saque grande favorece um eixo e um lado sorteados nesta run.
    // Ninguém consegue "jogar pra ganhar 100" desde o começo.
    const id = est.cartaId;
    if (!est.fortuna[id]) {
      est.fortuna[id] = { eixo: EIXOS[Math.floor(rng() * EIXOS.length)], sinal: rng() < 0.5 ? -1 : 1 };
    }
    const f = est.fortuna[id];
    const afinidade = clamp(est.eixos[f.eixo] * f.sinal, 0, LIMITE);
    let g = clamp(r.ouroEvento.base + Math.floor(rng() * 16) + afinidade * 4, 20, 100);
    if (est.bolsa) { g *= 2; est.bolsa = false; }
    return g;
  }

  function aplicar(r, est, rng) {
    const ef = r.ef || {};
    for (const e of EIXOS) if (ef[e]) est.eixos[e] = clamp(est.eixos[e] + ef[e], -LIMITE, LIMITE);
    if (ef.rep) est.rep = clamp(est.rep + ef.rep, -LIMITE, LIMITE);
    if (ef.ouro) est.ouro = Math.max(0, est.ouro + ef.ouro);
    for (const [quem, d] of Object.entries(r.rel || {})) {
      est.rel[quem] = clamp((est.rel[quem] || 0) + d, -LIMITE_REL, LIMITE_REL);
    }
    (r.flags || []).forEach(f => { est.flags[f] = true; });
    (r.tira || []).forEach(f => { delete est.flags[f]; });
    let ganho = ef.ouro > 0 ? ef.ouro : 0;
    if (r.ouroEvento) {
      const g = ouroDoEvento(est, r, rng);
      est.ouro += g;
      ganho += g;
    }
    return ganho;
  }

  function morrer(est, meta, id, chave) {
    est.fase = 'morte';
    est.morte = id;
    est.morteNova = !meta.mortes[id];
    est.morteChave = chave || null;
    meta.mortes[id] = (meta.mortes[id] || 0) + 1;
    meta.totalMortes += 1;
    if (chave) meta.dejavu[chave] = true;
    if (est.log) est.log.push({ tipo: 'morte', id, por: chave ? 'escolha' : 'caveira', arco: est.arco });
  }

  function finalizar(est, meta, id) {
    est.fase = 'final';
    est.final = id;
    est.finalNovo = !meta.finais[id];
    meta.finais[id] = (meta.finais[id] || 0) + 1;
    if (est.log) est.log.push({ tipo: 'final', id, companheiros: companheiros(est) });
  }

  function sortear(est, meta, rng, arcoN) {
    let cands = D().LISTA_CARTAS.filter(c =>
      c.arco === arcoN && !c.tipo && !c.soVia && !est.vistas[c.id] && cumpreTodas(c.requer, est, meta));
    // Cartas "cedo" (os encontros que apresentam o elenco) saem primeiro.
    const cedo = cands.filter(c => c.cedo);
    if (cedo.length) cands = cedo;
    if (!cands.length) return null;
    const total = cands.reduce((s, c) => s + (c.peso || 1), 0);
    let x = rng() * total;
    for (const c of cands) { x -= (c.peso || 1); if (x < 0) return c.id; }
    return cands[cands.length - 1].id;
  }

  function sacar(est, meta, rng, semMorte) {
    est.fase = 'carta';
    if (!semMorte) {
      // Morte iminente: na primeira carta com a condição cumprida a chance é 35%;
      // se continuar cumprida, 70%. Dá uma janela pra fugir dela.
      for (const [id, m] of mortesDoArco(est)) {
        if (proximidade(m, est, meta) >= 1) {
          const chance = est.alerta[id] ? 0.7 : 0.35;
          est.alerta[id] = true;
          if (rng() < chance) { morrer(est, meta, id, null); return; }
        } else {
          delete est.alerta[id];
        }
      }
    }
    const arco = D().ARCOS[est.arco - 1];
    const fixas = arco.fixas || (arco.fixa ? [arco.fixa] : []);
    const fixa = fixas.find(f => !est.fixaFeita[f.id] && est.posArco >= f.pos);
    let id = null;
    if (est.fila.length) id = est.fila.shift();
    else if (est.posArco === 0) id = arco.inicio;
    else if (est.posArco >= arco.tamanho - 1) id = arco.fim;
    else if (fixa) { id = fixa.id; est.fixaFeita[fixa.id] = true; }
    else id = sortear(est, meta, rng, arco.n);
    if (!id) id = arco.fim;
    est.posArco += 1;
    est.vistas[id] = true;
    est.cartaId = id;
  }

  function ofertas(meta, rng) {
    const n = mortesDescobertas(meta);
    const ids = Object.keys(D().ITENS).filter(id => (D().ITENS[id].desbloqueio || 0) <= n);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, 3);
  }

  function escolher(est, meta, pos, rng) {
    if (est.fase !== 'carta') return null;
    const vis = opcoesVisiveis(est, meta);
    const alvo = vis[pos];
    if (!alvo) return null;
    const carta = cartaAtual(est);

    const foto = copia(Object.assign({}, est, { historico: [], log: [] }));
    est.historico.push(foto);
    if (est.historico.length > HISTORICO_MAX) est.historico.shift();

    const cavAntes = caveira(est, meta).pct;
    const r = resolver(alvo.o, est, meta);
    const ganho = aplicar(r, est, rng);
    est.total += 1;
    const cavDepois = caveira(est, meta);
    const entrada = {
      tipo: 'escolha', n: est.total, arco: est.arco, carta: carta.id,
      opcoes: vis.map(x => x.o.rotulo), escolha: alvo.o.rotulo,
      ef: r.ef || {}, rel: r.rel || {}, ganho,
      eixos: Object.assign({}, est.eixos), rep: est.rep, ouro: est.ouro,
      relacoes: Object.assign({}, est.rel), companheiros: companheiros(est),
      caveira: [cavAntes, cavDepois.pct], mortePerto: cavDepois.id,
      eco: r.eco || null, poderes: { falcao: est.poderes.falcao > 0, sussurro: est.poderes.sussurro > 0 }
    };
    if (!est.log) est.log = [];
    est.log.push(entrada);
    if (est.poderes.falcao > 0) est.poderes.falcao -= 1;
    if (est.poderes.sussurro > 0) est.poderes.sussurro -= 1;

    const chave = carta.id + ':' + alvo.i;
    const res = { eco: r.eco || null, ganho, chave, evento: !!r.ouroEvento, entrada };
    if (r.morte) { morrer(est, meta, r.morte, chave); return res; }
    if (r.final) { finalizar(est, meta, r.final); return res; }
    if (r.proxima) est.fila.push(r.proxima);

    if (carta.tipo === 'fim') {
      if (est.arco < D().ARCOS.length) {
        est.arco += 1;
        est.posArco = 0;
        est.alerta = {};
        est.compras = {};
        est.fase = 'caravana';
        est.caravana = ofertas(meta, rng);
      } else {
        finalizar(est, meta, D().FINAL_PADRAO);
      }
      return res;
    }
    sacar(est, meta, rng);
    return res;
  }

  // ── Caravana e poderes ──
  function comprar(est, id) {
    const item = D().ITENS[id];
    if (!item || est.fase !== 'caravana' || est.compras[id] || est.ouro < item.preco) return false;
    est.ouro -= item.preco;
    est.compras[id] = true;
    if (id === 'falcao') est.poderes.falcao += 5;
    else if (id === 'sussurro') est.poderes.sussurro += 5;
    else if (id === 'capa') est.itens.capa += 1;
    else if (id === 'ampulheta') est.itens.ampulheta += 1;
    else if (id === 'agua') est.rep = 0;
    else if (id === 'bolsa') est.bolsa = true;
    if (est.log) est.log.push({ tipo: 'compra', item: id, ouro: est.ouro });
    return true;
  }

  function sairCaravana(est, meta, rng) {
    if (est.fase !== 'caravana') return;
    est.caravana = null;
    sacar(est, meta, rng, true);
  }

  function podeUsarCapa(est) {
    const c = cartaAtual(est);
    return est.fase === 'carta' && est.itens.capa > 0 && c && !c.tipo && !c.soVia;
  }
  function usarCapa(est, meta, rng) {
    if (!podeUsarCapa(est)) return false;
    est.itens.capa -= 1;
    if (est.log) est.log.push({ tipo: 'capa', pulou: est.cartaId });
    est.posArco -= 1;
    sacar(est, meta, rng, true);
    return true;
  }

  function podeVoltar(est) {
    return est.fase === 'morte' && est.itens.ampulheta > 0 && est.historico.length > 0;
  }
  function voltarNoTempo(est) {
    if (!podeVoltar(est)) return false;
    const idx = Math.max(0, est.historico.length - VOLTA_AMPULHETA);
    const alvo = est.historico[idx];
    const restam = est.itens.ampulheta - 1;
    const hist = est.historico.slice(0, idx);
    const log = (est.log || []).concat([{ tipo: 'ampulheta', voltouPara: alvo.cartaId }]);
    for (const k of Object.keys(est)) delete est[k];
    Object.assign(est, copia(alvo));
    est.historico = hist;
    est.log = log;
    est.itens.ampulheta = restam;
    est.alerta = {};
    est.fase = 'carta';
    return true;
  }

  // ── Leituras pra interface ──
  function previsao(est, meta, pos) {
    const alvo = opcoesVisiveis(est, meta)[pos];
    if (!alvo) return null;
    const r = resolver(alvo.o, est, meta);
    if (r.morte) return { morte: true, delta: 100 };
    const antes = caveira(est, meta).pct;
    const sim = copia(Object.assign({}, est, { historico: [], log: [] }));
    aplicar(Object.assign({}, r, { ouroEvento: null }), sim, () => 0.5);
    return { morte: false, delta: caveira(sim, meta).pct - antes };
  }

  function efeitosVisiveis(est, meta, pos) {
    const alvo = opcoesVisiveis(est, meta)[pos];
    if (!alvo) return {};
    const ef = resolver(alvo.o, est, meta).ef || {};
    const out = {};
    for (const k of EIXOS_HUD) if (ef[k]) out[k] = ef[k];
    return out;
  }

  // Presságio: uma pista sobre a morte mais próxima, nunca a resposta.
  function pressagio(est, meta) {
    const cav = caveira(est, meta);
    if (!cav.id || cav.pct < 40) return null;
    const lista = D().MORTES[cav.id].pressagios || [];
    if (!lista.length) return null;
    return lista[(est.total + est.run) % lista.length];
  }

  // Explica por que uma morte aconteceu: as condições e os valores do jogador.
  function motivos(id, est) {
    const m = D().MORTES[id];
    if (!m || !m.cond) return [];
    return m.cond.filter(c => c.eixo || c.rel).map(c => c.rel
      ? { rel: c.rel, valor: est.rel[c.rel] || 0 }
      : { eixo: c.eixo, valor: valor(est, c.eixo), op: c.op, limite: c.v });
  }

  raiz.Nucleo = {
    EIXOS, EIXOS_HUD, novoMeta, mortesDescobertas, novaRun, cartaAtual, companheiros, batidas,
    opcoesVisiveis, etiqueta, escolher, caveira, pressagio, previsao, efeitosVisiveis, comprar,
    sairCaravana, podeUsarCapa, usarCapa, podeVoltar, voltarNoTempo, motivos, resolver,
    cumpreTodas, proximidade
  };
})(typeof window !== 'undefined' ? window : globalThis);
