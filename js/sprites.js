// Sprites provisórios em pixel art (12x12), desenhados em canvas.
// Servem só pra marcar onde vai a arte definitiva: troque por PNGs quando tiver os desenhos.
(function (raiz) {
  'use strict';

  // '.' transparente · k contorno · a cor do personagem (tinta) · w osso · y ouro
  // r sangue · g pele goblin · s pele · e olho · b brilho
  const PALETA = {
    k: '#140f19', w: '#efe6d2', y: '#e3a33b', r: '#c8413f', g: '#7fa36b',
    s: '#d9a77a', e: '#140f19', b: '#f6d58a', c: '#6b4a32', d: '#4a3222'
  };

  const MAPAS = {
    caveira: [
      '....kkkk....',
      '..kkwwwwkk..',
      '.kwwwwwwwwk.',
      '.kwwwwwwwwk.',
      'kwwkkwwkkwwk',
      'kwwkkwwkkwwk',
      'kwwwwkkwwwwk',
      '.kwwwwwwwwk.',
      '..kwkwkwkwk.',
      '..kwwwwwwwk.',
      '...kkkkkkk..',
      '............'
    ],
    moeda: [
      '....kkkk....',
      '..kkyyyykk..',
      '.kyyybbyyyk.',
      '.kyybyyyyyk.',
      'kyyyykkyyyyk',
      'kyyykyykyyyk',
      'kyyykyykyyyk',
      'kyyyykkyyyyk',
      '.kyyyyyyyyk.',
      '.kyyyyyyyyk.',
      '..kkyyyykk..',
      '....kkkk....'
    ],
    cabeca: [
      '....kkkk....',
      '..kkaaaakk..',
      '.kaaaaaaaak.',
      '.kaakkkkaak.',
      'kaaksssskaak',
      'kaakessekaak',
      'kaaksssskaak',
      '.kaaksskaak.',
      '..kaakkaak..',
      '.kaaaaaaaak.',
      'kaaaaaaaaaak',
      'kkkkkkkkkkkk'
    ],
    goblin: [
      '....kkkk....',
      '...kggggk...',
      'kk.kggggk.kk',
      'kgkggggggkgk',
      '.kggyggyggk.',
      '.kggggggggk.',
      '..kgggkgggk.',
      '..kgwkkwgk..',
      '...kggggk...',
      '..kaaaaaak..',
      '.kaaaaaaaak.',
      'kkkkkkkkkkkk'
    ],
    rato: [
      '............',
      '.kk......kk.',
      'kaak....kaak',
      'kabakkkkabak',
      '.kaaaaaaaak.',
      '.karaaaarak.',
      '.kaaaaaaaak.',
      '..kaaaaaak..',
      '...kaaaak...',
      '....kwwk....',
      '.....kk.....',
      '............'
    ],
    chama: [
      '.....kk.....',
      '....krrk....',
      '...krrrk.k..',
      '..krryrrkrk.',
      '..kryyyrrrk.',
      '.krryyyyrrk.',
      '.kryywyyyrk.',
      '.kryywwyyrk.',
      '.krryyyyrrk.',
      '..krrrrrrk..',
      '...kkkkkk...',
      '............'
    ],
    adaga: [
      '..........kk',
      '.........kwk',
      '........kwwk',
      '.......kwwk.',
      '......kwwk..',
      '.....kwwk...',
      '..k.kwwk....',
      '..kkkwk.....',
      '...kyk......',
      '..kykkk.....',
      '.kyk........',
      'kkk.........'
    ],
    bota: [
      '............',
      '...kkkkk....',
      '...kcccck...',
      '...kcccck...',
      '...kcccck...',
      '...kcccck...',
      '...kcccckk..',
      '...kccccccck',
      '...kccccccck',
      '...kddddddk.',
      '...kkkkkkkk.',
      '............'
    ],
    olho: [
      '............',
      '............',
      '............',
      '...kkkkkk...',
      '.kkwwwwwwkk.',
      'kwwwkkkkwwwk',
      'kwwkayyakwwk',
      'kwwwkkkkwwwk',
      '.kkwwwwwwkk.',
      '...kkkkkk...',
      '............',
      '............'
    ],
    balao: [
      '............',
      '..kkkkkkkk..',
      '.kwwwwwwwwk.',
      'kwwwwwwwwwwk',
      'kwwkwwkwwkwk',
      'kwwwwwwwwwwk',
      '.kwwwwwwwwk.',
      '..kkkwkkkk..',
      '....kwk.....',
      '....kk......',
      '............',
      '............'
    ],
    mascara: [
      '............',
      '............',
      '.kkkkkkkkkk.',
      'kaaaaaaaaaak',
      'kakkaaaakkak',
      'kakkaaaakkak',
      'kaaaaaaaaaak',
      '.kaaakkaaak.',
      '..kaaaaaak..',
      '...kkkkkk...',
      '............',
      '............'
    ],
    saco: [
      '....kkkk....',
      '.....kk.....',
      '....kyyk....',
      '...kcccck...',
      '..kcccccck..',
      '.kcccyycccck',
      '.kccycccccck',
      '.kcccyycccck',
      '.kccccccycck',
      '.kcccyyyccck',
      '..kccccccck.',
      '...kkkkkkk..'
    ],
    ampulheta: [
      '.kkkkkkkkkk.',
      '..kwwwwwwk..',
      '..kyyyyyyk..',
      '...kyyyyk...',
      '....kyyk....',
      '.....kk.....',
      '....kwyk....',
      '...kwwywk...',
      '..kwwyyywk..',
      '..kyyyyyyk..',
      '.kkkkkkkkkk.',
      '............'
    ],
    chave: [
      '............',
      '............',
      '............',
      '.kkk........',
      'kyyyk.......',
      'kykykkkkkkkk',
      'kyyyyyyyyyyk',
      'kyyykkkkykyk',
      '.kkk....k.k.',
      '............',
      '............',
      '............'
    ],
    coracao: [
      '............',
      '..kk...kk...',
      '.krrk.krrk..',
      'krrrrkrrrrk.',
      'krwrrrrrrrk.',
      'krrrrrrrrrk.',
      '.krrrrrrrk..',
      '..krrrrrk...',
      '...krrrk....',
      '....krk.....',
      '.....k......',
      '............'
    ]
  };

  function desenhar(canvas, nome, escala, tinta) {
    const mapa = MAPAS[nome] || MAPAS.chama;
    const lado = 12;
    canvas.width = lado * escala;
    canvas.height = lado * escala;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < lado; y++) {
      const linha = (mapa[y] || '').padEnd(lado, '.').slice(0, lado);
      for (let x = 0; x < lado; x++) {
        const ch = linha[x];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = ch === 'a' ? (tinta || '#8a7d96') : (PALETA[ch] || '#ff00ff');
        ctx.fillRect(x * escala, y * escala, escala, escala);
      }
    }
  }

  raiz.Sprites = { desenhar, nomes: Object.keys(MAPAS) };
})(typeof window !== 'undefined' ? window : globalThis);
