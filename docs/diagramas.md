# Diagramas do Giro

Fonte dos diagramas em Mermaid. Para abrir no draw.io: **Extras → Edit Diagram**
ou **Arrange → Insert → Advanced → Mermaid**, e colar o bloco de código.
No VS Code, a extensão *Draw.io Integration* e o preview de Markdown já renderizam
direto.

São seis diagramas, não um por módulo: a maioria dos módulos segue o mesmo
desenho trivial (formulário → server action → tabela) e diagramá-los um a um só
produziria cópias que envelhecem mal. Os seis abaixo são os que carregam decisão
de arquitetura de verdade.

---

## 1. Arquitetura geral

```mermaid
flowchart TB
  subgraph browser["Navegador / PWA instalavel"]
    U1["Admin / Staff"]
    U2["Vendedor"]
    U3["Visitante do catalogo (sem sessao)"]
  end

  subgraph vercel["Next.js 15 App Router (Vercel)"]
    MW["middleware.ts<br/>renova sessao Supabase no cookie"]

    subgraph appgroup["Rotas (app) - exigem sessao"]
      PG["Server Components<br/>paginas: vendas, producao, estoque,<br/>pedidos, precos, relatorios, comissoes..."]
      SA["Server Actions<br/>actions.ts por modulo"]
      RH["Route Handler<br/>relatorios/export (CSV)"]
    end

    subgraph publicgroup["Rotas publicas"]
      CAT["/c/[slug]<br/>catalogo vitrine (anon)"]
      AUTH["/login, /cadastro, /onboarding"]
      ADM["/admin<br/>super-admin"]
    end

    subgraph lib["src/lib - regra de negocio"]
      AUTHLIB["auth.ts<br/>getSessionProfile: org, papel,<br/>capacidades, modulos liberados"]
      QRY["queries.ts<br/>leitura e indicadores"]
      COST["costing.ts<br/>custo medio movel"]
      REV["reversals.ts<br/>estornos com motivo"]
      ORD["orders.ts<br/>ciclo do pedido entre orgs"]
      MOD["modules.ts / signals.ts"]
    end
  end

  subgraph supabase["Supabase"]
    AUTHSVC["Auth<br/>JWT + cookie"]
    DB[("Postgres<br/>RLS em toda tabela<br/>my_org_id() / platform_admins")]
    ST["Storage<br/>bucket product-photos<br/>leitura publica, escrita por org"]
  end

  U1 --> MW
  U2 --> MW
  U3 --> CAT
  MW --> appgroup
  MW --> publicgroup

  PG --> QRY
  SA --> COST
  SA --> REV
  SA --> ORD
  RH --> QRY
  PG --> AUTHLIB
  SA --> AUTHLIB
  AUTHLIB --> MOD

  QRY -->|"chave anon + JWT do usuario"| DB
  COST --> DB
  REV --> DB
  ORD --> DB
  AUTHLIB --> AUTHSVC
  CAT -->|"papel anon, so vitrine"| DB
  ADM -->|"service role<br/>unico caminho que ignora RLS"| DB
  U1 -->|"upload direto do client"| ST
  CAT --> ST
```

---

## 2. Autorização e multi-tenant

Os dois eixos independentes fixados na Parte M: **módulo liberado** é o que a
organização contratou, **papel** é o que a pessoa enxerga dentro disso. O gate de
módulo é de interface; quem decide de verdade é a RLS no Postgres.

```mermaid
sequenceDiagram
  autonumber
  participant B as Navegador
  participant MW as middleware.ts
  participant P as Pagina / Server Action
  participant A as auth.ts getSessionProfile
  participant N as Nav / modules.ts
  participant PG as Postgres (RLS)

  B->>MW: request com cookie de sessao
  MW->>MW: renova token Supabase, grava cookie
  MW-->>B: redireciona pra /login se nao ha sessao
  MW->>P: segue pra rota
  P->>A: quem e esse usuario?
  A->>PG: profiles + organizations do auth.uid()
  PG-->>A: org, papel (admin/staff/vendedor)
  A->>PG: partnerships ativas -> capacidades
  A->>PG: org_modules (so as excecoes enabled=false)
  PG-->>A: conjunto de modulos bloqueados
  A-->>P: profile { org, role, capabilities, disabledModules }

  Note over N: Dois eixos independentes<br/>1. modulo liberado = o que a ORGANIZACAO contratou<br/>2. papel = o que a PESSOA ve dentro disso
  P->>N: monta menu
  N-->>B: so itens com capacidade E modulo E papel

  P->>PG: query com chave anon + JWT do usuario
  Note over PG: RLS decide de verdade:<br/>org_id = my_org_id()<br/>o gate de modulo acima e so de interface
  PG-->>P: apenas linhas da propria organizacao
  P-->>B: HTML renderizado no servidor

  Note over P,PG: Excecao unica: /admin usa service role<br/>(ignora RLS) e checa platform_admins na mao
```

---

## 3. Fluxo de venda (PDV e lista), com comissão, taxa, prazo e estorno

```mermaid
flowchart TD
  START["Vendedor abre /vendas"] --> MODE{"Qual modo?"}
  MODE -->|"lista digitavel"| F1["NewSaleForm<br/>bom pra atacado, muitos SKUs"]
  MODE -->|"PDV em grade"| F2["PDVForm<br/>foto + carrinho, bom pra varejo"]
  F1 --> SUB["mesmo contrato de submit:<br/>variant_id[], qty[], unit_price[]"]
  F2 --> SUB
  SUB --> ACT["createSaleAction"]

  ACT --> V1{"sessao valida<br/>e tem itens?"}
  V1 -->|nao| ERR["retorna { error }<br/>ConfirmDialog mostra o motivo"]
  V1 -->|sim| PRICE["preco por canal<br/>atacado x varejo<br/>org_variant_prices"]

  PRICE --> COM["comissao CONGELADA<br/>total x commission_rate_bp do vendedor"]
  COM --> PAY{"forma de pagamento<br/>tem taxa?"}
  PAY -->|"cartao 3,5%"| FEE["fee_cents CONGELADO"]
  PAY -->|"dinheiro 0%"| FEE0["fee_cents = 0"]
  FEE --> DEF
  FEE0 --> DEF
  DEF{"forma e a prazo<br/>(is_deferred)?"}
  DEF -->|sim| DUE["due_date do formulario<br/>paid_at = null<br/>vira CONTA A RECEBER"]
  DEF -->|nao| CASH["due_date = null<br/>ja e caixa"]

  DUE --> INS
  CASH --> INS
  INS["insere orders (status delivered)<br/>+ order_items"]
  INS --> MOV["inventory_movements tipo sale<br/>qty negativa, unit_cost = custo medio atual<br/>este e o CMV congelado da venda"]
  MOV --> LOY{"fidelidade ligada<br/>e venda tem contato?"}
  LOY -->|sim| PTS["loyalty_ledger: linha positiva de pontos"]
  LOY -->|nao| DONE
  PTS --> DONE["venda concluida<br/>revalida /vendas, /estoque, /relatorios"]

  DONE --> CANC{"precisou cancelar?"}
  CANC -->|nao| FIM["fim"]
  CANC -->|sim| RV["cancelSaleAction -> reverseSale"]
  RV --> RVCHK{"ja foi revertida?"}
  RVCHK -->|sim| ERR
  RVCHK -->|nao| RVDO["movimentos reversos no ledger<br/>+ reverted_at e reversal_reason"]
  RVDO --> RVEND["nada e apagado:<br/>relatorios filtram reverted_at is null<br/>o historico continua auditavel"]
```

---

## 4. Custo médio móvel: entradas de estoque, produção e estorno

```mermaid
flowchart TD
  subgraph entradas["Tres portas de entrada de estoque"]
    E1["Compra externa<br/>createExternalPurchaseAction"]
    E2["Producao propria<br/>CompleteBatchForm"]
    E3["Pedido recebido de parceiro<br/>status vira delivered"]
  end

  E2 --> REC{"variacao tem receita<br/>cadastrada?"}
  REC -->|sim| CONS["consome insumos<br/>raw_material_movements<br/>custo dos insumos entra no lote"]
  REC -->|nao| SEMREC["custo informado na mao no lote"]
  CONS --> LOTE
  SEMREC --> LOTE
  LOTE["production_batches concluido<br/>qty_received, validade, etapa"]

  E1 --> LEDGER
  LOTE --> LEDGER
  E3 --> LEDGER
  LEDGER["inventory_movements<br/>ledger append-only, nunca editado<br/>tipos: purchase, production, sale, loss, reversal"]

  LEDGER --> RECALC["costing.ts recalcVariantCost"]
  RECALC --> VC[("variant_costs<br/>qty em estoque + custo medio movel<br/>(media ponderada, recalculada em ordem cronologica)")]

  VC --> USO1["venda: CMV congelado no movimento"]
  VC --> USO2["/estoque: valor do estoque a custo"]
  VC --> USO3["/relatorios: lucro bruto = receita - CMV"]
  VC --> USO4["/precos: sugestao de margem"]

  LEDGER --> REVQ{"precisa estornar<br/>uma entrada?"}
  REVQ --> CHK["canRevertBatch / reverseExternalPurchase"]
  CHK --> R1{"o que entrou<br/>ainda esta em estoque?"}
  R1 -->|"com lote: qty_remaining = qty_received"| OK["pode estornar"]
  R1 -->|"sem lote: variant_costs.qty >= qty produzida"| OK
  R1 -->|"ja foi vendido"| NAO["NAO pode estornar<br/>o botao nem aparece<br/>a tela explica o motivo"]
  OK --> RDO["movimento reverso + reverted_at<br/>recalcVariantCost roda de novo"]
  RDO --> VC
```

---

## 5. Pedido entre organizações (fornecedor ↔ comprador)

```mermaid
stateDiagram-v2
  direction TB
  [*] --> pending: comprador cria o pedido<br/>createOrderAction<br/>(so com parceria ativa)

  pending --> accepted: fornecedor aceita<br/>decided_at gravado
  pending --> cancelled: fornecedor recusa<br/>ou comprador desiste

  accepted --> delivered: fornecedor marca entregue
  accepted --> cancelled: cancelado antes de entregar

  state delivered {
    direction LR
    [*] --> dois_lados
    dois_lados: Um unico evento move estoque nas DUAS organizacoes
    dois_lados --> forn: fornecedor:<br/>inventory_movements tipo sale<br/>baixa estoque e vira receita
    dois_lados --> comp: comprador:<br/>inventory_movements tipo purchase<br/>entra estoque e recalcula custo medio
  }

  delivered --> aberto_a_prazo: forma de pagamento a prazo<br/>due_date definido, paid_at null
  delivered --> [*]: a vista, ja e caixa nos dois lados

  aberto_a_prazo --> liquidado: qualquer um dos dois lados<br/>marca como pago (Parte AC)
  liquidado --> [*]

  note right of aberto_a_prazo
    Mesmo registro, duas leituras:
    fornecedor ve CONTA A RECEBER
    comprador ve CONTA A PAGAR
    paid_at e um fato so, nao dois saldos
  end note

  note right of cancelled
    Cancelamento nunca apaga linha:
    reverted_at + reversal_reason,
    movimentos reversos no ledger
  end note
```

---

## 6. Financeiro: competência x caixa

A separação que sustenta os relatórios inteiros. Receita conta no momento da
venda; dinheiro conta quando entra de fato. Compra externa não é despesa — vira
estoque e só vira custo quando a mercadoria é vendida.

```mermaid
flowchart LR
  subgraph fonte["Eventos do dia a dia"]
    V["Venda entregue<br/>orders status delivered"]
    C["Compra externa"]
    D["Despesa lancada"]
    CO["Comissao acumulada<br/>congelada por venda"]
  end

  subgraph comp["REGIME DE COMPETENCIA - o resultado"]
    REC["Receita<br/>conta na hora da venda,<br/>mesmo se o dinheiro ainda nao entrou"]
    CMV["CMV<br/>custo medio congelado no movimento"]
    LB["Lucro bruto = Receita - CMV"]
    DESP["Despesas do periodo<br/>cost_type fixed / variable"]
    TX["Taxas de pagamento (fee_cents)"]
    LL["Lucro liquido = Lucro bruto - despesas - taxas"]
    PE["Ponto de equilibrio<br/>custos fixos / margem de contribuicao"]
  end

  subgraph caixa["REGIME DE CAIXA - o dinheiro"]
    CIN["Caixa que entrou (cashIn)<br/>venda a vista no periodo<br/>+ venda a prazo PAGA no periodo"]
    COUT["Caixa que saiu (cashOut)<br/>compra/despesa a vista no periodo<br/>+ compra/despesa a prazo PAGA no periodo<br/>+ taxas"]
    SALDO["Fluxo de caixa = entrou - saiu"]
  end

  subgraph pend["EM ABERTO - /relatorios"]
    AR["Contas a receber<br/>vendas e pedidos a prazo<br/>due_date definido, paid_at null"]
    AP["Contas a pagar<br/>pedido como comprador<br/>+ compra externa + despesa a prazo"]
  end

  V --> REC
  V --> CMV
  V --> TX
  V --> CO
  REC --> LB
  CMV --> LB
  LB --> LL
  D --> DESP --> LL
  TX --> LL
  DESP --> PE
  LB --> PE

  V -->|"a vista"| CIN
  V -->|"a prazo"| AR
  AR -->|"marcou como recebido"| CIN

  C -->|"a vista"| COUT
  D -->|"a vista"| COUT
  C -->|"a prazo"| AP
  D -->|"a prazo"| AP
  AP -->|"marcou como pago"| COUT

  CO -->|"registrar pagamento<br/>vira despesa de verdade"| D

  CIN --> SALDO
  COUT --> SALDO

  C -.->|"compra NAO e despesa:<br/>vira estoque e so vira custo<br/>quando a mercadoria e vendida"| CMV
```
