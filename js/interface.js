// Tela do jogo: desenha o estado do núcleo e repassa os toques do jogador.
(function () {
  'use strict';

  const N = window.Nucleo;
  const D = window.DADOS;
  const S = window.Sprites;
  const CHAVE_META = 'moeda-ceifadora:meta:v1';
  const CHAVE_RUN = 'moeda-ceifadora:run:v1';
  const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V'];
  const EIXOS_HUD = ['coracao', 'palavra', 'passo', 'rep'];
  const rng = Math.random;

  const $ = id => document.getElementById(id);
  let meta = carregar(CHAVE_META, null);
  meta = meta ? Object.assign(N.novoMeta(), meta) : N.novoMeta();
  let est = carregar(CHAVE_RUN, null);
  let ocupado = false;
  let ecoTimer = null;

  function carregar(chave, padrao) {
    try { const t = localStorage.getItem(chave); return t ? JSON.parse(t) : padrao; } catch (e) { return padrao; }
  }
  function salvar() {
    try {
      localStorage.setItem(CHAVE_META, JSON.stringify(meta));
      if (est && (est.fase === 'carta' || est.fase === 'caravana')) localStorage.setItem(CHAVE_RUN, JSON.stringify(est));
      else localStorage.removeItem(CHAVE_RUN);
    } catch (e) { /* sem armazenamento: o jogo segue sem salvar */ }
  }

  function desenharQuem(canvas, quemId, escala) {
    const q = D.QUEM[quemId] || D.QUEM.narrador;
    S.desenhar(canvas, q.sprite, escala, q.cor);
  }
  const totalMortes = () => Object.keys(D.MORTES).length;
  const totalFinais = () => Object.keys(D.FINAIS).length;

  // ── HUD ──
  function montarEixos() {
    const box = $('eixos');
    box.innerHTML = '';
    for (const k of EIXOS_HUD) {
      const info = D.EIXOS_INFO[k];
      const el = document.createElement('div');
      el.className = 'eixo';
      el.id = 'eixo-' + k;
      el.style.setProperty('--cor', `var(--eixo-${k})`);
      el.innerHTML = `<div class="eixo-nome"><span>${info.nome.toUpperCase()}</span><b></b></div>
        <div class="trilho"><div class="enchimento"></div></div>`;
      box.appendChild(el);
    }
  }

  function valorEixo(k) { return k === 'rep' ? est.rep : est.eixos[k]; }

  function renderHud(antes) {
    const cav = N.caveira(est, meta);
    const nivel = cav.pct >= 70 ? 'alto' : cav.pct >= 40 ? 'medio' : 'baixo';
    $('caveira').dataset.nivel = nivel;
    $('caveiraPct').textContent = cav.pct + '%';
    document.documentElement.style.setProperty('--perigo', (Math.max(0, cav.pct - 30) / 70).toFixed(2));
    $('ouro').textContent = est.ouro;
    $('btnOssuario').textContent = `OSSUÁRIO ${N.mortesDescobertas(meta)}/${totalMortes()}`;
    for (const k of EIXOS_HUD) {
      const v = valorEixo(k);
      const info = D.EIXOS_INFO[k];
      const el = $('eixo-' + k);
      const fill = el.querySelector('.enchimento');
      const w = Math.abs(v) * 5;
      fill.style.left = (v >= 0 ? 50 : 50 - w) + '%';
      fill.style.width = w + '%';
      el.querySelector('b').textContent = v >= 3 ? info.mais : v <= -3 ? info.menos : '';
      if (antes && antes[k] !== v) {
        el.classList.remove('mexeu');
        void el.offsetWidth;
        el.classList.add('mexeu');
      }
    }
  }

  // ── Carta e ações ──
  function renderCarta(animar) {
    const carta = N.cartaAtual(est);
    const arco = D.ARCOS[est.arco - 1];
    $('arcoNome').textContent = `ARCO ${ROMANOS[arco.n]} · ${arco.nome.toUpperCase()}`;
    $('arcoPos').textContent = `${Math.min(est.posArco, arco.tamanho)}/${arco.tamanho}`;
    desenharQuem($('retrato'), carta.quem, 8);
    $('quem').textContent = (D.QUEM[carta.quem] || {}).nome || '';
    $('texto').textContent = (meta.runs > 1 && carta.textoLoop) ? carta.textoLoop : carta.texto;

    const evento = $('evento');
    if (animar) { evento.classList.remove('entra'); void evento.offsetWidth; evento.classList.add('entra'); }

    const box = $('acoes');
    box.classList.remove('saindo');
    box.innerHTML = '';
    const vis = N.opcoesVisiveis(est, meta);
    vis.forEach((x, pos) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'acao pixel';
      btn.id = 'acao-' + pos;
      const cv = document.createElement('canvas');
      S.desenhar(cv, x.o.icone, 4);
      btn.appendChild(cv);

      const rot = document.createElement('span');
      rot.className = 'rotulo';
      rot.textContent = x.o.rotulo;
      btn.appendChild(rot);

      // Pontinhos: quais eixos essa escolha mexe (tamanho = intensidade).
      // Com o Sussurro dos Mortos, mostram também a direção.
      const ef = N.efeitosVisiveis(est, meta, pos);
      const pips = document.createElement('span');
      pips.className = 'pips' + (est.poderes.sussurro > 0 ? ' sussurro' : '');
      for (const k of EIXOS_HUD) {
        if (!ef[k]) continue;
        const p = document.createElement('span');
        p.className = 'pip' + (Math.abs(ef[k]) >= 3 ? ' grande' : '');
        p.style.setProperty('--cor', `var(--eixo-${k})`);
        if (est.poderes.sussurro > 0) p.textContent = ef[k] > 0 ? '+' : '−';
        pips.appendChild(p);
      }
      btn.appendChild(pips);

      if (est.poderes.falcao > 0) {
        const pv = N.previsao(est, meta, pos);
        const chip = document.createElement('span');
        chip.className = 'falcao';
        if (pv.morte) { chip.textContent = '☠ MORTE'; chip.classList.add('sobe'); }
        else if (pv.delta === 0) chip.textContent = '±0%';
        else { chip.textContent = (pv.delta > 0 ? '+' : '') + pv.delta + '%'; chip.classList.add(pv.delta > 0 ? 'sobe' : 'desce'); }
        btn.appendChild(chip);
      }

      if (meta.dejavu[carta.id + ':' + x.i]) {
        const dv = document.createElement('span');
        dv.className = 'dejavu';
        dv.title = 'Déjà vu: essa escolha já te matou';
        const cc = document.createElement('canvas');
        S.desenhar(cc, 'caveira', 1);
        dv.appendChild(cc);
        dv.appendChild(document.createTextNode('DÉJÀ VU'));
        btn.appendChild(dv);
      } else {
        const t = document.createElement('span');
        t.className = 'tecla';
        t.textContent = pos + 1;
        btn.appendChild(t);
      }

      btn.setAttribute('aria-label', x.o.rotulo);
      btn.addEventListener('click', () => escolher(pos));
      box.appendChild(btn);
    });
  }

  function renderRodape() {
    const box = $('rodape');
    box.innerHTML = '';
    const chip = (txt, icone) => {
      const el = document.createElement('span');
      el.className = 'chip pixel';
      if (icone) { const c = document.createElement('canvas'); S.desenhar(c, icone, 1); el.appendChild(c); }
      el.appendChild(document.createTextNode(txt));
      box.appendChild(el);
    };
    if (est.poderes.falcao > 0) chip(`OLHO DO FALCÃO · ${est.poderes.falcao}`, 'olho');
    if (est.poderes.sussurro > 0) chip(`SUSSURRO · ${est.poderes.sussurro}`, 'caveira');
    if (est.bolsa) chip('BOLSA DO AVARENTO PRONTA', 'saco');
    if (est.itens.ampulheta > 0) chip(`AMPULHETA ×${est.itens.ampulheta}`, 'ampulheta');
    if (est.itens.capa > 0) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip pixel';
      b.id = 'btnCapa';
      const c = document.createElement('canvas'); S.desenhar(c, 'mascara', 1); b.appendChild(c);
      b.appendChild(document.createTextNode(`USAR CAPA DE FUMAÇA ×${est.itens.capa}`));
      b.disabled = !N.podeUsarCapa(est);
      if (b.disabled) b.title = 'Não dá pra fugir desta cena';
      b.addEventListener('click', () => {
        if (N.usarCapa(est, meta, rng)) { mostrarEco('Uma nuvem de fumaça. Tu já estás em outro lugar.'); salvar(); render(true); }
      });
      box.appendChild(b);
    }
  }

  function mostrarEco(texto, ganho) {
    const el = $('eco');
    el.innerHTML = '';
    if (texto) el.appendChild(document.createTextNode(texto));
    if (ganho) {
      const g = document.createElement('span');
      g.className = 'ganho';
      g.textContent = `+${ganho} DE OURO`;
      el.appendChild(g);
    }
    el.hidden = false;
    clearTimeout(ecoTimer);
    ecoTimer = setTimeout(() => { el.hidden = true; }, texto && texto.length > 60 ? 3600 : 2600);
  }

  function escolher(pos) {
    if (ocupado || !est || est.fase !== 'carta') return;
    const btn = $('acao-' + pos);
    if (!btn) return;
    ocupado = true;
    const antes = {};
    for (const k of EIXOS_HUD) antes[k] = valorEixo(k);
    $('acoes').classList.add('saindo');
    btn.classList.add('escolhida');
    setTimeout(() => {
      const res = N.escolher(est, meta, pos, rng);
      ocupado = false;
      if (!res) return render();
      salvar();
      if (res.eco || (res.evento && res.ganho)) mostrarEco(res.eco, res.evento ? res.ganho : 0);
      else if (res.ganho) mostrarEco(null, res.ganho);
      render(true, antes);
    }, 200);
  }

  // ── Telas ──
  const TELAS = ['telaTitulo', 'telaMorte', 'telaFinal', 'telaCaravana', 'telaOssuario'];
  function mostrarTela(id) {
    for (const t of TELAS) $(t).hidden = t !== id;
    if (id) {
      const foco = $(id).querySelector('.btn.principal:not([hidden]), .btn:not([hidden])');
      if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 30);
    }
  }

  function renderMorte() {
    const m = D.MORTES[est.morte];
    $('morteSelo').textContent = est.morteNova ? 'NOVA MORTE DESCOBERTA' : 'MORTE CONHECIDA';
    desenharQuem($('morteRetrato'), m.quem, 8);
    $('morteTitulo').textContent = m.titulo;
    $('morteTexto').textContent = m.texto;

    const box = $('morteMotivos');
    box.innerHTML = '';
    for (const mot of N.motivos(est.morte, est)) {
      const info = D.EIXOS_INFO[mot.eixo];
      const el = document.createElement('span');
      el.className = 'motivo';
      el.style.setProperty('--cor', mot.eixo === 'ouro' ? 'var(--tocha)' : `var(--eixo-${mot.eixo})`);
      const lado = mot.eixo === 'ouro' ? '' : ` (${mot.valor < 0 ? info.menos : info.mais})`.toUpperCase();
      el.textContent = `${info.nome.toUpperCase()} ${mot.valor > 0 ? '+' : ''}${mot.valor}${lado}`;
      box.appendChild(el);
    }
    if (est.morteChave) {
      const el = document.createElement('span');
      el.className = 'motivo';
      el.style.setProperty('--cor', 'var(--sangue)');
      el.textContent = 'DÉJÀ VU: TU VAIS LEMBRAR DESSA ESCOLHA';
      box.appendChild(el);
    }
    const falas = D.FALAS.ceifadora;
    $('morteFala').textContent = '— ' + (meta.totalMortes === 1 ? D.FALAS.ceifadoraPrimeira : falas[Math.floor(rng() * falas.length)]);
    $('morteInfo').textContent = `Morte nº ${meta.totalMortes} · ${est.total} cartas · Ossuário ${N.mortesDescobertas(meta)}/${totalMortes()}`;
    $('btnVoltarTempo').hidden = !N.podeVoltar(est);
    $('btnCopiarMorte').textContent = 'COPIAR MINHA MORTE';
    mostrarTela('telaMorte');
  }

  function renderFinal() {
    const f = D.FINAIS[est.final];
    $('finalSelo').textContent = est.finalNovo ? 'NOVO FINAL' : 'FINAL CONHECIDO';
    desenharQuem($('finalRetrato'), f.quem, 8);
    $('finalTitulo').textContent = f.titulo;
    $('finalTexto').textContent = f.texto;
    $('finalFala').textContent = est.final === 'verdadeiro' ? 'Fim. De verdade, desta vez.' : D.FALAS.finalLoop;
    const achados = Object.keys(meta.finais).length;
    $('finalInfo').textContent = `Run ${est.run} · ${est.total} cartas · Finais ${achados}/${totalFinais()}`;
    $('btnCopiarFinal').textContent = 'COPIAR MEU FINAL';
    mostrarTela('telaFinal');
  }

  function renderCaravana() {
    desenharQuem($('grukRetrato'), 'gruk', 8);
    const falas = D.FALAS.gruk;
    if (!est.grukFala) est.grukFala = (meta.runs > 2 && rng() < 0.4) ? D.FALAS.grukVolta : falas[Math.floor(rng() * falas.length)];
    $('grukFala').textContent = '"' + est.grukFala + '"';
    $('caravanaOuro').textContent = est.ouro;
    const box = $('itens');
    box.innerHTML = '';
    for (const id of est.caravana || []) {
      const it = D.ITENS[id];
      const el = document.createElement('div');
      el.className = 'item pixel';
      const cv = document.createElement('canvas');
      S.desenhar(cv, it.icone, 3);
      el.appendChild(cv);
      const txt = document.createElement('div');
      txt.innerHTML = '<h3></h3><p></p>';
      txt.querySelector('h3').textContent = it.nome;
      txt.querySelector('p').textContent = it.desc;
      el.appendChild(txt);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn pixel';
      b.id = 'comprar-' + id;
      const comprado = !!est.compras[id];
      b.textContent = comprado ? 'COMPRADO' : `${it.preco} OURO`;
      b.disabled = comprado || est.ouro < it.preco;
      b.addEventListener('click', () => {
        if (N.comprar(est, id)) { salvar(); renderCaravana(); }
      });
      el.appendChild(b);
      box.appendChild(el);
    }
    mostrarTela('telaCaravana');
  }

  function renderOssuario() {
    const n = N.mortesDescobertas(meta);
    $('ossuarioResumo').textContent = `${n}/${totalMortes()} mortes · ${Object.keys(meta.finais).length}/${totalFinais()} finais · ${meta.totalMortes} vezes morto · ${meta.runs} runs`;
    const lm = $('listaMortes');
    lm.innerHTML = '';
    for (const [id, m] of Object.entries(D.MORTES)) {
      const achou = !!meta.mortes[id];
      lm.appendChild(itemOsso(achou, achou ? m.quem : null, achou ? m.titulo : '???',
        `ARCO ${m.arcos.map(a => ROMANOS[a]).join('/')}${achou ? ' · ×' + meta.mortes[id] : ''}`));
    }
    const lf = $('listaFinais');
    lf.innerHTML = '';
    for (const [id, f] of Object.entries(D.FINAIS)) {
      const achou = !!meta.finais[id];
      lf.appendChild(itemOsso(achou, achou ? f.quem : null, achou ? f.titulo : '???', achou ? `×${meta.finais[id]}` : 'NÃO DESCOBERTO'));
    }
    mostrarTela('telaOssuario');
  }
  function itemOsso(achou, quem, titulo, sub) {
    const el = document.createElement('div');
    el.className = 'osso pixel' + (achou ? '' : ' oculto');
    const cv = document.createElement('canvas');
    if (quem) desenharQuem(cv, quem, 3); else S.desenhar(cv, 'caveira', 3);
    el.appendChild(cv);
    const d = document.createElement('div');
    d.innerHTML = '<strong></strong><span></span>';
    d.querySelector('strong').textContent = titulo;
    d.querySelector('span').textContent = sub;
    el.appendChild(d);
    return el;
  }

  function renderTitulo() {
    S.desenhar($('tituloIcone'), 'caveira', 8);
    const emCurso = est && (est.fase === 'carta' || est.fase === 'caravana');
    $('btnComecar').textContent = emCurso ? 'CONTINUAR A FUGA' : 'FUGIR DA CELA';
    $('tituloMeta').textContent = meta.runs
      ? `${meta.totalMortes} mortes · Ossuário ${N.mortesDescobertas(meta)}/${totalMortes()}`
      : 'Protótipo · arte provisória';
    mostrarTela('telaTitulo');
  }

  let telaOrigem = null;
  function abrirOssuario() {
    telaOrigem = TELAS.find(t => !$(t).hidden) || null;
    renderOssuario();
  }
  function fecharOssuario() {
    if (telaOrigem && telaOrigem !== 'telaOssuario') mostrarTela(telaOrigem);
    else mostrarTela(null);
  }

  // ── Render geral ──
  function render(animar, antes) {
    if (!est) return renderTitulo();
    renderHud(antes);
    if (est.fase === 'carta') {
      renderCarta(animar);
      renderRodape();
      mostrarTela(null);
    } else if (est.fase === 'caravana') {
      renderRodape();
      renderCaravana();
    } else if (est.fase === 'morte') {
      renderMorte();
    } else if (est.fase === 'final') {
      renderFinal();
    }
  }

  function novaRun() {
    clearTimeout(ecoTimer);
    $('eco').hidden = true;
    est = N.novaRun(meta, rng);
    salvar();
    render(true);
  }

  async function copiar(texto, botao) {
    try {
      await navigator.clipboard.writeText(texto);
      botao.textContent = 'COPIADO!';
    } catch (e) {
      botao.textContent = 'SELECIONA E COPIA ABAIXO';
      mostrarEco(texto);
    }
  }

  // ── Eventos ──
  $('btnComecar').addEventListener('click', () => {
    if (est && (est.fase === 'carta' || est.fase === 'caravana')) render(true);
    else novaRun();
  });
  $('btnTituloOssuario').addEventListener('click', abrirOssuario);
  $('btnOssuario').addEventListener('click', abrirOssuario);
  $('btnFecharOssuario').addEventListener('click', fecharOssuario);
  $('btnRenascer').addEventListener('click', novaRun);
  $('btnDeNovo').addEventListener('click', novaRun);
  $('btnVoltarTempo').addEventListener('click', () => {
    if (N.voltarNoTempo(est)) { salvar(); mostrarEco('A areia sobe. O tempo volta. Tu lembras do que vem.'); render(true); }
  });
  $('btnSeguir').addEventListener('click', () => { N.sairCaravana(est, meta, rng); est.grukFala = null; salvar(); render(true); });
  $('btnCopiarMorte').addEventListener('click', e => {
    const m = D.MORTES[est.morte];
    copiar(`☠ Morri pela ${meta.totalMortes}ª vez em A Moeda da Ceifadora: "${m.titulo}" na carta ${est.total}. Ossuário ${N.mortesDescobertas(meta)}/${totalMortes()}.`, e.currentTarget);
  });
  $('btnCopiarFinal').addEventListener('click', e => {
    const f = D.FINAIS[est.final];
    copiar(`★ Escapei em A Moeda da Ceifadora: "${f.titulo}" depois de ${meta.totalMortes} mortes. Finais ${Object.keys(meta.finais).length}/${totalFinais()}.`, e.currentTarget);
  });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const aberta = TELAS.some(t => !$(t).hidden);
    if (!aberta && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); escolher(Number(e.key) - 1); }
    if (e.key === 'Escape' && !$('telaOssuario').hidden) fecharOssuario();
  });

  // ── Início ──
  S.desenhar($('caveiraIcone'), 'caveira', 3);
  S.desenhar($('ouroIcone'), 'moeda', 2);
  S.desenhar($('caravanaOuroIcone'), 'moeda', 2);
  montarEixos();

  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => ({ est, meta }));
  function iniciar(dados) {
    if (dados && dados.est) { est = dados.est; if (dados.meta) meta = dados.meta; }
    if (est) renderHud();
    renderTitulo();
  }
  if (hot && hot.ready) hot.ready(iniciar);
  else iniciar(hot && hot.data ? hot.data : {});
})();
