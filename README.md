# A Moeda da Ceifadora

Protótipo de um jogo de cartas narrativo no estilo Reigns, em pixel art. Tu és um ladrão condenado que foge da prisão durante a invasão da cidade. Cada escolha muda quem tu és, e uma caveira mostra quão perto a morte está.

**Versão atual: v2, só o Arco I (O Fosso).** Os arcos II e III da v1 estão no histórico do git (commit `72a54f4`) e vão ser reescritos no formato novo.

O conceito completo e as decisões de design estão em [`docs/CONCEITO.md`](docs/CONCEITO.md).

## Jogar

Abra `index.html` no navegador. Não precisa instalar nada.

- Toque na carta pra ler o próximo trecho (ou `espaço`). Depois, toque numa das três cartas de ação (ou `1`, `2`, `3`).
- O progresso entre runs (Ossuário, déjà vu) fica salvo no navegador.

## Estrutura

| Arquivo | O que tem |
|---|---|
| `js/cartas.js` | **Todo o conteúdo**: personagens, cartas, mortes, finais e itens. É aqui que se escreve. |
| `js/nucleo.js` | Regras do jogo: eixos, caveira, sorteio de cartas, caravana, ampulheta. Sem nada de tela. |
| `js/interface.js` | Desenha a tela e repassa os toques do jogador pro núcleo. |
| `js/sprites.js` | Sprites provisórios de 12×12. Troque pelos desenhos definitivos. |
| `tools/simular.js` | Valida o conteúdo e simula milhares de runs pra medir o equilíbrio. |

## Criar uma carta nova

Copie uma carta em `js/cartas.js` e edite. O comentário no topo do arquivo explica cada campo. Exemplo:

```js
{
  id: 'guarda', arco: 1, quem: 'guarda',
  texto: [
    { quem: 'narrador', t: 'Um guarda ferido, encostado na parede. Jovem demais pra farda.' },
    'Por favor... minha mãe tá na cidade baixa. Me ajuda a levantar.'
  ],
  extras: [{ se: [{ flag: 'com_bruto' }], quem: 'bruto', t: 'Guarda bom é guarda deitado, ratinho.' }],
  opcoes: [
    { rotulo: 'Usar de refém', icone: 'adaga', requer: [{ eixo: 'coracao', op: '<=', v: -3 }], ef: { coracao: -2 }, flags: ['refem'] },
    { rotulo: 'Fazer um curativo', icone: 'coracao', ef: { coracao: 2, passo: 2 }, rel: { bruto: -1 }, flags: ['guarda_salvo'] },
    { rotulo: 'Pegar a espada', icone: 'adaga', ef: { coracao: -2 }, flags: ['espada'] }
  ]
}
```

Regras da v2: toda escolha custa algo, as opções especiais vêm antes das genéricas (só as 3 primeiras disponíveis aparecem) e personagens voltam em `extras` e `requer`.

Depois rode o simulador pra ver se nada quebrou:

```
node tools/simular.js            # 2000 jogadores × 10 runs, três perfis
node tools/simular.js 500 5      # mais rápido
```

Ele aponta referências quebradas (carta, morte ou ícone que não existe), textos longos demais e mostra com que frequência cada morte e cada final acontecem.
