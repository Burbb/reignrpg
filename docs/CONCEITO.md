# A Moeda da Ceifadora: conceito

> *Tua forca é amanhã. A cidade caiu hoje. A porta da cela está aberta.*

Um jogo de cartas narrativo no estilo Reigns, em pixel art e feito pro celular. Tu és Corvo, um ladrão condenado que foge de uma prisão durante a invasão da cidade. Tu vais morrer muitas vezes, e isso faz parte da história.

O nome é provisório.

---

## 1. A mudança principal: o crime vira o motivo pra jogar de novo

No conceito original, o crime imperdoável era só pano de fundo. Agora ele explica o jogo inteiro:

**Corvo roubou a moeda da Ceifadora** (a deusa da morte) do Ossuário da cidade. Enquanto a moeda estiver com ele, a Ceifadora não consegue levá-lo de vez. Cada morte o devolve à cela, na noite antes da forca, **e ele lembra**.

Esse gancho resolve várias coisas de uma vez:

| Problema | Como o gancho resolve |
|---|---|
| Por que recomeçar do zero depois de morrer? | É um loop temporal. A cela é o ponto de partida canônico. |
| Como fazer morrer ser divertido e não frustrante? | Cada morte é uma descoberta: entra no **Ossuário** e marca a escolha fatal com um **déjà vu** nas próximas runs. |
| Como dar sentido ao poder de voltar no tempo? | A **Ampulheta Rachada** é um pedaço desse mesmo poder. |
| Qual é o final "de verdade"? | **Devolver a moeda.** Só fica disponível quando a Ceifadora "te conhece" (4+ mortes diferentes descobertas) e tu passaste pelo templo. |

É a mesma estrutura de Hades e de Returnal, jogos que deram muito certo com o público jovem justamente porque morrer faz a história andar.

---

## 2. Pra novas gerações: rápido, curto e compartilhável

Essas são as regras que segui no protótipo. Valem pra todo conteúdo novo:

1. **Até ~150 caracteres por carta de evento** (2 ou 3 linhas no celular). No conceito original eram 3 a 4 linhas: cortei. A ideia é ler num relance.
2. **Cada opção tem no máximo 3 ou 4 palavras.** O ícone diz metade.
3. **Run curta.** Uma morte acontece em 1 a 3 minutos e uma run completa leva uns 6 a 8 minutos (24 cartas). Dá pra jogar na fila do ônibus.
4. **Recomeçar com 1 toque.** Nada de menu entre uma morte e outra.
5. **Morte com nome e piada.** "Cochilo na Fumaça", "Herói, Mas Morto", "Desenhar um bigode" no cartaz de procurado. O humor seco é o que faz o pessoal mandar print pros amigos.
6. **Botão "Copiar minha morte".** Gera um texto pronto pra mandar no grupo ("☠ Morri pela 7ª vez: Banquete do Rato-Rei na carta 6"). No jogo final isso vira uma imagem com a arte da morte.
7. **Colecionar.** O Ossuário (13 mortes e 5 finais no protótipo) dá aquela vontade de completar.
8. **Celular na vertical, jogável com uma mão só.** As três cartas de ação ficam embaixo, perto do polegar.

---

## 3. Estrutura da run

```
ARCO I · A Prisão (9 cartas)  →  Caravana do Gruk
ARCO II · A Cidade em Chamas (9 cartas)  →  Caravana do Gruk
ARCO III · O Amanhecer (6 cartas)  →  Final
```

Cada arco tem:

- **Carta de abertura fixa** (a cena que todo mundo vê).
- **Saque grande fixo** (o evento de ouro), no meio do arco.
- **Cartas sorteadas** de um baralho do arco, cada uma com condições ("só aparece se tu soltaste o Bruto", "só se tu tens a faca"). É isso que faz cada run ser diferente.
- **Carta de fechamento fixa**, que leva ao próximo arco.

Isso substitui a linha do tempo fixa do conceito original. A história continua tendo começo, meio e fim, mas o caminho muda a cada run.

---

## 4. Mecânicas

### Eixos (de −10 a +10)

| Eixo | − | + |
|---|---|---|
| Coração | Cruel | Piedoso |
| Palavra | Traiçoeiro | Leal |
| Passo | Ousado | Cauteloso |
| Fama | Infame | Famoso |

São três eixos de personalidade mais a fama. Mais que isso dilui o peso de cada escolha. Cada carta de ação mostra **pontinhos coloridos** com os eixos que ela vai mexer (o tamanho indica a intensidade), mas não mostra a direção. É a mesma lógica do Reigns.

### A caveira (iminência de morte)

É o diferencial do jogo. Cada morte "silenciosa" tem condições, por exemplo:

> **Vendido por Mira**: a Mira está contigo **e** tua Palavra ≤ −4.

A caveira calcula o quão perto tu estás de cada morte do arco atual:

- **Condições de flag são portas.** Se a Mira não está contigo, essa morte vale 0%.
- **Condições de eixo se aproximam aos poucos.** Valem 100% quando batem e caem até 0% a 8 pontos de distância (ou 60 de ouro).
- A proximidade de uma morte é a média das condições de eixo dela.
- **A caveira mostra a morte mais próxima**, com uma curva que deixa os números baixos calmos e faz os altos subirem rápido.

Quando uma morte chega a 100%, ela **pode** acontecer a qualquer carta: 35% de chance na primeira, 70% nas seguintes. Isso deixa uma janela pra fugir dela. O jogador sente o perigo sem saber de onde vem, como tu querias.

A diferença em relação ao conceito original: **quando tu morres, o jogo explica o porquê** ("PALAVRA −6 (TRAIÇOEIRO)"). Assim a morte vira aprendizado.

Também existem **mortes diretas**, de escolhas obviamente ruins ("Esperar a fumaça baixar"). Elas não entram na caveira, mas ganham o selo de déjà vu depois que te matam uma vez.

### Ouro e saques

- Cada arco tem um **saque grande** que dá de 20 a 100 de ouro.
- **A cada run, cada saque favorece um eixo e um lado sorteados.** Numa run, quem está mais cruel ganha mais na joalheria; na outra, quem está mais leal. Ninguém consegue planejar desde o início, que era a tua ideia.
- Algumas cartas dão ouro pequeno (roubar uma bolsa, bater carteira).
- Algumas opções pedem ouro (pagar a dívida da guilda, comprar o barco).

### Caravana do Gruk (entre os arcos)

O conceito original previa a caravana a cada 10 eventos. Agora ela aparece **entre os arcos**, que dá praticamente o mesmo ritmo e ainda serve de respiro narrativo. O Gruk oferece 3 itens sorteados:

| Item | Efeito | Preço |
|---|---|---|
| Olho do Falcão | Por 5 cartas, mostra quanto cada escolha mexe na caveira (ou "☠ MORTE") | 40 |
| Sussurro dos Mortos | Por 5 cartas, mostra a direção (+/−) de cada eixo | 30 |
| Capa de Fumaça | Pula a carta atual (exceto as fixas) | 25 |
| Água do Esquecimento | Zera a fama | 45 |
| Bolsa do Avarento | Dobra o próximo saque grande | 20 |
| Ampulheta Rachada | Quando tu morres, volta 5 cartas. Um uso | 70 |

O **Sussurro** só aparece depois de 2 mortes diferentes descobertas e a **Ampulheta** depois de 4. Morrer destrava ferramentas: é a progressão entre runs.

Mudei a "Onisciência do tempo" do conceito original. Voltar 5 turnos a qualquer momento tirava a tensão. Agora ela só funciona **no momento da morte**, como uma segunda chance dramática.

### Finais

| Final | Como chegar |
|---|---|
| A Moeda Devolvida (verdadeiro) | Passar pelo templo e ter 4+ mortes descobertas |
| Herói da Brecha | Fama ≥ 4 no amanhecer |
| Rei dos Becos | Entrar na guilda e fama ≤ −3 |
| Maré Alta | Conseguir passagem num barco |
| Só Mais um Fugitivo | Sempre disponível |

Também dá pra **escolher morrer** ("Ficar e lutar"), o que conta como morte no Ossuário.

---

## 5. Elenco

Corvo (tu) · Velho Bartô · Mira Dedos-Leves · Bruto · Carcereiro Odo · Rato-Rei · Prisioneiro Risonho · Guarda Ferido · Filha do Padeiro · Batedor e Chefe da Horda · Madame Sete (guilda do Gato Preto) · Capitão do Porto · Guardião do Ossuário · A Ceifadora · **Gruk, o goblin mercador**.

O Gruk e a Ceifadora são os mascotes. São os personagens que vão pra loja do app, pros stickers e pra divulgação.

---

## 6. Quanta arte precisa

O maior risco de escopo era desenhar uma arte única pra cada carta de ação. Este plano evita isso:

| O quê | Quantidade | Observação |
|---|---|---|
| Retratos de personagem | ~16 | Um por personagem. Variações de expressão são opcionais. |
| Cenas de narração | ~10 | Prisão, esgoto, fumaça, cidade, ponte, muralha, porto, templo... reutilizáveis entre cartas. |
| Ícones de ação | ~12 | Fugir, lutar, espiar, falar, mentir, roubar, ajudar, esperar, chave, moeda, caveira. **Reutilizados em todas as cartas.** |
| Telas de morte | 13 | Uma ilustração por morte: é o que as pessoas vão compartilhar. |
| Telas de final | 5 | |
| UI | 1 kit | Moldura de carta, HUD, caravana. |

São umas **55 a 60 peças** pra um jogo completo de 3 arcos. Dá pra fazer sozinho.

No protótipo, a arte é provisória: sprites de 12×12 desenhados por código, só pra marcar o lugar de cada peça.

---

## 7. Próximos passos

1. **Jogar o protótipo** (tu e a Livia) e anotar o que é chato, o que é injusto e o que é engraçado. A pergunta principal é se a caveira é divertida.
2. **Ajustar os números** com o simulador (`node tools/simular.js`), que joga 50 mil runs e mostra quais mortes e finais acontecem com que frequência.
3. **Desenhar a arte** começando pelos 12 ícones de ação e pelos 5 personagens do arco I. Trocar os sprites provisórios é só apontar pros PNGs.
4. **Mais conteúdo.** A meta pra um jogo lançável é de **100 a 150 cartas**. Hoje são 39.
5. **Plataforma.** Do jeito que está, já roda no navegador do celular. Pra lojas, dá pra empacotar como app (Capacitor) ou portar pro Godot. O conteúdo já está separado do motor, então qualquer caminho serve.

### Ideias pra depois (não estão no protótipo)

- **Run do dia**: todo mundo joga a mesma semente no mesmo dia e compara as mortes.
- Personagens que lembram do loop ("Tu de novo? Da última vez tu me traiu...").
- Arrastar a carta pro lado pra escolher (gesto do Reigns) além de tocar.
- Som: um sino a cada carta e um batimento cardíaco quando a caveira passa de 70%.
- Novos protagonistas pra outros loops: outros ladrões que roubaram outros deuses.
