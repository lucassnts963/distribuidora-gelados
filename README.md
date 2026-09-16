# Controle da Distribuidora

Sistema web pequeno para controlar **estoque, vendas, compras, despesas e caixa** de uma
distribuidora de produtos gelados (laranjinha, cremosinho e o que vier depois).

Feito para ser usado **no celular**, por duas pessoas, com o banco em um único arquivo SQLite.

---

## O que ele responde

- Quanto entrou e quanto saiu de caixa no mês
- Quanto de fato sobrou (lucro bruto e lucro líquido — são coisas diferentes)
- Quantas unidades faltam para a meta do mês
- Qual sabor vende mais, qual está parado há semanas e qual acaba em menos de 7 dias
- Quanto do faturamento depende de um único cliente
- **Quanto o atacado rende por unidade contra o varejo** — e quanto de lucro você
  deixou na mesa por despachar no atacado em vez de vender você mesmo

## Modelo de dados

```
produto (Laranjinha)  ──< sabor (Uva, Abacaxi, ...)
                             │
      compras ──< itens ─────┤   entrada de estoque
      vendas  ──< itens ─────┤   saída de estoque
      ajustes ───────────────┘   perda, brinde, contagem
```

O estoque **não** é um campo que se atualiza: é sempre `compras − vendas ± ajustes`.
Isso significa que apagar uma venda devolve o estoque automaticamente e o histórico nunca mente.

Preço fica no **produto** (padrão) e o **sabor** só sobrescreve se for diferente —
que é exatamente o caso de "todos os sabores custam o mesmo, mas às vezes um custa mais".

Todo dinheiro é guardado em **centavos (INTEGER)**. Nunca em float.

---

## Rodando local

```bash
npm install
cp .env.example .env       # troque a APP_PASSWORD
npm run dev                # http://localhost:3000
npm run seed               # opcional: cria Laranjinha e Cremosinho com sabores comuns
```

## Rodando com Docker Compose

```bash
cp .env.example .env       # troque a APP_PASSWORD
docker compose up -d --build
```

O `docker-compose.yml` builda a imagem (build multi-stage, `next build` com
`output: standalone`), expõe a porta `3000` (ou `${PORT}` do `.env`) e guarda
o banco SQLite no volume nomeado `gelados_data`, montado em `/app/data`
dentro do container — sobrevive a `docker compose down` e a rebuilds.

```bash
docker compose logs -f       # acompanhar
docker compose down          # parar (o volume gelados_data continua existindo)
```

### Backup (com Docker)

O container já tem o `sqlite3` instalado. Faça o backup de dentro dele,
nunca copiando o arquivo do volume por fora (o modo WAL tem arquivos
auxiliares abertos):

```bash
docker compose exec gelados sqlite3 /app/data/gelados.db \
  ".backup '/app/data/backup-$(date +%F).db'"
docker cp gelados:/app/data/backup-$(date +%F).db ./backup-$(date +%F).db
```

Coloque isso num cron diário. Um freezer queima; um HD também.

## Rodando na sua VPS

```bash
npm ci
npm run build

# .env de produção
APP_PASSWORD=uma-senha-boa
DATABASE_PATH=/var/lib/gelados/gelados.db
PORT=3000

npm start
```

Coloque atrás do Nginx com HTTPS (o cookie de sessão só é `secure` em produção)
e rode com PM2 ou systemd:

```ini
# /etc/systemd/system/gelados.service
[Unit]
Description=Controle da Distribuidora
After=network.target

[Service]
WorkingDirectory=/opt/gelados
EnvironmentFile=/opt/gelados/.env
ExecStart=/usr/bin/npm start
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

### Backup

O banco inteiro é **um arquivo**. Backup é copiar ele:

```bash
sqlite3 /var/lib/gelados/gelados.db ".backup '/backup/gelados-$(date +%F).db'"
```

Use `.backup` e não `cp` — o modo WAL tem arquivos auxiliares abertos.
Coloque isso num cron diário. Um freezer queima; um HD também.

---

## Acesso

Senha única em `APP_PASSWORD`, cookie assinado com HMAC válido por 90 dias.
Não há usuários separados — se um dia precisar saber *quem* lançou, é aí que
entra tabela de usuários.

## Custo médio ponderado móvel

O custo usado para calcular lucro **não** é o preço da tabela nem a média simples
das compras. É o custo médio móvel — a cada compra:

```
novo custo médio = (saldo × custo médio atual + compra × preço da compra)
                   ─────────────────────────────────────────────────────
                                  saldo + compra
```

Por que isso importa: comprei 100 a R$ 1,00, vendi 90, comprei 100 a R$ 2,00.

| método | custo médio |
|---|---|
| média simples das compras | R$ 1,50 ← **errado**, subestima |
| custo médio móvel | R$ 1,91 ← certo, sobrou pouco do lote barato |

Toda saída (venda, perda, brinde) sai pelo custo médio vigente **naquele momento**,
congelado na venda. Lucro de venda já registrada não muda sozinho.

A ordem cronológica usa a data que você informa; dentro do mesmo dia vale a ordem
real de lançamento. Se lançar uma compra com **data retroativa**, use
*Ajustes → Recalcular custo médio de tudo*.

O sistema mostra em Produtos o custo da tabela contra o custo médio real, e avisa
no painel quando os dois divergem 5% ou mais.

## Testes

```bash
npm run test:custo         # 10 verificações do custo médio móvel (unitário)

npm start &                # servidor
BASE_URL=http://127.0.0.1:3000 npm run test:e2e   # 41 verificações no navegador
```

O e2e cria produto, sabores, compra, venda no atacado, venda no varejo, segunda
compra a preço diferente, despesa e ajuste de perda — e confere estoque, custo
médio, lucro por canal e caixa em cada tela.

## Preços cadastrados no seed

| | custo | atacado | varejo |
|---|---|---|---|
| Laranjinha | 1,50 | 2,00 | 3,00 |
| Cremosinho | 0,80 | **1,30 (placeholder)** | 1,50 |

O atacado do cremosinho é um chute meu mantendo os mesmos R$ 0,50 de lucro da
laranjinha. **Confirme e corrija na tela de Produtos** antes de lançar venda.

---

## O que ele de propósito NÃO faz

- **Fiado / contas a receber.** Você disse que vende só à vista. No dia em que
  aparecer o primeiro "te pago sexta", isso vira a coisa mais importante do sistema.
- **Emissão de nota.** Outro problema, outra hora.
- **Multiusuário com permissão.** Duas pessoas de confiança, uma senha.
