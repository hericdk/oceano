# Privacidade da contagem de uso

O Oceano e o site oceano.gg só contam uso com a sua autorização, dada nos primeiros passos, em Configurações ou no aviso do site. Sem ela, nada é enviado. A contagem do app ainda não está ativa: ela entra em uma próxima versão. Este texto segue a Lei Geral de Proteção de Dados (LGPD).

## O que é enviado

**No app, no máximo um sinal por dia:** versão, sistema (Mac, Windows ou Linux), idioma, país configurado no sistema, faixa de tempo de uso do dia anterior (até 15 min, até 1 h, até 3 h ou mais), se é a primeira vez e se é o primeiro sinal do mês.

**No site:** com o seu aceite, o Google Analytics carrega e registra a visita. Ele guarda cookies próprios e envia ao Google dados como páginas vistas, aparelho, navegador e região aproximada, e o Google trata esses dados conforme a política dele, inclusive fora do Brasil. Sem o aceite, ele nem carrega.

No app, nunca vão sites visitados, conversas, arquivos, chaves, nome, e-mail ou qualquer identificador. O tempo é medido no seu computador, e só a faixa sai dele.

## O que fica no servidor

Só somas por dia, separadas por dimensão: por exemplo, quantos sinais vieram do Brasil em um dia. Os números não se cruzam entre si e não guardam a hora. O nosso código não lê o IP, não grava registros e não tem rota pública de leitura. O código está em [`servidor/contagem/`](../servidor/contagem/).

Cada envio recebe um recibo aleatório, guardado no seu computador. No servidor fica só uma impressão dele, por 30 dias, para permitir a remoção. Depois disso, restam apenas os totais, que não têm ligação com ninguém.

## Seus direitos

- **Desligar:** a qualquer momento, em Configurações, no app, ou em Privacidade, no menu do site. O envio para na hora.
- **Remover:** o botão "Apagar meus dados de uso", nos mesmos lugares, retira das somas do app tudo o que você enviou nos últimos 30 dias e apaga os recibos e as datas guardados com você. No site, ele desliga o Google Analytics e apaga os cookies dele deste navegador; o que já foi registrado fica no Google pelo prazo de retenção da conta e deixa de ser ligado a você quando o cookie some. Sem internet, o app guarda o pedido e tenta de novo.
- **Conferir:** no app, cada envio aparece em `oceano://rede`.

Como não há identificador, ninguém consegue achar os seus envios sem os recibos que estão com você. Se limpar os dados do navegador ou do app, os recibos somem junto, e a remoção deixa de ser possível para os envios anteriores.

## Base legal e responsável

A base legal é o seu consentimento (art. 7º, I, da LGPD), que você pode retirar quando quiser. Os dados não são vendidos nem compartilhados, e servem só para estimar quantas pessoas usam o Oceano e onde. A contagem roda na Cloudflare, que atua como operadora: como em qualquer conexão à internet, ela recebe o IP para entregar o envio e trata esses dados conforme a política dela, inclusive fora do Brasil. A conexão é cifrada.

Responsável: @hericdk. Dúvidas e pedidos: abra um aviso em [github.com/hericdk/oceano/issues](https://github.com/hericdk/oceano/issues).
