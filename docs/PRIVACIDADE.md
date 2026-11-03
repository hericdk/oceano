# Privacidade da contagem de uso

O Oceano e o site oceano.gg só contam uso com a sua autorização, dada nos primeiros passos, em Configurações ou no aviso do site. Sem ela, nada é enviado. A contagem do app vale para as versões a partir da 1.0. Este texto segue a Lei Geral de Proteção de Dados (LGPD).

## O que é enviado

**No app, no máximo um sinal por dia:** versão, sistema (Mac, Windows ou Linux), idioma, país configurado no sistema, faixa de tempo de uso do dia anterior (até 15 min, até 1 h, até 3 h ou mais), se é a primeira vez e se é o primeiro sinal do mês.

**No site:** com o seu aceite, carregam dois serviços de medição. Sem o aceite, nenhum dos dois carrega.

- **Google Analytics (Google):** guarda cookies e registra páginas vistas, aparelho, navegador e região aproximada.
- **Microsoft Clarity (Microsoft):** guarda cookies e grava como a página é usada, como cliques, rolagem e movimento do mouse, em gravações de sessão e mapas de calor.

Cada empresa trata esses dados conforme a própria política, inclusive fora do Brasil, e recebe o seu IP ao atender a conexão.

No app, nunca vão sites visitados, conversas, arquivos, chaves, nome, e-mail ou qualquer identificador. O tempo é medido no seu computador, e só a faixa sai dele.

## O que fica no servidor

Só somas por dia, separadas por dimensão: por exemplo, quantos sinais vieram do Brasil em um dia. Os números não se cruzam entre si e não guardam a hora. O nosso código não lê o IP, não grava registros e não tem rota pública de leitura. O código está em [`servidor/contagem/`](../servidor/contagem/).

Cada envio recebe um recibo aleatório, guardado no seu computador. No servidor fica só uma impressão dele, por 30 dias, para permitir a remoção. Depois disso, restam apenas os totais, que não têm ligação com ninguém.

## Seus direitos

- **Desligar no site:** em Privacidade, no menu, o botão "Desligar e apagar meus cookies" para a medição e apaga os cookies dela neste navegador. O que já foi registrado fica com o Google e a Microsoft pelo prazo de retenção de cada serviço, e nós não conseguimos apagar uma visita específica, porque ela não tem o seu nome. Para pedir a eles, use os canais de privacidade do [Google](https://policies.google.com/privacy) e da [Microsoft](https://privacy.microsoft.com/privacystatement).
- **Desligar no app:** em Configurações, a qualquer momento. O envio para na hora.
- **Remover no app:** o botão "Apagar meus dados de uso", em Configurações, retira das somas tudo o que você enviou nos últimos 30 dias e apaga os recibos e as datas guardados com você. Sem internet, o app guarda o pedido e tenta de novo.
- **Conferir:** no app, cada envio aparece em `oceano://rede`.

Na contagem do app não há identificador, então ninguém consegue achar os seus envios sem os recibos que estão com você. Se limpar os dados do app, os recibos somem junto, e a remoção deixa de ser possível para os envios anteriores.

## Base legal e responsável

A base legal é o seu consentimento (art. 7º, I, da LGPD), que você pode retirar quando quiser. Não vendemos dados. Eles servem para estimar quantas pessoas usam o Oceano e onde, e para entender como melhorar o site, e só chegam às empresas citadas aqui. A contagem roda na Cloudflare, que atua como operadora: como em qualquer conexão à internet, ela recebe o IP para entregar o envio e trata esses dados conforme a política dela, inclusive fora do Brasil. A conexão é cifrada.

Responsável: @hericdk. Dúvidas e pedidos: abra um aviso em [github.com/hericdk/oceano/issues](https://github.com/hericdk/oceano/issues).
