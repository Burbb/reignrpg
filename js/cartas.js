// Todo o conteúdo do jogo mora aqui. O motor (nucleo.js) só lê estes dados.
// Pra criar carta nova não precisa mexer em código: copie uma carta e edite.
//
// ── VERSÃO 2 · ARCO I: O FOSSO ──
// Regras de escrita desta versão:
//  1. Toda escolha custa alguma coisa. Não existe opção grátis.
//  2. Os personagens voltam. O que tu fizeste com eles aparece nas cartas seguintes.
//  3. As barras matam nos DOIS extremos (±7), como no Reigns. O meio é que é seguro.
//  4. Pra sair do pátio tu precisas de algo que conquistaste na run.
//
// Eixos (de -10 a +10):
//   coracao  -> Cruel (-) ... Piedoso (+)
//   palavra  -> Traiçoeiro (-) ... Leal (+)
//   passo    -> Ousado (-) ... Cauteloso (+)
//   rep      -> Infame (-) ... Famoso (+)
// Relações (de -5 a +5, escondidas do jogador): rel: { barto, mira, bruto }
//
// Texto de carta: uma frase ou uma lista de batidas. Batida pode ser 'texto' ou { quem, t }.
//   extras: [{ se: [conds], t, quem, troca: i | antes: true }] acrescentam batidas conforme a run.
//
// Condições (`requer`, `se`, `cond` das mortes):
//   { eixo: 'passo', op: '<=', v: -3 }   eixo: coracao, palavra, passo, rep ou ouro
//   { rel: 'mira', op: '<=', v: -3 }   { flag: 'x' }  { semFlag: 'x' }  { qualquer: [...] }
//   { meta: 'mortes', op: '>=', v: 4 }  (mortes descobertas; 'runs' também vale)
//
// Opção: rotulo, icone, ef: { coracao, palavra, passo, rep, ouro }, rel: { mira: -1 },
//   flags: [], tira: [], requer: [] (some se não cumprir; ganha etiqueta tipo [CRUEL]),
//   eco, proxima, morte, final, ouroEvento: { base }, casos: [{ se, ...substitui }]
// Cada carta mostra no máximo 3 opções: as 3 primeiras cujo `requer` é cumprido.
// Por isso as opções especiais vêm primeiro e as genéricas no fim.
(function (raiz) {
  'use strict';

  const QUEM = {
    narrador: { nome: '', sprite: 'chama' },
    barto: { nome: 'Velho Bartô', sprite: 'cabeca', cor: '#8a93a8' },
    mira: { nome: 'Mira Dedos-Leves', sprite: 'cabeca', cor: '#3f9a8c' },
    bruto: { nome: 'Bruto', sprite: 'cabeca', cor: '#8e3b32' },
    odo: { nome: 'Carcereiro Odo', sprite: 'cabeca', cor: '#7a6a3a' },
    varn: { nome: 'Mestre Varn, o carrasco', sprite: 'cabeca', cor: '#2c2733' },
    rato: { nome: 'Rato-Rei', sprite: 'rato', cor: '#7d7480' },
    louco: { nome: 'Prisioneiro Risonho', sprite: 'cabeca', cor: '#5d4f73' },
    guarda: { nome: 'Guarda Ferido', sprite: 'cabeca', cor: '#6d7f92' },
    presos: { nome: 'Os presos', sprite: 'cabeca', cor: '#6b5a4a' },
    ceifadora: { nome: 'A Ceifadora', sprite: 'caveira' },
    gruk: { nome: 'Gruk, o goblin mercador', sprite: 'goblin', cor: '#5a3d6b' }
  };

  const COMPANHEIROS = ['barto', 'mira', 'bruto'];

  // Coisas que tu carregas: aparecem no rodapé e nas etiquetas das opções.
  const ITENS_FLAG = {
    chaves: 'Chaves',
    espada: 'Espada',
    faca: 'Faca',
    mapa_tunel: 'Mapa',
    ferido: 'Ferido',
    vinho: 'Vinho',
    amigo_ratos: 'Amigo dos ratos'
  };

  const ARCOS = [
    {
      n: 1, nome: 'O Fosso', tamanho: 13, inicio: 'despertar', fim: 'patio',
      fixas: [{ pos: 4, id: 'varn_chega' }, { pos: 8, id: 'cofre' }]
    }
  ];

  const CARTAS = [
    // ───────────── ABERTURA ─────────────
    {
      id: 'despertar', arco: 1, tipo: 'inicio', quem: 'narrador',
      texto: [
        'Os sinos da torre não param. Lá fora, Pedravela grita: a Horda Cinzenta passou das muralhas.',
        'Ao nascer do sol seria tua forca. Mas o carcereiro sumiu, e a porta da tua cela range, entreaberta.'
      ],
      textoLoop: [
        'De novo os sinos. De novo a porta entreaberta. A moeda gelada contra a tua coxa.',
        'Tu lembras de morrer. Tu lembras de como. Desta vez, vai ser diferente. Ou não.'
      ],
      opcoes: [
        { rotulo: 'Sair agora', icone: 'bota', ef: { passo: -2 }, eco: 'Tu és o primeiro no corredor. Ninguém te viu. Ninguém vai te ajudar.' },
        { rotulo: 'Acordar o bloco', icone: 'balao', ef: { rep: 2, passo: -1 }, flags: ['bloco_acordado'], eco: 'Cinquenta homens gritam teu nome. Isso vai ser útil. Ou péssimo.' },
        { rotulo: 'Ficar e escutar', icone: 'olho', ef: { passo: 2 }, flags: ['ouviu_varn'], eco: 'Lá embaixo, passos. Pesados. Sem nenhuma pressa.' }
      ]
    },

    // ───────────── O ELENCO (aparece primeiro, em ordem sorteada) ─────────────
    {
      id: 'barto', arco: 1, cedo: true, quem: 'barto',
      texto: [
        'Garoto! Aqui! Quarenta anos eu cavei um túnel com uma colher. Tá pronto.',
        'A perna é que não tá. Me leva junto e eu te mostro onde ele dá. Sozinho, tu nunca acha.'
      ],
      opcoes: [
        { rotulo: 'Levar o velho', icone: 'coracao', ef: { coracao: 2, passo: 2 }, rel: { barto: 2 }, flags: ['com_barto'], eco: 'Ele se apoia no teu ombro. Pesa mais do que parece.' },
        { rotulo: 'Arrancar o mapa', icone: 'adaga', ef: { coracao: -3, rep: -1 }, flags: ['mapa_tunel', 'barto_roubado'], eco: 'Ele te entrega o mapa. E uma praga que tu preferes não ouvir.' },
        { rotulo: 'Prometer voltar', icone: 'mascara', ef: { palavra: -2, passo: -1 }, flags: ['barto_prometido'], eco: '"Tu volta, né, garoto?" Tu já estás no fim do corredor.' }
      ]
    },
    {
      id: 'mira', arco: 1, cedo: true, quem: 'mira',
      texto: [
        'Corvo, querido. Eu tenho um plano e tu tens mãos rápidas. O Odo ainda tá lá embaixo, bêbado, com as chaves no cinto.',
        'Tu distrai, eu pego. A gente divide o portão. Fechado?'
      ],
      opcoes: [
        { rotulo: 'Ler o golpe', icone: 'olho', requer: [{ eixo: 'palavra', op: '<=', v: -3 }], ef: { palavra: -1, passo: 1 }, rel: { mira: 1 }, flags: ['com_mira', 'plano_chaves', 'mira_lida'], eco: '"Tu pega e some, né?" Ela ri. "Tá bom, tá bom. Dessa vez é sério." Ela te respeita. Um pouco.' },
        { rotulo: 'Fechado', icone: 'balao', ef: { palavra: 1, passo: -1 }, rel: { mira: 1 }, flags: ['com_mira', 'plano_chaves'], eco: 'Ela sorri como quem já contou o dinheiro.' },
        { rotulo: 'Eu pego, tu distrai', icone: 'mascara', ef: { palavra: -2 }, rel: { mira: -1 }, flags: ['com_mira', 'eu_pego'], eco: '"Desconfiado. Gosto." Ela não gosta.' },
        { rotulo: 'Trancar ela', icone: 'chave', ef: { coracao: -2, palavra: -2, rep: -1 }, flags: ['mira_trancada'], eco: 'O clique da tranca. O olhar dela. Tu vais lembrar dos dois.' }
      ]
    },
    {
      id: 'bruto', arco: 1, cedo: true, quem: 'bruto',
      texto: [
        { quem: 'narrador', t: 'Na última cela, Bruto arranca a porta das dobradiças. Te olha. Olha a porta. Te olha de novo.' },
        'Ratinho. Tu sabe sair daqui. Eu sei quebrar coisa. E eu quero o Odo. Ele me deve três dentes.'
      ],
      opcoes: [
        { rotulo: 'Vem comigo', icone: 'chave', ef: { coracao: -1, rep: -1 }, rel: { bruto: 2 }, flags: ['com_bruto'], eco: 'O chão treme quando ele anda atrás de ti.' },
        { rotulo: 'Só se deixar o Odo', icone: 'balao', ef: { palavra: 2, coracao: 1 }, rel: { bruto: 1 }, flags: ['com_bruto', 'bruto_promessa'], eco: 'Ele resmunga. Mas vem.' },
        { rotulo: 'Mandar ele pros outros', icone: 'mascara', ef: { palavra: -2, passo: 1 }, flags: ['bruto_enganado'], eco: '"Lá! Eles têm comida!" Bruto vai. Por enquanto.' }
      ]
    },

    // ───────────── FIXA: O CARRASCO ─────────────
    {
      id: 'varn_chega', arco: 1, tipo: 'fixa', quem: 'narrador',
      texto: [
        'O portão de baixo range. Alguém desce a escada sem pressa: capuz negro, machado no ombro.',
        'Mestre Varn, o carrasco. A cidade está caindo, e ele veio trabalhar mesmo assim. Veio por ti. E pela moeda.'
      ],
      extras: [
        { se: [{ flag: 'ouviu_varn' }], troca: 0, t: 'Os passos que tu ouviste chegam ao pé da escada. Capuz negro, machado no ombro.' },
        { se: [{ flag: 'com_barto' }], quem: 'barto', t: '(sussurrando) Esse aí enforcou meu irmão. Nunca correu um dia na vida. Nunca precisou.' }
      ],
      opcoes: [
        { rotulo: 'Segura ele!', icone: 'adaga', requer: [{ flag: 'com_bruto' }], ef: { coracao: -2, passo: -2 }, rel: { bruto: -2 }, flags: ['varn_ferido'], eco: 'Bruto segura o carrasco por três segundos. O machado cobra cada um. Bruto volta sangrando, e calado.' },
        { rotulo: 'Chamar os presos', icone: 'balao', requer: [{ eixo: 'rep', op: '>=', v: 3 }], ef: { rep: 2, passo: -1 }, flags: ['varn_atrasado'], eco: 'Vinte presos cercam a escada. Varn não tem pressa. Mas agora tem trabalho.' },
        { rotulo: 'Se esconder', icone: 'olho', ef: { passo: 2 }, flags: ['varn_perto'], eco: 'Ele passa a um palmo de ti. Cheira a terra molhada. Ele sabe que tu estás aqui.' },
        { rotulo: 'Correr pro alto', icone: 'bota', ef: { passo: -2, rep: 1 }, eco: 'Ele não corre atrás. Ele nunca corre.' },
        { rotulo: 'Mostrar a moeda', icone: 'moeda', ef: { passo: -1, palavra: -1 }, flags: ['varn_viu_moeda'], eco: 'Os olhos dele seguem a moeda como um cão segue um osso. Agora ele não vai parar.' }
      ]
    },

    // ───────────── O MEIO DO FOSSO ─────────────
    {
      id: 'odo', arco: 1, quem: 'odo',
      texto: [
        'Ninguém sai! Ninguém! Eu sou o carcereiro! ...Eu ainda sou o carcereiro, né?',
        { quem: 'narrador', t: 'As chaves balançam no cinto dele. A besta, carregada, treme na outra mão.' }
      ],
      extras: [
        { se: [{ flag: 'plano_chaves' }], quem: 'mira', t: '(piscando pra ti) É agora. Tu distrai, eu pego.' },
        { se: [{ flag: 'com_bruto' }, { semFlag: 'bruto_promessa' }], quem: 'bruto', t: 'Três dentes, Odo. Lembra?' }
      ],
      opcoes: [
        {
          rotulo: 'Distrair o Odo', icone: 'balao', requer: [{ flag: 'plano_chaves', etiqueta: 'MIRA' }], ef: { passo: -1, rep: 1 },
          eco: 'Mira pega as chaves... e some no corredor. Sem ti. Ela não confiava em ti o bastante.',
          tira: ['com_mira'], flags: ['mira_fugiu'],
          casos: [{ se: [{ rel: 'mira', op: '>=', v: 1 }], tira: [], flags: ['chaves'], rel: { mira: 1 }, eco: 'Tu cantas pro Odo. Mal. Mira volta balançando as chaves. "Viu? Sócios."' }]
        },
        { rotulo: 'Pegar as chaves', icone: 'chave', requer: [{ flag: 'eu_pego', etiqueta: 'MIRA' }], ef: { passo: -2, palavra: -1 }, rel: { mira: -1 }, flags: ['chaves'], eco: 'Mira faz a dança. Tu pegas as chaves. Ela vê onde tu as guardas.' },
        { rotulo: 'Soltar o Bruto', icone: 'adaga', requer: [{ flag: 'com_bruto' }, { semFlag: 'bruto_promessa' }], ef: { coracao: -3, rep: -2 }, rel: { bruto: 2 }, flags: ['chaves', 'odo_morto'], eco: 'Bruto cobra os três dentes. Com juros. As chaves são tuas.' },
        { rotulo: 'Dar tua palavra', icone: 'balao', requer: [{ eixo: 'palavra', op: '>=', v: 3 }], ef: { palavra: 1, passo: 1 }, flags: ['chaves', 'odo_amigo'], eco: '"Diz pra minha mulher que eu fiquei até o fim." Ele te entrega as chaves. "Tu tem cara de quem cumpre."' },
        { rotulo: 'Dar o vinho', icone: 'saco', requer: [{ flag: 'vinho' }], ef: { coracao: 1 }, tira: ['vinho'], flags: ['chaves', 'odo_amigo'], eco: 'Odo abraça a garrafa e esquece que as chaves existem. Tu não esqueces.' },
        {
          rotulo: 'Derrubar o Odo', icone: 'adaga', ef: { coracao: -2, passo: -2 }, flags: ['ferido'],
          eco: 'O virote acerta teu ombro antes de tu acertares ele. Sem chaves. Com um buraco.',
          casos: [{ se: [{ eixo: 'passo', op: '<=', v: -3 }], flags: ['chaves'], eco: 'Tu és mais rápido que a besta. Odo cai roncando. As chaves são tuas.' }]
        },
        { rotulo: 'Passar de fininho', icone: 'olho', ef: { passo: 2 }, eco: 'Ele nem te vê. As chaves continuam com ele. A saída continua trancada.' }
      ]
    },
    {
      id: 'barto_cansado', arco: 1, quem: 'narrador', requer: [{ flag: 'com_barto' }], peso: 3,
      texto: [
        'Bartô para no meio da escada, sem fôlego. Lá embaixo, passos de ferro. Sem pressa.',
        { quem: 'barto', t: 'Vai, garoto. Eu te alcanço. ...Tu sabe que eu não alcanço.' }
      ],
      opcoes: [
        { rotulo: 'Carregar ele', icone: 'coracao', ef: { coracao: 2, passo: 2 }, rel: { barto: 2 }, eco: 'Ele pesa. Mas vai rindo no teu ouvido o caminho todo.' },
        { rotulo: 'Pegar o mapa e ir', icone: 'mascara', ef: { palavra: -2, coracao: -2, passo: -1 }, tira: ['com_barto'], flags: ['mapa_tunel', 'barto_abandonado'], eco: '"Tava contando com isso", ele diz, e te entrega o mapa.' },
        { rotulo: 'Deixar ele aqui', icone: 'bota', ef: { coracao: -3, passo: -2 }, tira: ['com_barto'], flags: ['barto_abandonado'], eco: 'Ele não te chama. É pior do que se chamasse.' }
      ]
    },
    {
      id: 'mira_proposta', arco: 1, quem: 'mira', requer: [{ flag: 'com_mira' }, { flag: 'com_barto' }], peso: 3,
      texto: [
        'Escuta. O velho vai nos matar com essa perna. Tu ouviu os passos lá embaixo.',
        'Larga ele. Só nós dois. Mais rápido, mais leve. Ele já viveu o que tinha pra viver.'
      ],
      opcoes: [
        { rotulo: 'E se eu largar tu?', icone: 'adaga', requer: [{ eixo: 'palavra', op: '<=', v: -2 }], ef: { rep: 1, palavra: -1 }, rel: { mira: -2 }, eco: 'Ela ri. Mas tu vês: ela anotou.' },
        { rotulo: 'Ninguém fica', icone: 'balao', ef: { palavra: 2, passo: 1 }, rel: { mira: -1, barto: 1 }, eco: 'Mira revira os olhos. Bartô finge que não ouviu. Ouviu.' },
        { rotulo: 'Tu tens razão', icone: 'mascara', ef: { coracao: -2, palavra: -2, passo: -2 }, rel: { mira: 2 }, tira: ['com_barto'], flags: ['barto_abandonado'], eco: 'Bartô senta na escada. "Vai, garoto." Mira já está andando.' },
        { rotulo: 'Então vai tu', icone: 'bota', ef: { palavra: 1, rep: -1 }, rel: { mira: -2 }, tira: ['com_mira'], flags: ['mira_foi'], eco: '"Tu vai morrer por um velho." Ela some. Talvez ela esteja certa.' }
      ]
    },
    {
      id: 'bruto_odo', arco: 1, quem: 'narrador', requer: [{ flag: 'com_bruto' }, { flag: 'bruto_promessa' }, { semFlag: 'odo_morto' }], peso: 3,
      texto: [
        'Odo dorme encostado na parede, abraçado à besta. Bruto para. Estala os dedos, um por um.',
        { quem: 'bruto', t: 'Só um soco, ratinho. Tu prometeu. Eu não.' }
      ],
      opcoes: [
        { rotulo: 'Deixa ele, Bruto', icone: 'balao', ef: { palavra: 2, coracao: 1 }, rel: { bruto: -2 }, eco: 'Bruto chuta a parede. A parede perde. Ele fica olhando pra tua nuca um tempo.' },
        { rotulo: 'Um soco só', icone: 'adaga', ef: { coracao: -2, palavra: -1 }, rel: { bruto: 2 }, flags: ['chaves'], eco: 'Um soco. Odo vai acordar daqui a dois dias. As chaves são tuas.' },
        { rotulo: 'Pegar as chaves e ir', icone: 'chave', ef: { passo: -2, palavra: -1 }, rel: { bruto: -1 }, flags: ['chaves'], eco: 'Enquanto Bruto discute com a própria raiva, tu pegas o chaveiro.' }
      ]
    },
    {
      id: 'bruto_volta', arco: 1, quem: 'bruto', requer: [{ flag: 'bruto_enganado' }], peso: 3,
      texto: [
        'RATINHO. Não tinha comida nenhuma lá.',
        'Tinha seis guardas. Agora tem seis guardas dormindo. E um ratinho mentiroso na minha frente.'
      ],
      opcoes: [
        {
          rotulo: 'Encarar ele', icone: 'adaga', requer: [{ qualquer: [{ flag: 'espada' }, { flag: 'faca' }], etiqueta: 'LÂMINA' }],
          ef: { coracao: -2, rep: 2 }, tira: ['bruto_enganado'], eco: 'A lâmina faz o gigante pensar duas vezes. Ele recua, cuspindo. "Isso não acabou."'
        },
        { rotulo: 'Pedir desculpa', icone: 'balao', ef: { palavra: 2, rep: -2 }, rel: { bruto: 1 }, tira: ['bruto_enganado'], flags: ['com_bruto'], eco: '"Tu me deve." Ele vem junto. Mas anda atrás de ti, onde tu não vês.' },
        { rotulo: 'Correr', icone: 'bota', ef: { passo: -3 }, eco: 'Ele é grande. Tu és rápido. Por enquanto, isso basta.' },
        { rotulo: 'Encarar de mãos vazias', icone: 'adaga', morte: 'bruto_soco' }
      ]
    },
    {
      id: 'varn_volta', arco: 1, quem: 'narrador', peso: 3,
      requer: [{ qualquer: [{ eixo: 'passo', op: '>=', v: 3 }, { flag: 'varn_perto' }, { flag: 'varn_viu_moeda' }] }],
      texto: [
        'Um machado se crava na porta, a um dedo da tua mão. Mestre Varn puxa a lâmina de volta, devagar.',
        { quem: 'varn', t: 'Devolve a moeda e eu faço rápido. É o melhor que eu ofereço a alguém.' }
      ],
      opcoes: [
        {
          rotulo: 'Deixar alguém pra trás', icone: 'mascara', requer: [{ qualquer: [{ flag: 'com_bruto' }, { flag: 'com_barto' }, { flag: 'com_mira' }], etiqueta: 'ALIADO' }],
          ef: { coracao: -3, palavra: -3, passo: -1 },
          casos: [
            { se: [{ flag: 'com_bruto' }], tira: ['com_bruto'], flags: ['bruto_morto'], eco: 'Tu empurras o Bruto contra o carrasco e corres. Atrás de ti, o machado. Depois, silêncio.' },
            { se: [{ flag: 'com_barto' }], tira: ['com_barto'], flags: ['barto_morto'], eco: 'Bartô solta teu braço. "Vai, garoto." Ele sabia desde a escada.' },
            { se: [{ flag: 'com_mira' }], tira: ['com_mira'], flags: ['mira_presa'], eco: 'Tu dás uma rasteira na Mira e corres. O grito dela te segue por três corredores.' }
          ]
        },
        {
          rotulo: 'Atacar o carrasco', icone: 'adaga', requer: [{ qualquer: [{ flag: 'espada' }, { flag: 'faca' }], etiqueta: 'LÂMINA' }],
          ef: { passo: -3, coracao: -1, rep: 2 }, flags: ['ferido'], morte: 'varn_duelo',
          casos: [{ se: [{ flag: 'varn_ferido' }], morte: null, flags: ['varn_caido'], eco: 'O ombro dele ainda sangra do Bruto. Tu acertas o mesmo lugar. Varn cai de joelhos. Pela primeira vez, ele tem pressa.' }]
        },
        { rotulo: 'Correr', icone: 'bota', ef: { passo: -3 }, eco: 'Ele não corre atrás. Ele nunca corre. Ele sabe pra onde tu vais.' },
        { rotulo: 'Negociar', icone: 'balao', ef: { palavra: 1, passo: 2 }, flags: ['varn_perto'], eco: '"Amanhecer, ladrão. Eu espero no pátio." Ele embainha o machado. Isso é pior.' }
      ]
    },
    {
      id: 'ratos', arco: 1, quem: 'rato',
      texto: [
        { quem: 'narrador', t: 'Um rio de ratos escorre por um ralo aberto no chão do corredor. Eles sabem o caminho.' },
        { quem: 'narrador', t: 'Pra fora... ou pra baixo, onde mora o que até os ratos temem.' }
      ],
      opcoes: [
        { rotulo: 'Seguir os ratos', icone: 'bota', ef: { passo: -2 }, proxima: 'esgoto' },
        { rotulo: 'Dar teu pão', icone: 'coracao', ef: { coracao: 2, passo: 1 }, flags: ['amigo_ratos'], proxima: 'esgoto', eco: 'Teu último pedaço de pão. Os ratos guincham e esperam por ti na boca do ralo. Parece um convite.' },
        { rotulo: 'Pisar no ralo', icone: 'adaga', ef: { coracao: -2, rep: -1 }, eco: 'Os ratos se espalham pelas celas. Os presos gritam. Gritam teu nome.' }
      ]
    },
    {
      id: 'esgoto', arco: 1, soVia: true, quem: 'narrador',
      texto: [
        'O esgoto fede a séculos. Dois túneis. No da esquerda, mil olhinhos vermelhos piscam no escuro.'
      ],
      extras: [
        { se: [{ flag: 'mapa_tunel' }], t: 'O mapa do Bartô tem um X desenhado à direita. Ou é uma mancha de gordura.' },
        { se: [{ flag: 'com_barto' }], quem: 'barto', t: 'Pela direita, garoto. Eu cavei isso. Confia no velho.' }
      ],
      opcoes: [
        {
          rotulo: 'Túnel da esquerda', icone: 'bota', morte: 'rato_rei',
          casos: [{ se: [{ flag: 'amigo_ratos' }], morte: null, ef: { passo: -1 }, flags: ['saida_esgoto'], eco: 'Os ratos abrem caminho. O Rato-Rei te olha e deixa passar. Agora tu sabes onde o esgoto dá.' }]
        },
        {
          rotulo: 'Túnel da direita', icone: 'olho', ef: { passo: 2 }, eco: 'Dá na cozinha do quartel. Um beco sem saída que cheira a sopa.',
          casos: [{ se: [{ qualquer: [{ flag: 'mapa_tunel' }, { flag: 'com_barto' }] }], flags: ['tunel_achado'], ef: { passo: 1 }, eco: 'Uma parede falsa. Atrás dela, o túnel da colher. Quarenta anos de trabalho. Agora é teu.' }]
        },
        { rotulo: 'Voltar pra cima', icone: 'bota', ef: { passo: 2, rep: -1 }, eco: 'Tu sobes coberto de lodo. Os presos que te veem não esquecem o cheiro.' }
      ]
    },
    {
      id: 'fumaca', arco: 1, quem: 'narrador',
      texto: [
        'Alguém botou fogo na palha do bloco leste. A fumaça desce o corredor como água preta.',
        'Lá dentro, presos batem nas grades. Tu ouves cada pancada.'
      ],
      extras: [
        { se: [{ flag: 'com_barto' }], t: 'Bartô tosse. Tosse muito.' }
      ],
      opcoes: [
        { rotulo: 'Abrir as celas', icone: 'coracao', ef: { coracao: 3, rep: 2, passo: 1 }, flags: ['salvou_leste'], eco: 'Doze presos saem tossindo. Eles não vão esquecer teu rosto. Nem tu o deles.' },
        {
          rotulo: 'Atravessar correndo', icone: 'bota', ef: { passo: -2, coracao: -1 }, eco: 'Tu atravessas com os olhos ardendo. As pancadas nas grades param. Todas de uma vez.',
          casos: [{ se: [{ flag: 'com_barto' }], ef: { passo: -2, coracao: -2 }, tira: ['com_barto'], flags: ['barto_morto'], eco: 'Tu atravessas. Bartô não. A fumaça engole a tosse dele.' }]
        },
        { rotulo: 'Rastejar no chão', icone: 'olho', ef: { passo: 2, coracao: -1 }, eco: 'Rente ao chão o ar é limpo. Lento. As pancadas nas grades ficam mais fracas.' }
      ]
    },
    {
      id: 'guarda', arco: 1, quem: 'guarda',
      texto: [
        { quem: 'narrador', t: 'Um guarda ferido, encostado na parede. Jovem demais pra farda. Aperta a barriga com as duas mãos.' },
        'Por favor... minha mãe tá na cidade baixa. Me ajuda a levantar.'
      ],
      extras: [
        { se: [{ flag: 'com_bruto' }], quem: 'bruto', t: 'Guarda bom é guarda deitado, ratinho.' },
        { se: [{ flag: 'com_mira' }], quem: 'mira', t: 'Olha o cinto dele. Tem moeda ali.' }
      ],
      opcoes: [
        { rotulo: 'Usar de refém', icone: 'adaga', requer: [{ eixo: 'coracao', op: '<=', v: -3 }], ef: { coracao: -2, rep: -2 }, flags: ['refem'], eco: 'Tu levantas o garoto. Não pra ajudar. Ele vai ser teu escudo no pátio.' },
        { rotulo: 'Fazer um curativo', icone: 'coracao', ef: { coracao: 2, passo: 2 }, rel: { bruto: -1, mira: -1 }, flags: ['guarda_salvo'], eco: '"Teu nome?" "Corvo." "Vou lembrar, Corvo. Eu tenho a chave da portinhola dos fundos."' },
        { rotulo: 'Pegar a espada', icone: 'adaga', ef: { coracao: -2, rep: -1 }, flags: ['espada'], eco: 'Ele não resiste. Não tem força pra isso. A espada é boa. Tu não te sentes bem.' },
        { rotulo: 'Pegar a bolsa', icone: 'saco', ef: { coracao: -2, ouro: 15 }, rel: { mira: 1 }, eco: 'Quinze moedas. Ele te olha o tempo todo enquanto tu contas.' }
      ]
    },
    {
      id: 'cozinha', arco: 1, quem: 'narrador',
      texto: [
        'A cozinha do quartel. Panelas viradas, pão duro no chão e uma faca de cortar osso cravada na mesa.',
        'Numa prateleira alta, a garrafa de vinho do Odo. Passos no corredor ao lado.'
      ],
      opcoes: [
        { rotulo: 'Arrancar a faca', icone: 'adaga', ef: { passo: -2, rep: -1 }, flags: ['faca'], eco: 'A faca sai da mesa com um rangido alto. Alto demais.' },
        { rotulo: 'Subir pelo vinho', icone: 'saco', ef: { passo: 2 }, flags: ['vinho'], eco: 'Tu escalas a prateleira devagar. A garrafa é tua. O tempo também foi.' },
        {
          rotulo: 'Comer', icone: 'ampulheta', ef: { passo: 3 }, eco: 'Primeira refeição quente em meses. Lá fora, os passos ficaram mais perto.',
          casos: [{ se: [{ flag: 'com_barto' }], ef: { passo: 3, coracao: 1 }, rel: { barto: 1 }, eco: 'Tu divides o pão com Bartô. Ele chora um pouco. Lá fora, os passos ficaram mais perto.' }]
        }
      ]
    },
    {
      id: 'louco', arco: 1, quem: 'louco',
      texto: [
        'Hihihi! Tu tens a moeda DELA! Eu sinto o frio daqui!',
        'Quem rouba a Ceifadora não morre, sabia? Só volta. E volta. E volta. Hihihi!'
      ],
      opcoes: [
        { rotulo: 'O que mais tu sabes?', icone: 'balao', ef: { passo: 2 }, flags: ['lore_conta'], eco: '"Ela anota cada morte tua. Quando a conta fechar, ela vem buscar pessoalmente." Ele para de rir.' },
        { rotulo: 'Soltar o louco', icone: 'chave', ef: { coracao: 1, rep: 2, passo: -1 }, eco: 'Ele sai dançando pelo corredor, gritando teu nome pra prisão inteira. Ótimo.' },
        { rotulo: 'Calar a boca dele', icone: 'adaga', ef: { coracao: -2, passo: 1 }, eco: 'Silêncio. Tu preferias as risadas.' }
      ]
    },
    {
      id: 'motim', arco: 1, quem: 'presos', peso: 2,
      requer: [{ qualquer: [{ flag: 'bloco_acordado' }, { flag: 'salvou_leste' }, { eixo: 'rep', op: '>=', v: 4 }] }],
      texto: [
        { quem: 'narrador', t: 'Os presos soltos encheram o pátio de baixo. Querem sair. Não sabem como. Olham pra ti.' },
        'CORVO! CORVO! CORVO!'
      ],
      opcoes: [
        { rotulo: 'Liderar o motim', icone: 'balao', ef: { rep: 3, passo: -2 }, flags: ['motim'], eco: 'Cem homens esperam tua ordem. Tu nunca tiveste cem de nada.' },
        { rotulo: 'Usar de distração', icone: 'mascara', ef: { palavra: -3, rep: -2, passo: 1 }, flags: ['distracao'], eco: 'Tu mandas eles pro portão principal. O carrasco vai ter muito o que fazer lá.' },
        { rotulo: 'Cada um por si', icone: 'bota', ef: { rep: -3, passo: 1 }, eco: 'O coro vira vaia. A vaia vira ameaça.' }
      ]
    },

    // ───────────── FIXA: O COFRE (ouro) ─────────────
    {
      id: 'cofre', arco: 1, tipo: 'fixa', quem: 'narrador',
      texto: [
        'O gabinete do Odo. Um baú de coisas confiscadas, as tuas incluídas. E o ouro de um ano de subornos.',
        'Na escada, passos de ferro. Tu tens tempo pra uma coisa. Uma.'
      ],
      extras: [
        { se: [{ flag: 'com_mira' }], quem: 'mira', t: 'Metade é minha, querido. Tu sabe disso, né?' }
      ],
      opcoes: [
        { rotulo: 'Dividir com ela', icone: 'moeda', requer: [{ flag: 'com_mira' }], ef: { palavra: 2, passo: 1 }, rel: { mira: 2 }, ouroEvento: { base: 10 }, eco: 'Metade pra cada. Mira conta duas vezes. Depois sorri de verdade.' },
        { rotulo: 'Arrombar com calma', icone: 'chave', ef: { passo: 2 }, ouroEvento: { base: 30 }, eco: 'Tu sais com o ouro. Os passos de ferro chegam ao gabinete um minuto depois.' },
        { rotulo: 'Levar o baú todo', icone: 'saco', ef: { passo: -3, rep: -1 }, rel: { mira: -2 }, ouroEvento: { base: 45 }, eco: 'Pesado. Barulhento. Teu.' },
        { rotulo: 'Só tuas coisas', icone: 'bota', ef: { palavra: 1, passo: -1 }, flags: ['gazuas'], eco: 'Tuas gazuas, teu casaco. Nada mais. O ouro fica pro próximo azarado.' }
      ]
    },

    // ───────────── FIM DO ARCO: O PÁTIO ─────────────
    // Pra sair tu precisas de algo que conquistaste: chaves, um aliado, um caminho.
    {
      id: 'patio', arco: 1, tipo: 'fim', quem: 'narrador',
      texto: [
        'O pátio da prisão. O portão principal, trancado com corrente. O muro, alto e liso.',
        'Atrás de ti, passos de ferro na pedra. Mestre Varn nunca correu. Nunca precisou.'
      ],
      extras: [
        { se: [{ flag: 'varn_caido' }], troca: 1, t: 'Atrás de ti, nenhum passo. Pela primeira vez esta noite, ninguém te segue.' },
        { se: [{ flag: 'com_bruto' }], quem: 'bruto', t: 'Corrente. Hm. Já quebrei coisa pior.' },
        { se: [{ flag: 'com_barto' }], quem: 'barto', t: 'O túnel dá aqui perto, garoto. Atrás da cisterna.' },
        { se: [{ flag: 'com_mira' }], quem: 'mira', t: 'E agora, sócio?' }
      ],
      opcoes: [
        { rotulo: 'Abrir o portão', icone: 'chave', requer: [{ flag: 'chaves' }], final: 'saida_chaves' },
        { rotulo: 'A corrente!', icone: 'adaga', requer: [{ flag: 'com_bruto' }, { rel: 'bruto', op: '>=', v: 0, etiqueta: 'BRUTO' }], final: 'saida_bruto' },
        { rotulo: 'O túnel da colher', icone: 'olho', requer: [{ qualquer: [{ flag: 'com_barto' }, { flag: 'tunel_achado' }, { flag: 'mapa_tunel' }], etiqueta: 'TÚNEL' }], final: 'saida_tunel' },
        { rotulo: 'Pelo esgoto', icone: 'bota', requer: [{ flag: 'saida_esgoto', etiqueta: 'RATOS' }], final: 'saida_esgoto' },
        { rotulo: 'Derrubar o portão', icone: 'balao', requer: [{ flag: 'motim', etiqueta: 'MOTIM' }], final: 'saida_motim' },
        { rotulo: 'A portinhola', icone: 'chave', requer: [{ flag: 'guarda_salvo', etiqueta: 'GUARDA' }], final: 'saida_guarda' },
        { rotulo: 'Atravessar com ele', icone: 'adaga', requer: [{ flag: 'refem', etiqueta: 'REFÉM' }], final: 'saida_refem' },
        {
          rotulo: 'Escalar o muro', icone: 'bota', morte: 'muro',
          casos: [{ se: [{ eixo: 'passo', op: '<=', v: -3 }, { semFlag: 'ferido' }], morte: null, final: 'saida_muro' }]
        },
        { rotulo: 'Esperar o carrasco', icone: 'caveira', morte: 'varn_espera' }
      ]
    }
  ];

  // Mortes com `cond` são as que a caveira mede: quando todas as condições batem,
  // ela pode acontecer a qualquer carta. Mortes sem `cond` vêm direto de uma escolha.
  // `pressagios` aparecem na carta quando essa morte é a mais próxima (caveira ≥ 40%).
  const MORTES = {
    // Extremos das barras
    passo_alto: {
      titulo: 'O Carrasco Não Tem Pressa', quem: 'varn', arcos: [1], cond: [{ eixo: 'passo', op: '>=', v: 7 }],
      texto: 'Tu te escondeste bem. Esperaste bem. Mas Varn também sabe esperar, e tem mais prática. O machado te acha atrás da última porta.',
      pressagios: ['Passos de ferro lá embaixo. Mais perto que antes.', 'Tu estás seguro aqui. É exatamente o que ele quer.', 'Cheiro de terra molhada. Ele está perto.']
    },
    passo_baixo: {
      titulo: 'Virote na Nuca', quem: 'odo', arcos: [1], cond: [{ eixo: 'passo', op: '<=', v: -7 }],
      texto: 'Tu correste rápido demais pelo pátio. Odo, bêbado, ainda acerta um alvo que corre. Às vezes. Hoje foi uma dessas vezes.',
      pressagios: ['Teu coração dispara. Teus pés, mais ainda.', 'Lá no alto, alguém recarrega uma besta.']
    },
    coracao_alto: {
      titulo: 'Bom Demais Pra Esta Cela', quem: 'presos', arcos: [1], cond: [{ eixo: 'coracao', op: '>=', v: 7 }],
      texto: 'Tu voltaste pra abrir mais uma cela. E mais uma. Na décima, o teto do bloco leste cedeu. Doze homens livres. Um ladrão a menos.',
      pressagios: ['Tu ouves cada preso que ainda grita. Todos eles.', 'Teu coração pesa mais que as correntes.']
    },
    coracao_baixo: {
      titulo: 'Ninguém Chora Por Ti', quem: 'presos', arcos: [1], cond: [{ eixo: 'coracao', op: '<=', v: -7 }],
      texto: 'Os presos fizeram as contas: tu pisaste em todo mundo pra subir. Na cisterna, ninguém ouve o grito.',
      pressagios: ['Os presos param de falar quando tu passas.', 'Alguém afiou uma colher. Tu ouviste o som.']
    },
    palavra_alto: {
      titulo: 'Palavra de Ladrão', quem: 'varn', arcos: [1], cond: [{ eixo: 'palavra', op: '>=', v: 7 }],
      texto: 'Tu prometeste a todos. Esperaste por todos. Cumpriste tudo. Mestre Varn também cumpre a palavra dele: ao nascer do sol.',
      pressagios: ['Tu ainda não quebraste nenhuma promessa. Varn conta com isso.', 'Promessas são correntes. As tuas estão ficando curtas.']
    },
    palavra_baixo: {
      titulo: 'Um Ladrão Conhece Outro', quem: 'narrador', arcos: [1], cond: [{ eixo: 'palavra', op: '<=', v: -7 }],
      texto: 'Tu mentiste pra todos. Então todos mentiram de volta. Alguém deixou a porta do carrasco aberta. De propósito.',
      pressagios: ['Ninguém mais te olha nos olhos.', 'Uma porta que estava aberta agora está fechada. Ninguém sabe quem fechou.']
    },
    rep_alto: {
      titulo: 'O Rosto Mais Famoso do Fosso', quem: 'varn', arcos: [1], cond: [{ eixo: 'rep', op: '>=', v: 7 }],
      texto: 'Todo preso grita teu nome. Todo eco da prisão leva teu nome até o carrasco. Ele só precisou seguir a música.',
      pressagios: ['Os presos cantam teu nome. Alto demais.', 'Até os ratos já sabem quem tu és.']
    },
    rep_baixo: {
      titulo: 'O Fosso Decide', quem: 'presos', arcos: [1], cond: [{ eixo: 'rep', op: '<=', v: -7 }],
      texto: 'No pátio, os presos fazem um julgamento rápido. Tu és o réu. A sentença não demora.',
      pressagios: ['Cuspiram no chão onde tu pisaste.', 'Tu ouves teu nome. Seguido de um palavrão. Seguido de um plano.']
    },
    // Fios dos personagens
    mira_trai: {
      titulo: 'Vendido por Mira', quem: 'mira', arcos: [1], cond: [{ flag: 'com_mira' }, { rel: 'mira', op: '<=', v: -3 }],
      texto: 'Mira assobia. Mestre Varn vira a esquina. "Ele tá com a moeda", ela diz, já contando a recompensa. Ela aprendeu contigo.',
      pressagios: ['Mira olha pra tua bolsa mais do que pra ti.', 'Mira some por um instante e volta sem explicar.', 'Mira sorri demais.']
    },
    bruto_furia: {
      titulo: 'O Abraço do Bruto', quem: 'bruto', arcos: [1], cond: [{ flag: 'com_bruto' }, { rel: 'bruto', op: '<=', v: -3 }],
      texto: 'Bruto aguentou tuas ordens até onde deu. Não deu. Ele te abraça. É a última coisa que tu sentes inteiro.',
      pressagios: ['Bruto range os dentes que restam.', 'Bruto estala os dedos. Olhando pra ti.']
    },
    // Escolhas diretas
    rato_rei: { titulo: 'Banquete do Rato-Rei', quem: 'rato', arcos: [1], texto: 'O túnel acaba num salão de ossos roídos. O Rato-Rei te olha com mil olhos. Tu és o jantar.' },
    bruto_soco: { titulo: 'Um Soco Só', quem: 'bruto', arcos: [1], texto: 'Tu encaraste o Bruto de mãos vazias. Foi corajoso. Foi um soco. Foi o fim.' },
    varn_duelo: { titulo: 'Duelo Curto', quem: 'varn', arcos: [1], texto: 'Tu atacaste o carrasco. Ele desviou como quem desvia de uma mosca. O machado não desviou de nada.' },
    muro: { titulo: 'Mãos Lisas', quem: 'varn', arcos: [1], texto: 'O muro é liso e tu não és tão ágil quanto pensavas. A queda é curta. O machado de Varn, mais curto ainda.' },
    varn_espera: { titulo: 'Pontualidade', quem: 'varn', arcos: [1], texto: 'Tu esperaste o carrasco no pátio, como um bom condenado. Ele aprecia isso. Faz rápido.' }
  };

  // Saídas do arco I. A tela de final mostra também quem saiu contigo.
  const FINAIS = {
    saida_chaves: { titulo: 'Pela Porta da Frente', quem: 'narrador', texto: 'A chave gira. A corrente cai. Tu sais pelo portão principal da prisão como se fosse dono dela.' },
    saida_bruto: { titulo: 'Bruto Abre Caminho', quem: 'bruto', texto: 'Bruto segura a corrente com as duas mãos e puxa. O portão desiste antes dele.' },
    saida_tunel: { titulo: 'O Túnel da Colher', quem: 'barto', texto: 'Quarenta anos de colher. Duzentos metros de terra. Tu sais num porão da cidade baixa, cuspindo barro, livre.' },
    saida_esgoto: { titulo: 'Escoltado pelos Ratos', quem: 'rato', texto: 'Mil ratos te guiam pelo escuro até a boca do rio. O Rato-Rei te deixa passar. Dívida paga.' },
    saida_motim: { titulo: 'O Motim', quem: 'presos', texto: 'Cem presos derrubam o portão gritando teu nome. No meio da confusão, ninguém vê o ladrão sair de lado.' },
    saida_guarda: { titulo: 'Um Guarda Agradecido', quem: 'guarda', texto: 'O guarda que tu salvaste abre a portinhola dos fundos. "Corvo, né? Agora estamos quites."' },
    saida_refem: { titulo: 'Uma Faca no Pescoço', quem: 'guarda', texto: 'Tu atravessas o pátio com o guarda de escudo. Ninguém atira. No portão, tu o empurras e somes.' },
    saida_muro: { titulo: 'Por Cima do Muro', quem: 'narrador', texto: 'Tu sobes o muro liso com as unhas e a raiva. Do outro lado, a cidade arde. E tu estás nela.' }
  };
  const FINAL_PADRAO = 'saida_muro';

  // Destino de cada companheiro, pra tela de saída.
  const DESTINOS = {
    barto: { com: 'com_barto', perdas: { barto_morto: 'morreu', barto_abandonado: 'ficou pra trás' }, nunca: ['barto_roubado', 'barto_prometido'] },
    mira: { com: 'com_mira', perdas: { mira_presa: 'ficou pra trás', mira_fugiu: 'fugiu com as chaves', mira_foi: 'foi embora', mira_trancada: 'trancada' } },
    bruto: { com: 'com_bruto', perdas: { bruto_morto: 'morreu', bruto_enganado: 'te procura' } }
  };

  // Caravana do Gruk: volta a aparecer entre os arcos quando o arco II existir.
  const ITENS = {
    falcao: { nome: 'Olho do Falcão', icone: 'olho', preco: 40, desc: 'Por 5 cartas, tu vês quanto cada escolha mexe na caveira.' },
    capa: { nome: 'Capa de Fumaça', icone: 'mascara', preco: 25, desc: 'Some de uma cena: troca a carta atual por outra. Um uso.' },
    agua: { nome: 'Água do Esquecimento', icone: 'balao', preco: 45, desc: 'A cidade esquece teu nome. Tua fama volta a zero.' },
    bolsa: { nome: 'Bolsa do Avarento', icone: 'saco', preco: 20, desc: 'Dobra o ouro do próximo saque grande.' },
    sussurro: { nome: 'Sussurro dos Mortos', icone: 'caveira', preco: 30, desc: 'Por 5 cartas, tu vês pra que lado cada escolha empurra teus eixos.', desbloqueio: 2 },
    ampulheta: { nome: 'Ampulheta Rachada', icone: 'ampulheta', preco: 70, desc: 'Quando morreres, volta 5 cartas no tempo. Um uso.', desbloqueio: 4 }
  };

  const FALAS = {
    gruk: [
      'Psst! Ladrão! Gruk vende, Gruk não pergunta.',
      'Fim do mundo é ótimo pros negócios!',
      'Tudo original. Quase nada roubado. Quase.'
    ],
    grukVolta: 'Tu de novo? Gruk lembra de ti. Gruk lembra de todo mundo que morre muito.',
    ceifadoraPrimeira: 'Tu tens algo meu, ladrão. Enquanto for teu, eu não te levo. Volta pra cela.',
    ceifadora: [
      'Volta pra cela, ladrão.',
      'De novo? Eu tenho a eternidade. E tu?',
      'Mais uma pra minha coleção.',
      'Tu morres melhor a cada vez.',
      'Eu anoto todas. Tu deverias anotar também.'
    ],
    finalLoop: 'Fim do Arco I. A cidade em chamas espera por ti. O Arco II está sendo escrito.'
  };

  const EIXOS_INFO = {
    coracao: { nome: 'Coração', menos: 'Cruel', mais: 'Piedoso' },
    palavra: { nome: 'Palavra', menos: 'Traiçoeiro', mais: 'Leal' },
    passo: { nome: 'Passo', menos: 'Ousado', mais: 'Cauteloso' },
    rep: { nome: 'Fama', menos: 'Infame', mais: 'Famoso' },
    ouro: { nome: 'Ouro', menos: 'pouco', mais: 'muito' }
  };

  const REL_INFO = {
    barto: 'Bartô', mira: 'Mira', bruto: 'Bruto'
  };

  raiz.DADOS = {
    QUEM, COMPANHEIROS, ITENS_FLAG, ARCOS, MORTES, FINAIS, FINAL_PADRAO, DESTINOS, ITENS, FALAS,
    EIXOS_INFO, REL_INFO, PERIGO: 7,
    CARTAS: Object.fromEntries(CARTAS.map(c => [c.id, c])),
    LISTA_CARTAS: CARTAS
  };
})(typeof window !== 'undefined' ? window : globalThis);
