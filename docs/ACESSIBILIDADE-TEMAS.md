# Acessibilidade nos temas do Oceano

Um tema bonito que ninguém consegue ler não funciona. No Oceano, **acessibilidade vem antes do estilo**:
quem cria um tema (você, a comunidade, a loja) deve tratar estas regras como prioridade.

O editor de temas (`oceano://temas/editar`) confere o contraste ao vivo na seção **Legibilidade** e avisa
antes de salvar um tema que não passa. Os temas da loja só são aceitos se passarem em todas as checagens.

## 1. Contraste (o mais importante)

O contraste segue as recomendações WCAG 2.2 (nível AA):

| Par de cores | Mínimo | Por quê |
|---|---|---|
| texto sobre o fundo | **4,5 : 1** | texto corrido precisa ser lido sem esforço |
| texto sobre painéis | **4,5 : 1** | janelas, abas e menus |
| texto secundário sobre painéis | **3 : 1** | dicas, datas, legendas |
| links e ícones sobre o fundo | **3 : 1** | elementos de interface (WCAG 1.4.11) |
| texto dos botões (fundo sobre acento) | **3 : 1** | botões principais |
| destaques sobre painéis | **3 : 1** | avisos, erros, selos |

Dicas:
- Em paletas com poucas cores, reserve **uma cor bem clara e uma bem escura** só para texto e fundo.
- O pixelizar mistura duas cores lado a lado: a cor que o olho enxerga é a média delas. Confira o contraste
  do texto com a **média** do vidro pixelizado, não só com a cor mais escura.
- Teste o tema também à noite e no pôr do sol (a hora da cena muda as cores do mar atrás das janelas).

## 2. Não dependa só da cor

- Estado (ligado, ativo, erro) precisa ter **forma ou texto** além da cor: um ícone, um contorno, uma palavra.
- Pense em quem não distingue vermelho e verde (cerca de 1 em cada 12 homens): erro e sucesso não podem
  ser só vermelho × verde.
- Os grupos de abas e os perfis usam cor, mas também têm nome; mantenha os nomes visíveis.

## 3. Foco e teclado

- O contorno de foco (`:focus-visible`) usa a cor **sol** do tema: ela precisa contrastar 3 : 1 com o fundo e
  com os painéis, senão quem navega pelo teclado se perde.
- Nunca esconda o contorno de foco num tema.

## 4. Movimento e brilho

- Evite paletas que piscam ou com saltos fortes de brilho entre cores vizinhas no pixelizado (cansa a vista e
  pode incomodar quem tem sensibilidade à luz).
- Quem prefere menos movimento (`prefers-reduced-motion`) deve ver o mar calmo: não force animação no tema.

## 5. Tamanho e fontes

- As fontes em pixel ficam legíveis a partir de 12 px; texto corrido a partir de 13 px.
- Não diminua o tamanho do texto pelo tema; o tema muda cores, não a escala da interface.

## 6. Dados sensíveis e gravações

- Informações locais (sites abertos, endereços, regras de proxy) aparecem escondidas atrás de um bloco em
  pixelizar com cadeado. O bloco usa a cor do **texto** do tema: num tema com pouco contraste ele também some.
  Mais um motivo para respeitar o contraste do item 1.

## Checklist rápido antes de publicar um tema

- [ ] Todas as linhas da seção **Legibilidade** do editor estão "ok".
- [ ] Erro, sucesso e aviso têm ícone ou texto, não só cor.
- [ ] O contorno de foco aparece em todas as telas.
- [ ] Testei de dia, no pôr do sol e à noite.
- [ ] Li um parágrafo inteiro numa página do Oceano sem forçar a vista.
