// Todo o conteúdo do jogo mora aqui. O motor (nucleo.js) só lê estes dados.
// Pra criar carta nova não precisa mexer em código: copie uma carta e edite.
//
// Eixos (de -10 a +10):
//   coracao  -> Cruel (-) ... Piedoso (+)
//   palavra  -> Traiçoeiro (-) ... Leal (+)
//   passo    -> Ousado (-) ... Cauteloso (+)
//   rep      -> Infame (-) ... Famoso (+)
//
// Condições usadas em `requer`, `se` e nas mortes:
//   { eixo: 'passo', op: '<=', v: -3 }   eixo pode ser coracao, palavra, passo, rep ou ouro
//   { flag: 'x' }  { semFlag: 'x' }  { qualquer: [cond, cond] }
//   { meta: 'mortes', op: '>=', v: 4 }  (mortes descobertas no Ossuário; 'runs' também vale)
//
// Opção de ação:
//   rotulo, icone, ef: { coracao, palavra, passo, rep, ouro }, flags: [], tira: [],
//   requer: [] (some se não cumprir), eco: 'texto curto depois da escolha',
//   proxima: 'id' (força a próxima carta), morte: 'id', final: 'id',
//   ouroEvento: { base } (saque grande, com sorte e afinidade aleatórias por run),
//   casos: [{ se: [conds], ...campos que substituem os da opção }]
// Cada carta mostra no máximo 3 opções: as primeiras 3 cujo `requer` é cumprido.
(function (raiz) {
  'use strict';

  const QUEM = {
    narrador: { nome: '', sprite: 'chama' },
    barto: { nome: 'Velho Bartô', sprite: 'cabeca', cor: '#8a93a8' },
    mira: { nome: 'Mira Dedos-Leves', sprite: 'cabeca', cor: '#3f9a8c' },
    bruto: { nome: 'Bruto', sprite: 'cabeca', cor: '#8e3b32' },
    odo: { nome: 'Carcereiro Odo', sprite: 'cabeca', cor: '#7a6a3a' },
    rato: { nome: 'Rato-Rei', sprite: 'rato', cor: '#7d7480' },
    louco: { nome: 'Prisioneiro Risonho', sprite: 'cabeca', cor: '#5d4f73' },
    guarda: { nome: 'Guarda Ferido', sprite: 'cabeca', cor: '#6d7f92' },
    menina: { nome: 'Filha do Padeiro', sprite: 'cabeca', cor: '#c9935a' },
    horda: { nome: 'Batedor da Horda', sprite: 'cabeca', cor: '#566b4a' },
    chefe: { nome: 'Chefe da Horda', sprite: 'cabeca', cor: '#3e4a37' },
    sete: { nome: 'Madame Sete', sprite: 'cabeca', cor: '#7b3f7a' },
    capitao: { nome: 'Capitão do Porto', sprite: 'cabeca', cor: '#2f5a7a' },
    guardiao: { nome: 'Guardião do Ossuário', sprite: 'cabeca', cor: '#bfb59e' },
    ceifadora: { nome: 'A Ceifadora', sprite: 'caveira' },
    gruk: { nome: 'Gruk, o goblin mercador', sprite: 'goblin', cor: '#5a3d6b' }
  };

  const ARCOS = [
    { n: 1, nome: 'A Prisão', tamanho: 9, inicio: 'despertar', fim: 'portao_prisao', fixa: { pos: 4, id: 'cofre_odo' } },
    { n: 2, nome: 'A Cidade em Chamas', tamanho: 9, inicio: 'cidade_arde', fim: 'muralha', fixa: { pos: 4, id: 'joalheria' } },
    { n: 3, nome: 'O Amanhecer', tamanho: 6, inicio: 'ultima_noite', fim: 'amanhecer', fixa: null }
  ];

  const CARTAS = [
    // ───────────── ARCO I · A PRISÃO ─────────────
    {
      id: 'despertar', arco: 1, tipo: 'inicio', quem: 'narrador',
      texto: 'Sinos. Fumaça. Gritos lá fora: a cidade foi invadida. Amanhã era tua forca, mas a porta da cela está aberta.',
      textoLoop: 'De novo: sinos, fumaça, a porta aberta. A moeda gelada no teu bolso. Tu lembras de ter morrido.',
      opcoes: [
        { rotulo: 'Sair correndo', icone: 'bota', ef: { passo: -2 } },
        { rotulo: 'Espiar o corredor', icone: 'olho', ef: { passo: 2 } },
        { rotulo: 'Chamar o Bartô', icone: 'balao', ef: { palavra: 1 }, flags: ['barto_junto'], eco: 'O velho levanta rindo. "Sabia que tu voltava, garoto."' }
      ]
    },
    {
      id: 'bruto_cela', arco: 1, quem: 'bruto',
      texto: 'Ei, ratinho! Abre essa tranca. Eu esmago qualquer um que entrar no nosso caminho.',
      opcoes: [
        { rotulo: 'Soltar o Bruto', icone: 'chave', ef: { palavra: 1, coracao: 1 }, flags: ['bruto_junto'], eco: 'Bruto estala os dedos. Todos eles.' },
        { rotulo: 'Prometer e sumir', icone: 'mascara', ef: { palavra: -3, rep: -1 }, flags: ['bruto_traido'], eco: '"Já volto!" Tu não voltas.' },
        { rotulo: 'Fingir que não ouviu', icone: 'olho', ef: { passo: 1 } }
      ]
    },
    {
      id: 'odo_bebado', arco: 1, quem: 'odo',
      texto: 'Ninguém sai! Ninguém! ...a não ser que alguém tenha umas moedas pro velho Odo.',
      opcoes: [
        { rotulo: 'Dar o vinho', icone: 'saco', requer: [{ flag: 'vinho' }], ef: { coracao: 1, palavra: 1 }, flags: ['odo_caido'], tira: ['vinho'], eco: 'Odo abraça a garrafa e esquece que tu existes.' },
        { rotulo: 'Prometer ouro', icone: 'mascara', ef: { palavra: -2 }, flags: ['odo_enganado'], eco: '"Tô contando, hein!" Ele te deixa passar.' },
        { rotulo: 'Derrubar o Odo', icone: 'adaga', ef: { coracao: -2, passo: -1, ouro: 10 }, flags: ['odo_caido'], eco: 'Ele cai roncando. O bolso dele tinha 10 moedas.' },
        { rotulo: 'Passar de fininho', icone: 'olho', ef: { passo: 2 } }
      ]
    },
    {
      id: 'mira_cela', arco: 1, quem: 'mira',
      texto: 'Corvo! Eu sei onde o Odo guardou tuas gazuas. Me tira daqui e eu te mostro.',
      opcoes: [
        { rotulo: 'Libertar a Mira', icone: 'chave', ef: { palavra: 1, ouro: 5 }, flags: ['mira_junto'], eco: 'A tranca dela já estava meio aberta. Claro que estava.' },
        { rotulo: 'Arrancar a info', icone: 'adaga', ef: { coracao: -2, rep: -1 }, flags: ['mira_odio'], eco: 'Ela fala. E jura que vai lembrar disso.' },
        { rotulo: 'Deixar pra trás', icone: 'bota', ef: { coracao: -1, passo: 1 } }
      ]
    },
    {
      id: 'ratos', arco: 1, quem: 'rato',
      texto: 'Squiiik. Um rio de ratos foge por um ralo aberto. Eles sabem o caminho. Pra fora... ou pra baixo.',
      opcoes: [
        { rotulo: 'Seguir os ratos', icone: 'bota', ef: { passo: -1 }, proxima: 'esgoto' },
        { rotulo: 'Chutar os ratos', icone: 'adaga', ef: { coracao: -1 } },
        { rotulo: 'Jogar migalhas', icone: 'coracao', ef: { coracao: 1 }, flags: ['amigo_ratos'], eco: 'Os ratos guincham. Parece um obrigado.' }
      ]
    },
    {
      id: 'esgoto', arco: 1, soVia: true, quem: 'narrador',
      texto: 'O esgoto fede a séculos. Dois túneis. No escuro da esquerda, mil olhinhos vermelhos piscam.',
      opcoes: [
        {
          rotulo: 'Túnel da esquerda', icone: 'bota', morte: 'rato_rei',
          casos: [{ se: [{ flag: 'amigo_ratos' }], morte: null, ef: { passo: 1, ouro: 15 }, eco: 'Os ratos te levam até moedas perdidas. Amigos estranhos.' }]
        },
        { rotulo: 'Túnel da direita', icone: 'olho', ef: { passo: 1 }, eco: 'Dá na cozinha do quartel. Vazia. Sorte.' },
        { rotulo: 'Voltar pra cima', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'fumaca_corredor', arco: 1, quem: 'narrador',
      texto: 'Fumaça preta engole o corredor. Teus olhos ardem. A saída está do outro lado. Em algum lugar.',
      opcoes: [
        { rotulo: 'Correr no escuro', icone: 'bota', ef: { passo: -2 } },
        { rotulo: 'Rastejar no chão', icone: 'olho', ef: { passo: 2 }, eco: 'Rente ao chão o ar é limpo. Truque antigo.' },
        { rotulo: 'Esperar baixar', icone: 'ampulheta', morte: 'fumaca' }
      ]
    },
    {
      id: 'barto_tunel', arco: 1, quem: 'barto', requer: [{ flag: 'barto_junto' }], peso: 2,
      texto: 'Quarenta anos cavando com uma colher, garoto. O túnel tá pronto. Mas só cabe um de cada vez.',
      opcoes: [
        { rotulo: 'Ele vai primeiro', icone: 'coracao', ef: { coracao: 2, palavra: 1, rep: 1 }, eco: 'Ele some no buraco e grita: "Tá limpo!"' },
        { rotulo: 'Empurrar e ir antes', icone: 'adaga', ef: { coracao: -3, palavra: -3, rep: -1 }, tira: ['barto_junto'], flags: ['barto_traido'], eco: 'Tu ouves ele xingando lá atrás. Por muito tempo.' },
        { rotulo: 'Achar outra saída', icone: 'olho', ef: { passo: 1, palavra: -1 } }
      ]
    },
    {
      id: 'barto_grita', arco: 1, quem: 'barto', requer: [{ semFlag: 'barto_junto' }, { semFlag: 'barto_traido' }],
      texto: 'Garoto! A chave tá no cinto do Odo. Me tira daqui e eu te mostro o túnel que cavei em 40 anos.',
      opcoes: [
        { rotulo: 'Voltar pelo velho', icone: 'chave', ef: { palavra: 2 }, flags: ['barto_junto'] },
        { rotulo: 'Boa sorte, velho', icone: 'bota', ef: { coracao: -1, passo: 1 } },
        { rotulo: 'Mentir que volta', icone: 'mascara', ef: { palavra: -2 } }
      ]
    },
    {
      id: 'guarda_ferido', arco: 1, quem: 'guarda',
      texto: 'Por favor... me ajuda. Minha filha tá lá fora, na cidade. (Ele sangra muito.)',
      opcoes: [
        { rotulo: 'Fazer um curativo', icone: 'coracao', ef: { coracao: 2, rep: 1 }, eco: 'Ele aperta tua mão. "Não vou esquecer teu rosto."' },
        { rotulo: 'Pegar a espada', icone: 'adaga', ef: { coracao: -1 }, flags: ['espada'] },
        { rotulo: 'Pegar a bolsa', icone: 'saco', ef: { coracao: -3, ouro: 15, rep: -1 } }
      ]
    },
    {
      id: 'bruto_cobra', arco: 1, quem: 'bruto', requer: [{ flag: 'bruto_traido' }], peso: 3,
      texto: 'RATINHO. Tu me deixou trancado. Sabe o que eu fiz com a porta? Adivinha o que eu faço contigo.',
      opcoes: [
        { rotulo: 'Implorar perdão', icone: 'balao', ef: { palavra: 2 }, eco: 'Ele cospe no chão. "Tá me devendo. Muito."' },
        { rotulo: 'Correr!', icone: 'bota', ef: { passo: -2 } },
        {
          rotulo: 'Lutar', icone: 'adaga', morte: 'bruto',
          casos: [{ se: [{ qualquer: [{ flag: 'espada' }, { flag: 'faca' }] }], morte: null, ef: { coracao: -2, rep: 1 }, tira: ['bruto_traido'], eco: 'A lâmina faz o gigante pensar duas vezes. Ele foge.' }]
        }
      ]
    },
    {
      id: 'louco', arco: 1, quem: 'louco',
      texto: 'Hihihi! Tu tens a moeda DELA! Eu sinto o frio daqui! Quem rouba a Ceifadora não morre, sabia? Só volta!',
      opcoes: [
        { rotulo: 'Mandar calar', icone: 'adaga', ef: { coracao: -1 } },
        { rotulo: 'Perguntar mais', icone: 'balao', ef: { passo: 1 }, eco: '"Cada vez que ela te busca, tu aprendes. Ela também."' },
        { rotulo: 'Dar um trocado', icone: 'moeda', requer: [{ eixo: 'ouro', op: '>=', v: 5 }], ef: { ouro: -5, coracao: 1, rep: 1 } },
        { rotulo: 'Ignorar o louco', icone: 'bota', ef: { passo: -1 } }
      ]
    },
    {
      id: 'cozinha', arco: 1, quem: 'narrador',
      texto: 'A cozinha do quartel. Panelas viradas, pão no chão e a garrafa de vinho do carcereiro, quase cheia.',
      opcoes: [
        { rotulo: 'Pegar a faca', icone: 'adaga', ef: { passo: -1 }, flags: ['faca'] },
        { rotulo: 'Levar o vinho', icone: 'saco', flags: ['vinho'] },
        { rotulo: 'Comer com calma', icone: 'ampulheta', ef: { passo: 2 }, eco: 'Primeira refeição quente em meses. Valeu o risco.' }
      ]
    },
    {
      id: 'cofre_odo', arco: 1, tipo: 'fixa', quem: 'narrador',
      texto: 'O gabinete do carcereiro. Um baú de coisas confiscadas, incluindo as tuas. Passos no corredor.',
      opcoes: [
        { rotulo: 'Arrombar com calma', icone: 'chave', ef: { passo: 1 }, ouroEvento: { base: 25 } },
        { rotulo: 'Pegar o que der', icone: 'saco', ouroEvento: { base: 30 } },
        { rotulo: 'Levar o baú todo', icone: 'bota', ef: { passo: -2 }, ouroEvento: { base: 45 } }
      ]
    },
    {
      id: 'portao_prisao', arco: 1, tipo: 'fim', quem: 'narrador',
      texto: 'O portão da prisão. Lá fora, a cidade arde e a Horda Cinzenta saqueia as ruas. Não tem mais volta.',
      opcoes: [
        { rotulo: 'Pela rua principal', icone: 'bota', ef: { passo: -2, rep: 1 } },
        { rotulo: 'Pelos telhados', icone: 'olho', ef: { passo: -1 }, flags: ['telhados'] },
        { rotulo: 'Pelos becos', icone: 'mascara', ef: { passo: 1, rep: -1 } }
      ]
    },

    // ───────────── ARCO II · A CIDADE EM CHAMAS ─────────────
    {
      id: 'cidade_arde', arco: 2, tipo: 'inicio', quem: 'narrador',
      texto: 'A cidade queima. No meio do caos, alguém aponta pra ti: "É o ladrão que roubou a Ceifadora!"',
      opcoes: [
        { rotulo: 'Cobrir o rosto', icone: 'mascara', ef: { passo: 1, rep: -1 } },
        { rotulo: 'Fazer reverência', icone: 'balao', ef: { rep: 2, passo: -1 }, eco: 'Metade aplaude. A outra metade cospe.' },
        { rotulo: 'Sumir na multidão', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'menina', arco: 2, quem: 'menina',
      texto: 'Moço! Meu pai ficou preso na padaria! Tá pegando fogo! Por favor!',
      opcoes: [
        { rotulo: 'Entrar no fogo', icone: 'coracao', ef: { coracao: 3, rep: 2, passo: -2 }, eco: 'Tu sais com o padeiro nas costas, tossindo. A rua inteira viu.' },
        { rotulo: 'Mandar ela fugir', icone: 'balao', ef: { coracao: 1, passo: 1 } },
        { rotulo: 'Saquear a padaria', icone: 'saco', ef: { coracao: -3, ouro: 10, rep: -2 } }
      ]
    },
    {
      id: 'batedor', arco: 2, quem: 'horda',
      texto: 'Tu! Humano magro. Conhece os túneis da cidade? Mostra o caminho e talvez vivas.',
      opcoes: [
        { rotulo: 'Guiar a Horda', icone: 'bota', ef: { palavra: -3, rep: -3, ouro: 20 }, flags: ['colaborador'] },
        { rotulo: 'Guiar pra armadilha', icone: 'mascara', ef: { palavra: -1, passo: -2, rep: 2 }, eco: 'Tu levas a patrulha direto pro canal. Splash.' },
        { rotulo: 'Esfaquear e correr', icone: 'adaga', ef: { coracao: -2, passo: -2 } }
      ]
    },
    {
      id: 'mira_reencontro', arco: 2, quem: 'mira', requer: [{ flag: 'mira_junto' }], peso: 3,
      texto: 'Achei um barco no porto. Cabem dois. O capitão quer 40 de ouro. Eu tenho 20. E tu?',
      opcoes: [
        { rotulo: 'Pagar tua parte', icone: 'moeda', requer: [{ eixo: 'ouro', op: '>=', v: 20 }], ef: { ouro: -20, palavra: 2 }, flags: ['passagem'], eco: '"Amanhecer, no cais", ela diz. "Não te atrasa."' },
        { rotulo: 'Roubar o barco', icone: 'saco', ef: { palavra: 1, passo: -2, rep: -1 }, flags: ['passagem'] },
        { rotulo: 'Ficar com o ouro dela', icone: 'mascara', ef: { palavra: -4, ouro: 20 }, eco: 'Ela não percebe. Ainda.' },
        { rotulo: 'Seguir sozinho', icone: 'bota', ef: { palavra: -1 }, tira: ['mira_junto'] }
      ]
    },
    {
      id: 'guilda', arco: 2, quem: 'sete',
      texto: 'O Gato Preto cuida dos seus, Corvo. Proteção, ouro e uma saída. Tu só ficas nos devendo um pouquinho.',
      opcoes: [
        { rotulo: 'Entrar pra guilda', icone: 'mascara', ef: { ouro: 30, rep: -2 }, flags: ['guilda', 'deve_guilda'], eco: '"Sessenta de ouro até o amanhecer, querido. Detalhe."' },
        { rotulo: 'Recusar com educação', icone: 'balao', ef: { palavra: 1 } },
        { rotulo: 'Bater a carteira dela', icone: 'saco', ef: { ouro: 25, palavra: -2, rep: -1 }, flags: ['sete_roubada'] }
      ]
    },
    {
      id: 'saqueadores', arco: 2, quem: 'narrador',
      texto: 'Gente da cidade, não da Horda, esvazia um templo. "Ajuda a carregar e leva tua parte!"',
      opcoes: [
        { rotulo: 'Carregar e lucrar', icone: 'saco', ef: { ouro: 20, rep: -2, coracao: -1 } },
        { rotulo: 'Chamar a milícia', icone: 'balao', ef: { rep: 2, palavra: 1, passo: -1 } },
        { rotulo: 'Passar reto', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'ponte', arco: 2, quem: 'narrador',
      texto: 'A ponte cede ao peso da multidão. Gente cai no rio. A outra margem é a tua saída.',
      opcoes: [
        {
          rotulo: 'Pular pro outro lado', icone: 'bota', morte: 'afogado',
          casos: [
            { se: [{ eixo: 'passo', op: '<=', v: -3 }], morte: null, ef: { passo: -1 }, eco: 'Tu pulas sem pensar. Ousadia também é técnica.' },
            { se: [{ flag: 'telhados' }], morte: null, ef: { passo: -1 }, eco: 'Correr pelos telhados te ensinou a pular.' }
          ]
        },
        { rotulo: 'Puxar quem caiu', icone: 'coracao', ef: { coracao: 2, rep: 2, passo: -1 } },
        { rotulo: 'Achar outra rota', icone: 'olho', ef: { passo: 2 } }
      ]
    },
    {
      id: 'cartaz', arco: 2, quem: 'narrador',
      texto: 'Um cartaz rasgado: "PROCURADO: O LADRÃO DA MOEDA. RECOMPENSA EM OURO." É o teu rosto. Mal desenhado.',
      opcoes: [
        { rotulo: 'Arrancar o cartaz', icone: 'adaga', ef: { passo: -1, rep: -1 } },
        { rotulo: 'Desenhar um bigode', icone: 'balao', ef: { rep: 2, passo: -1 }, eco: 'Uma criança ri. Tu viras lenda de beco.' },
        { rotulo: 'Seguir em frente', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'odo_cobra', arco: 2, quem: 'odo', requer: [{ flag: 'odo_enganado' }], peso: 3,
      texto: 'Tu me prometeu ouro, ladrãozinho! O velho Odo não esquece. Nem bêbado.',
      opcoes: [
        { rotulo: 'Pagar 15', icone: 'moeda', requer: [{ eixo: 'ouro', op: '>=', v: 15 }], ef: { ouro: -15, palavra: 2 }, tira: ['odo_enganado'] },
        { rotulo: 'Prometer de novo', icone: 'mascara', ef: { palavra: -2 } },
        { rotulo: 'Empurrar no canal', icone: 'adaga', ef: { coracao: -3, passo: -1 }, tira: ['odo_enganado'] },
        { rotulo: 'Correr', icone: 'bota', ef: { passo: -1 } }
      ]
    },
    {
      id: 'horda_patrulha', arco: 2, quem: 'narrador',
      texto: 'Uma patrulha da Horda vira a esquina. Seis lanças cinzentas. Eles ainda não te viram.',
      opcoes: [
        { rotulo: 'Fingir de morto', icone: 'caveira', ef: { passo: 2 }, eco: 'Tu és um cadáver convincente. Prática.' },
        { rotulo: 'Atacar o último', icone: 'adaga', ef: { passo: -3, coracao: -1, ouro: 10 } },
        { rotulo: 'Subir no telhado', icone: 'bota', ef: { passo: -1 } }
      ]
    },
    {
      id: 'barto_cidade', arco: 2, quem: 'barto', requer: [{ flag: 'barto_junto' }], peso: 2,
      texto: 'Garoto, conheço um ferreiro ali. Ele me deve um favor de trinta anos. Vem comigo?',
      opcoes: [
        { rotulo: 'Ir com o Bartô', icone: 'bota', ef: { palavra: 1, ouro: 10 }, flags: ['espada'], eco: 'O ferreiro te dá uma espada velha. "Pelo Bartô."' },
        { rotulo: 'Seguir sozinho', icone: 'olho', ef: { palavra: -1, passo: 1 } },
        { rotulo: 'Roubar o ferreiro', icone: 'saco', ef: { palavra: -3, ouro: 25, rep: -1 } }
      ]
    },
    {
      id: 'taverna', arco: 2, quem: 'narrador',
      texto: 'A Taverna do Javali, meio queimada. Bêbados cantam como se o mundo não estivesse acabando.',
      opcoes: [
        { rotulo: 'Beber com eles', icone: 'balao', ef: { passo: -1, rep: 1 } },
        { rotulo: 'Bater carteiras', icone: 'saco', ef: { ouro: 12, rep: -1, palavra: -1 } },
        { rotulo: 'Perguntar das saídas', icone: 'olho', ef: { passo: 1 }, eco: '"O porto ainda tem barcos", diz um bêbado. "E o templo tem corvos."' }
      ]
    },
    {
      id: 'joalheria', arco: 2, tipo: 'fixa', quem: 'narrador',
      texto: 'A joalheria do Barão está escancarada. Vitrines quebradas, ninguém à vista. Ainda.',
      opcoes: [
        { rotulo: 'Só as pedras miúdas', icone: 'saco', ef: { passo: 1 }, ouroEvento: { base: 20 } },
        { rotulo: 'Esvaziar o cofre', icone: 'chave', ef: { passo: -2 }, ouroEvento: { base: 40 } },
        { rotulo: 'Deixar um "obrigado"', icone: 'balao', ef: { rep: 1 }, ouroEvento: { base: 30 } }
      ]
    },
    {
      id: 'muralha', arco: 2, tipo: 'fim', quem: 'narrador',
      texto: 'As muralhas. O Portão Norte caiu nas mãos da Horda. Restam três caminhos: o porto, o templo e a guilda.',
      opcoes: [
        { rotulo: 'Rumo ao porto', icone: 'bota', flags: ['rota_porto'] },
        { rotulo: 'Rumo ao templo', icone: 'caveira', flags: ['rota_templo'] },
        { rotulo: 'Rumo à guilda', icone: 'mascara', flags: ['rota_guilda'] }
      ]
    },

    // ───────────── ARCO III · O AMANHECER ─────────────
    {
      id: 'ultima_noite', arco: 3, tipo: 'inicio', quem: 'narrador',
      texto: 'A madrugada chega. A moeda roubada pesa no bolso como chumbo. E está cada vez mais fria.',
      opcoes: [
        { rotulo: 'Apertar a moeda', icone: 'moeda', ef: { passo: 1 } },
        { rotulo: 'Apertar o passo', icone: 'bota', ef: { passo: -1 } },
        { rotulo: 'Falar com a moeda', icone: 'balao', flags: ['ouviu_moeda'], eco: 'Por um instante, tu juras que ela responde.' }
      ]
    },
    {
      id: 'porto_capitao', arco: 3, quem: 'capitao', requer: [{ flag: 'rota_porto' }], peso: 6,
      texto: 'Último barco antes da Horda queimar o cais. 50 de ouro, ladrão. Sem fiado.',
      opcoes: [
        { rotulo: 'Pagar 50', icone: 'moeda', requer: [{ eixo: 'ouro', op: '>=', v: 50 }], ef: { ouro: -50 }, flags: ['passagem'] },
        { rotulo: 'Ameaçar o capitão', icone: 'adaga', ef: { coracao: -2, passo: -2, rep: -1 }, flags: ['passagem'] },
        {
          rotulo: 'Entrar escondido', icone: 'olho', ef: { passo: 1 }, eco: 'Um marinheiro te pega pela gola e te joga no cais.',
          casos: [{ se: [{ eixo: 'passo', op: '>=', v: 2 }], ef: { passo: 1 }, flags: ['passagem'], eco: 'Tu te enfias entre os barris. Ninguém vê.' }]
        },
        { rotulo: 'Desistir do barco', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'guilda_sete', arco: 3, quem: 'sete', requer: [{ flag: 'rota_guilda' }], peso: 6,
      texto: 'A guilda te tira da cidade, Corvo. Em troca, tu trabalhas pra nós. Pra sempre.',
      opcoes: [
        { rotulo: 'Pedir o trono dela', icone: 'adaga', requer: [{ eixo: 'rep', op: '<=', v: -4 }], ef: { coracao: -2 }, flags: ['guilda'], eco: 'Ela ri. Depois para de rir.' },
        { rotulo: 'Aceitar o trato', icone: 'mascara', ef: { rep: -2 }, flags: ['guilda'] },
        { rotulo: 'Recusar', icone: 'bota', ef: { palavra: 1 } },
        { rotulo: 'Pedir um tempo', icone: 'balao', ef: { passo: 1 } }
      ]
    },
    {
      id: 'templo_guardiao', arco: 3, quem: 'guardiao', requer: [{ qualquer: [{ flag: 'rota_templo' }, { flag: 'ouviu_moeda' }] }], peso: 6,
      texto: 'Voltaste ao templo que roubaste. Ousado. A Senhora está ouvindo, ladrão.',
      opcoes: [
        { rotulo: 'Pedir perdão', icone: 'balao', ef: { palavra: 2, coracao: 1 }, flags: ['templo'] },
        { rotulo: 'Roubar de novo', icone: 'saco', ef: { ouro: 30, coracao: -3, palavra: -2 } },
        { rotulo: 'Perguntar da maldição', icone: 'olho', flags: ['templo'], eco: '"Ela anota cada morte tua. Quem morre o bastante aprende o caminho de volta."' }
      ]
    },
    {
      id: 'refugiados', arco: 3, quem: 'narrador',
      texto: 'Uma fila de refugiados na saída da cidade. Velhos, crianças. A Horda vem logo atrás.',
      opcoes: [
        { rotulo: 'Guiar o povo', icone: 'coracao', ef: { coracao: 2, rep: 3, passo: -1 } },
        { rotulo: 'Usar de escudo', icone: 'adaga', ef: { coracao: -4, rep: -3 } },
        { rotulo: 'Seguir sozinho', icone: 'bota', ef: { passo: 1 } }
      ]
    },
    {
      id: 'ceifadora_sonho', arco: 3, quem: 'ceifadora', requer: [{ meta: 'runs', op: '>=', v: 2 }],
      texto: 'Quantas vezes já te busquei, ladrão? Tu sabes o número. Eu também sei.',
      opcoes: [
        { rotulo: 'Desafiar a Senhora', icone: 'adaga', ef: { passo: -2, coracao: -1 }, eco: 'Ela ri. Um som de pá na terra.' },
        { rotulo: 'Pedir mais tempo', icone: 'balao', ef: { palavra: 1 }, eco: '"Tempo é a única coisa que eu tenho de sobra."' },
        { rotulo: 'Ficar calado', icone: 'olho', ef: { passo: 1 } }
      ]
    },
    {
      id: 'sete_cobra', arco: 3, quem: 'sete', requer: [{ flag: 'deve_guilda' }], peso: 4,
      texto: 'Dívida é dívida, Corvo. Sessenta de ouro. Agora, por favor.',
      opcoes: [
        { rotulo: 'Pagar 60', icone: 'moeda', requer: [{ eixo: 'ouro', op: '>=', v: 60 }], ef: { ouro: -60 }, tira: ['deve_guilda'], eco: '"Sempre um prazer, querido."' },
        { rotulo: 'Fugir pelos fundos', icone: 'bota', ef: { passo: -2 } },
        { rotulo: 'Prometer pra amanhã', icone: 'mascara', ef: { palavra: -2 } },
        { rotulo: 'Pedir desconto', icone: 'balao', ef: { rep: -1 } }
      ]
    },
    {
      id: 'horda_chefe', arco: 3, quem: 'chefe',
      texto: 'Um gigante cinzento bloqueia a rua. "Tu cheiras a morte, pequeno. Eu gosto disso."',
      opcoes: [
        {
          rotulo: 'Desafiar o gigante', icone: 'adaga', morte: 'chefe',
          casos: [{ se: [{ flag: 'espada' }], morte: null, ef: { rep: 3, passo: -1 }, eco: 'Espada velha, golpe de sorte. A Horda recua gritando.' }]
        },
        { rotulo: 'Mostrar a moeda', icone: 'moeda', ef: { passo: 1 }, eco: 'Ele recua. Até a Horda teme a Ceifadora.' },
        { rotulo: 'Oferecer serviço', icone: 'mascara', ef: { palavra: -2, rep: -2 } }
      ]
    },
    {
      id: 'corvos', arco: 3, quem: 'narrador',
      texto: 'Corvos de verdade pousam nos telhados e te encaram. Dizem que seguem quem a Ceifadora marcou.',
      opcoes: [
        { rotulo: 'Espantar os corvos', icone: 'adaga', ef: { passo: -1 } },
        { rotulo: 'Seguir os corvos', icone: 'bota', flags: ['rota_templo'], eco: 'Eles voam na direção do templo.' },
        { rotulo: 'Saudar os xarás', icone: 'balao', ef: { rep: 1 }, eco: 'Um corvo grasna de volta. Respeito.' }
      ]
    },
    {
      id: 'amanhecer', arco: 3, tipo: 'fim', quem: 'narrador',
      texto: 'O sol nasce sobre a cidade em ruínas. Era pra ser o dia da tua forca. É o dia em que tu escolhes quem ser.',
      opcoes: [
        { rotulo: 'Devolver a moeda', icone: 'moeda', requer: [{ flag: 'templo' }, { meta: 'mortes', op: '>=', v: 4 }], final: 'verdadeiro' },
        { rotulo: 'Abrir o portão ao povo', icone: 'coracao', requer: [{ eixo: 'rep', op: '>=', v: 4 }], final: 'heroi' },
        { rotulo: 'Tomar a guilda', icone: 'mascara', requer: [{ flag: 'guilda' }, { eixo: 'rep', op: '<=', v: -3 }], final: 'rei_becos' },
        { rotulo: 'Embarcar', icone: 'bota', requer: [{ flag: 'passagem' }], final: 'mar' },
        { rotulo: 'Ficar e lutar', icone: 'adaga', morte: 'escolhida' },
        { rotulo: 'Sumir na estrada', icone: 'bota', final: 'estrada' }
      ]
    }
  ];

  // Mortes com `cond` são as que a caveira mede: quando todas as condições batem,
  // ela pode acontecer a qualquer carta. Mortes sem `cond` vêm direto de uma escolha.
  const MORTES = {
    rato_rei: { titulo: 'Banquete do Rato-Rei', quem: 'rato', arcos: [1], texto: 'O túnel acaba num salão de ossos roídos. O Rato-Rei te olha com mil olhos. Tu és o jantar.' },
    fumaca: { titulo: 'Cochilo na Fumaça', quem: 'narrador', arcos: [1], texto: 'Tu esperaste a fumaça baixar. Ela não baixou. Tu baixaste.' },
    bruto: { titulo: 'O Abraço do Bruto', quem: 'bruto', arcos: [1, 2], cond: [{ flag: 'bruto_traido' }, { eixo: 'palavra', op: '<=', v: -5 }], texto: 'Bruto não esqueceu a tranca. Nem a tua promessa. Ele te dobra ao meio, devagar.' },
    odo: { titulo: 'Virote na Nuca', quem: 'odo', arcos: [1], cond: [{ semFlag: 'odo_caido' }, { eixo: 'passo', op: '<=', v: -5 }], texto: 'Tu correste rápido demais pelo pátio. Odo, bêbado, ainda acerta um alvo que corre. Às vezes.' },
    mira: { titulo: 'Vendido por Mira', quem: 'mira', arcos: [2, 3], cond: [{ flag: 'mira_junto' }, { eixo: 'palavra', op: '<=', v: -4 }], texto: '"É ele!", grita Mira, apontando. A recompensa era boa demais. Ela aprendeu contigo a não confiar.' },
    turba: { titulo: 'O Povo Lembra', quem: 'narrador', arcos: [2, 3], cond: [{ eixo: 'rep', op: '<=', v: -5 }], texto: 'Alguém grita "O ladrão!". A turba não pergunta nada. A cidade em chamas precisava de um culpado.' },
    horda: { titulo: 'Ousado Demais', quem: 'horda', arcos: [2, 3], cond: [{ eixo: 'passo', op: '<=', v: -7 }], texto: 'Tu correste direto pra uma praça cheia de lanças cinzentas. Coragem não é armadura.' },
    heroi: { titulo: 'Herói, Mas Morto', quem: 'menina', arcos: [2, 3], cond: [{ eixo: 'coracao', op: '>=', v: 6 }, { eixo: 'passo', op: '<=', v: -2 }], texto: 'Tu voltaste pro fogo pela quarta vez. Na quarta, o teto caiu. A cidade vai cantar teu nome. Tu não vais ouvir.' },
    afogado: { titulo: 'Pulo Mal Calculado', quem: 'narrador', arcos: [2], texto: 'Faltou meio metro. O rio levou o resto. Tu nunca aprendeste a nadar.' },
    guilda: { titulo: 'Dívida Cobrada', quem: 'sete', arcos: [3], cond: [{ flag: 'deve_guilda' }, { eixo: 'ouro', op: '<=', v: 59 }], texto: '"Eu avisei, querido. O Gato Preto sempre cobra." Uma lâmina fina, um sorriso educado.' },
    templo: { titulo: 'A Ceifadora Cobra Juros', quem: 'ceifadora', arcos: [3], cond: [{ flag: 'rota_templo' }, { eixo: 'coracao', op: '<=', v: -5 }], texto: 'No templo dela, tua crueldade fede. A Ceifadora estende a mão de osso: "Ainda não acabou. Mas doeu, não doeu?"' },
    chefe: { titulo: 'Desafio Ruim', quem: 'chefe', arcos: [3], texto: 'Tu desafiaste um gigante de mãos vazias. Ele riu. Foi a última coisa engraçada que tu viste.' },
    escolhida: { titulo: 'A Última Luta', quem: 'narrador', arcos: [3], texto: 'Tu ficaste. Tu lutaste no portão até o fim. Foi bonito. A Ceifadora aplaudiu.' }
  };

  const FINAIS = {
    verdadeiro: { titulo: 'A Moeda Devolvida', quem: 'ceifadora', texto: 'Tu pões a moeda na mão de osso. A Ceifadora fecha os dedos. "Agora tu podes morrer, ladrão. Então vive." Pela primeira vez, amanhã existe.' },
    heroi: { titulo: 'Herói da Brecha', quem: 'menina', texto: 'Tu abres o Portão Velho e mil pessoas fogem por ele. Cantam teu nome. Ninguém nota a figura de capuz na multidão, esperando.' },
    rei_becos: { titulo: 'Rei dos Becos', quem: 'sete', texto: 'A cidade em ruínas tem um novo dono. Madame Sete foi "aposentada". O Gato Preto agora mia o teu nome.' },
    mar: { titulo: 'Maré Alta', quem: 'capitao', texto: 'O barco some na névoa. A cidade vira fumaça no horizonte. A moeda continua fria no teu bolso.' },
    estrada: { titulo: 'Só Mais um Fugitivo', quem: 'narrador', texto: 'Tu somes na estrada. Livre, sem nome, sem rumo. A moeda pesa. A Ceifadora tem paciência.' }
  };

  // Caravana do Gruk: aparece entre os arcos e oferece 3 itens sorteados.
  // `desbloqueio` = quantas mortes diferentes o jogador precisa ter descoberto.
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
    finalLoop: 'A moeda ainda é tua. Um dia, ela vem buscar.'
  };

  const EIXOS_INFO = {
    coracao: { nome: 'Coração', menos: 'Cruel', mais: 'Piedoso' },
    palavra: { nome: 'Palavra', menos: 'Traiçoeiro', mais: 'Leal' },
    passo: { nome: 'Passo', menos: 'Ousado', mais: 'Cauteloso' },
    rep: { nome: 'Fama', menos: 'Infame', mais: 'Famoso' },
    ouro: { nome: 'Ouro', menos: 'pouco', mais: 'muito' }
  };

  raiz.DADOS = {
    QUEM, ARCOS, MORTES, FINAIS, ITENS, FALAS, EIXOS_INFO,
    CARTAS: Object.fromEntries(CARTAS.map(c => [c.id, c])),
    LISTA_CARTAS: CARTAS
  };
})(typeof window !== 'undefined' ? window : globalThis);
