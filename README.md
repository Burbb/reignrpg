# A Moeda da Ceifadora

Protótipo de um jogo de cartas narrativo no estilo Reigns, em pixel art. Tu és um ladrão condenado que foge da prisão durante a invasão da cidade. Cada escolha muda quem tu és, e uma caveira mostra quão perto a morte está.

O conceito completo e as decisões de design estão em [`docs/CONCEITO.md`](docs/CONCEITO.md).

## Jogar

Abra `index.html` no navegador. Não precisa instalar nada.

- Toque numa das três cartas (ou use as teclas `1`, `2` e `3`).
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
  id: 'cozinha', arco: 1, quem: 'narrador',
  texto: 'A cozinha do quartel. Panelas viradas, pão no chão e a garrafa de vinho do carcereiro.',
  opcoes: [
    { rotulo: 'Pegar a faca', icone: 'adaga', ef: { passo: -1 }, flags: ['faca'] },
    { rotulo: 'Levar o vinho', icone: 'saco', flags: ['vinho'] },
    { rotulo: 'Comer com calma', icone: 'ampulheta', ef: { passo: 2 }, eco: 'Valeu o risco.' }
  ]
}
```

Depois rode o simulador pra ver se nada quebrou:

```
node tools/simular.js            # 2000 jogadores × 25 runs
node tools/simular.js 500 10     # mais rápido
```

Ele aponta referências quebradas (carta, morte ou ícone que não existe), textos longos demais e mostra com que frequência cada morte e cada final acontecem.
