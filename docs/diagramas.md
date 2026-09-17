# Diagramas do Giro

Fonte dos diagramas em Mermaid. Para abrir no draw.io: **Extras → Edit Diagram**
ou **Arrange → Insert → Advanced → Mermaid**, e colar o bloco de código.
No VS Code, a extensão *Draw.io Integration* e o preview de Markdown já renderizam
direto.

Dois blocos: **fluxos** (seis diagramas, coloridos por papel semântico — decisão em
âmbar, dado/tabela em roxo/verde, bloqueio em vermelho, sucesso em verde) e
**schema** (quatro ER, um por domínio — um ER único com as 26 tabelas do banco
seria ilegível numa página só).

Não é um diagrama por módulo: a maioria segue o mesmo desenho trivial
(formulário → server action → tabela) e diagramá-los um a um só produziria
cópias que envelhecem mal. Os seis fluxos abaixo são os que carregam decisão de
arquitetura de verdade.

---

## Fluxos

### 1. Arquitetura geral

Camadas de cima para baixo: cliente → middleware → App Router → camada de regras
(`src/lib`) → Supabase. Roxo = App Router, verde-água = `src/lib`, verde = Supabase,
vermelho = o único caminho que ignora RLS (`/admin`, service role).

```mermaid
flowchart TB
  subgraph L1["Cliente"]
    direction LR
    U1["Usuario autenticado<br/>(admin, staff, vendedor)"]
    U2["Visitante do catalogo<br/>(sem sessao)"]
  end

  MW["middleware.ts<br/>renova sessao no cookie"]

  subgraph L2["Next.js App Router"]
    direction LR
    APP["Paginas + Server Actions<br/>grupo (app) - exige sessao<br/>vendas, producao, estoque, pedidos,<br/>precos, relatorios, comissoes..."]
    PUB["Rotas publicas<br/>catalogo, login, cadastro"]
    ADM["/admin<br/>super-admin"]
  end

  LIB["Camada de regras - src/lib<br/>auth.ts, queries.ts, costing.ts,<br/>reversals.ts, orders.ts, modules.ts"]

  subgraph L3["Supabase"]
    direction LR
    AUTHSVC["Auth<br/>JWT + cookie"]
    DB[("Postgres<br/>RLS em toda tabela")]
    ST["Storage<br/>fotos de produto"]
  end

  U1 --> MW --> APP
  U2 --> PUB
  APP --> LIB
  PUB -->|"leitura anonima, so vitrine"| DB
  ADM -.->|"service role<br/>ignora RLS (excecao unica)"| DB
  LIB -->|"JWT do usuario"| DB
  MW --> AUTHSVC
  U1 -.->|"upload direto do client"| ST
  PUB --> ST

  classDef client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#0d3c73
  classDef gate fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#7a5c00
  classDef app fill:#ede7f6,stroke:#5e35b1,stroke-width:2px,color:#33206b
  classDef admin fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#7f0000
  classDef lib fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#003d33
  classDef data fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b3a1e

  class U1,U2 client
  class MW gate
  class APP,PUB app
  class ADM admin
  class LIB lib
  class AUTHSVC,DB,ST data

  style L1 fill:#f5f9ff,stroke:#90caf9
  style L2 fill:#f6f3fb,stroke:#b39ddb
  style L3 fill:#f1f8f2,stroke:#a5d6a7
```

---

### 2. Autorização e multi-tenant

Os dois eixos independentes fixados na Parte M: **módulo liberado** é o que a
organização contratou, **papel** é o que a pessoa enxerga dentro disso. O gate de
módulo é de interface; quem decide de verdade é a RLS no Postgres. Cada faixa
colorida é uma etapa: azul = sessão, roxo = resolução de perfil, âmbar = o gate
de dois eixos, verde = RLS decidindo de verdade, vermelho = a única exceção.

```mermaid
sequenceDiagram
  autonumber
  participant B as Navegador
  participant MW as middleware.ts
  participant P as Pagina / Server Action
  participant A as auth.ts
  participant N as Nav / modules.ts
  participant PG as Postgres (RLS)

  rect rgb(227, 242, 253)
  B->>MW: request com cookie de sessao
  MW->>MW: renova token Supabase, grava cookie
  MW-->>B: redireciona pra /login se nao ha sessao
  MW->>P: segue pra rota
  end

  rect rgb(237, 231, 246)
  P->>A: quem e esse usuario?
  A->>PG: profiles + organizations do auth.uid()
  PG-->>A: org, papel (admin/staff/vendedor)
  A->>PG: partnerships ativas -> capacidades
  A->>PG: org_modules (so as excecoes enabled=false)
  PG-->>A: conjunto de modulos bloqueados
  A-->>P: profile { org, role, capabilities, disabledModules }
  end

  rect rgb(255, 248, 225)
  Note over N: Dois eixos independentes<br/>1. modulo liberado = o que a ORGANIZACAO contratou<br/>2. papel = o que a PESSOA ve dentro disso
  P->>N: monta menu
  N-->>B: so itens com capacidade E modulo E papel
  end

  rect rgb(232, 245, 233)
  P->>PG: query com chave anon + JWT do usuario
  Note over PG: RLS decide de verdade:<br/>org_id = my_org_id()<br/>o gate de modulo acima e so de interface
  PG-->>P: apenas linhas da propria organizacao
  P-->>B: HTML renderizado no servidor
  end

  rect rgb(255, 235, 238)
  Note over P,PG: Excecao unica: /admin usa service role<br/>(ignora RLS) e checa platform_admins na mao
  end
```

---

### 3. Fluxo de venda (PDV e lista), com comissão, taxa, prazo e estorno

Azul = entrada, âmbar = decisão, roxo = processamento/congelamento de valor,
verde-água = gravação no ledger, verde = sucesso, vermelho = erro/bloqueio.

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

  PRICE --> COM["comissao CONGELADA<br/>total x commission_rate_bp"]
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
  INS --> MOV["inventory_movements tipo sale<br/>qty negativa, unit_cost = custo medio<br/>este e o CMV congelado"]
  MOV --> LOY{"fidelidade ligada<br/>e venda tem contato?"}
  LOY -->|sim| PTS["loyalty_ledger:<br/>linha positiva de pontos"]
  LOY -->|nao| DONE
  PTS --> DONE["venda concluida<br/>revalida vendas, estoque, relatorios"]

  DONE --> CANC{"precisou cancelar?"}
  CANC -->|nao| FIM["fim"]
  CANC -->|sim| RV["cancelSaleAction -> reverseSale"]
  RV --> RVCHK{"ja foi revertida?"}
  RVCHK -->|sim| ERR
  RVCHK -->|nao| RVDO["movimentos reversos no ledger<br/>+ reverted_at e reversal_reason"]
  RVDO --> RVEND["nada e apagado:<br/>relatorios filtram reverted_at is null"]

  classDef startNode fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#0d3c73
  classDef decision fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#7a5c00
  classDef process fill:#ede7f6,stroke:#5e35b1,stroke-width:2px,color:#33206b
  classDef data fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#003d33
  classDef success fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b3a1e
  classDef error fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#7f0000

  class START,F1,F2,SUB startNode
  class MODE,V1,PAY,DEF,LOY,CANC,RVCHK decision
  class PRICE,COM,FEE,FEE0,DUE,CASH,RV,RVDO process
  class INS,MOV,PTS data
  class DONE,FIM,RVEND success
  class ERR error
```

---

### 4. Custo médio móvel: entradas de estoque, produção e estorno

Azul = as três portas de entrada, verde-água = ledger e custo, verde = quem
consome o custo médio, vermelho = bloqueio de estorno.

```mermaid
flowchart TD
  subgraph entradas["Tres portas de entrada de estoque"]
    E1["Compra externa<br/>createExternalPurchaseAction"]
    E2["Producao propria<br/>CompleteBatchForm"]
    E3["Pedido recebido de parceiro<br/>status vira delivered"]
  end

  E2 --> REC{"variacao tem receita<br/>cadastrada?"}
  REC -->|sim| CONS["consome insumos<br/>raw_material_movements"]
  REC -->|nao| SEMREC["custo informado na mao"]
  CONS --> LOTE
  SEMREC --> LOTE
  LOTE["production_batches concluido<br/>qty_received, validade, etapa"]

  E1 --> LEDGER
  LOTE --> LEDGER
  E3 --> LEDGER
  LEDGER["inventory_movements<br/>ledger append-only, nunca editado"]

  LEDGER --> RECALC["costing.ts<br/>recalcVariantCost"]
  RECALC --> VC[("variant_costs<br/>qty + custo medio movel")]

  VC --> USO1["venda: CMV congelado"]
  VC --> USO2["/estoque: valor a custo"]
  VC --> USO3["/relatorios: lucro bruto"]
  VC --> USO4["/precos: sugestao de margem"]

  LEDGER --> REVQ{"precisa estornar<br/>uma entrada?"}
  REVQ --> CHK["canRevertBatch /<br/>reverseExternalPurchase"]
  CHK --> R1{"o que entrou<br/>ainda esta em estoque?"}
  R1 -->|"sim"| OK["pode estornar"]
  R1 -->|"ja foi vendido"| NAO["NAO pode estornar<br/>botao nem aparece"]
  OK --> RDO["movimento reverso + reverted_at<br/>recalcVariantCost roda de novo"]
  RDO --> VC

  classDef entrada fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#0d3c73
  classDef decision fill:#fff8e1,stroke:#f9a825,stroke-width:2px,color:#7a5c00
  classDef process fill:#ede7f6,stroke:#5e35b1,stroke-width:2px,color:#33206b
  classDef ledger fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#003d33
  classDef uso fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b3a1e
  classDef blocked fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#7f0000

  class E1,E2,E3 entrada
  class REC,REVQ,R1 decision
  class CONS,SEMREC,LOTE,CHK,OK,RDO process
  class LEDGER,RECALC,VC ledger
  class USO1,USO2,USO3,USO4 uso
  class NAO blocked

  style entradas fill:#f5f9ff,stroke:#90caf9
```

---

### 5. Pedido entre organizações (fornecedor ↔ comprador)

Âmbar = em negociação, roxo = liquidação pendente, verde = resolvido/entregue,
vermelho = cancelado.

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
    dois_lados --> forn: fornecedor - inventory_movements sale<br/>baixa estoque, vira receita
    dois_lados --> comp: comprador - inventory_movements purchase<br/>entra estoque, recalcula custo medio
  }

  delivered --> aberto_a_prazo: forma de pagamento a prazo<br/>due_date definido, paid_at null
  delivered --> [*]: a vista, ja e caixa nos dois lados

  aberto_a_prazo --> liquidado: qualquer um dos dois lados<br/>marca como pago
  liquidado --> [*]

  note right of aberto_a_prazo
    Mesmo registro, duas leituras
    fornecedor ve CONTA A RECEBER
    comprador ve CONTA A PAGAR
  end note

  note right of cancelled
    Nunca apaga linha
    reverted_at + reversal_reason
  end note

  classDef pendingState fill:#fff8e1,stroke:#f9a825,color:#7a5c00
  classDef okState fill:#e8f5e9,stroke:#2e7d32,color:#1b3a1e
  classDef blockedState fill:#ffebee,stroke:#c62828,color:#7f0000
  classDef openState fill:#ede7f6,stroke:#5e35b1,color:#33206b

  class pending pendingState
  class accepted pendingState
  class delivered okState
  class cancelled blockedState
  class aberto_a_prazo openState
  class liquidado okState
```

---

### 6. Financeiro: competência x caixa

A separação que sustenta os relatórios inteiros. Receita conta no momento da
venda; dinheiro conta quando entra de fato. Compra externa não é despesa — vira
estoque e só vira custo quando a mercadoria é vendida. Azul = eventos, roxo =
regime de competência, verde = regime de caixa, âmbar = em aberto.

```mermaid
flowchart LR
  subgraph fonte["Eventos do dia a dia"]
    V["Venda entregue<br/>orders status delivered"]
    C["Compra externa"]
    D["Despesa lancada"]
    CO["Comissao acumulada<br/>congelada por venda"]
  end

  subgraph comp["REGIME DE COMPETENCIA - o resultado"]
    REC["Receita<br/>conta na hora da venda"]
    CMV["CMV<br/>custo medio congelado"]
    LB["Lucro bruto = Receita - CMV"]
    DESP["Despesas do periodo<br/>fixed / variable"]
    TX["Taxas de pagamento"]
    LL["Lucro liquido"]
    PE["Ponto de equilibrio"]
  end

  subgraph caixa["REGIME DE CAIXA - o dinheiro"]
    CIN["Caixa que entrou"]
    COUT["Caixa que saiu"]
    SALDO["Fluxo de caixa"]
  end

  subgraph pend["EM ABERTO - relatorios"]
    AR["Contas a receber"]
    AP["Contas a pagar"]
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

  CO -->|"registrar pagamento"| D

  CIN --> SALDO
  COUT --> SALDO

  C -.->|"NAO e despesa:<br/>vira custo so quando vendida"| CMV

  classDef fonteN fill:#e3f2fd,stroke:#1565c0,color:#0d3c73
  classDef compN fill:#ede7f6,stroke:#5e35b1,color:#33206b
  classDef caixaN fill:#e8f5e9,stroke:#2e7d32,color:#1b3a1e
  classDef pendN fill:#fff8e1,stroke:#f9a825,color:#7a5c00

  class V,C,D,CO fonteN
  class REC,CMV,LB,DESP,TX,LL,PE compN
  class CIN,COUT,SALDO caixaN
  class AR,AP pendN

  style fonte fill:#f5f9ff,stroke:#90caf9
  style comp fill:#f6f3fb,stroke:#b39ddb
  style caixa fill:#f1f8f2,stroke:#a5d6a7
  style pend fill:#fffdf5,stroke:#ffd54f
```

---

## Schema (ER por domínio)

Extraído direto do banco (`information_schema`) em 2026-09-17 — reflete as
migrations até a Parte AC. 26 tabelas no total, divididas em 4 domínios pra
cada ER caber numa página. Campos mostrados são os relevantes pra entender a
relação; nem toda coluna aparece (ex.: `created_at` é omitido quando não muda o
desenho).

### A. Identidade, acesso e parcerias

`organizations` é a raiz de tudo — toda outra tabela do sistema tem `org_id`
(direto ou via join) apontando pra cá, com RLS isolando por `org_id = my_org_id()`.
`platform_admins` não tem FK formal (referencia `auth.users`, fora do schema
`public`) — é a lista que dá acesso ao `/admin` via service role.

```mermaid
erDiagram
    organizations {
        uuid id PK
        text name
        text document
        text invite_code
        boolean active
        text plan
        text logo_url
        text catalog_slug
    }
    profiles {
        uuid id PK
        uuid org_id FK
        text role
        text full_name
        integer commission_rate_bp
    }
    platform_admins {
        uuid user_id PK
    }
    partnerships {
        uuid id PK
        uuid supplier_org_id FK
        uuid buyer_org_id FK
        text status
        integer lead_time_days
    }
    org_modules {
        uuid org_id FK
        text module PK
        boolean enabled
    }
    org_settings {
        uuid org_id FK
        text key PK
        text value
    }

    organizations ||--o{ profiles : "tem membros"
    organizations ||--o{ org_modules : "modulos liberados (excecoes)"
    organizations ||--o{ org_settings : "configuracoes"
    organizations ||--o{ partnerships : "e fornecedor em"
    organizations ||--o{ partnerships : "e comprador em"
```

### B. Catálogo, insumos e produção

`product_variants` é a unidade real de venda/estoque/custo em todo o sistema —
quase tudo nos outros três domínios referencia `variant_id`, não `product_id`.

```mermaid
erDiagram
    products {
        uuid id PK
        uuid owner_org_id FK
        text name
        text sku
        boolean active
    }
    product_variants {
        uuid id PK
        uuid product_id FK
        text name
        text sku
        text photo_url
        boolean active
    }
    product_custom_fields {
        uuid id PK
        uuid owner_org_id FK
        text key
        text field_type
        boolean required
    }
    product_custom_field_values {
        uuid id PK
        uuid product_id FK
        uuid field_id FK
        jsonb value
    }
    raw_materials {
        uuid id PK
        uuid owner_org_id FK
        text name
        text unit
    }
    raw_material_costs {
        uuid raw_material_id FK
        uuid org_id FK
        integer avg_cost_cents
        numeric qty
    }
    recipe_items {
        uuid id PK
        uuid variant_id FK
        uuid raw_material_id FK
        numeric qty_per_unit
    }
    production_batches {
        uuid id PK
        uuid owner_org_id FK
        uuid product_id FK
        uuid variant_id FK
        numeric produced_qty
        text status
        timestamp reverted_at
    }
    production_capacity_plans {
        uuid id PK
        uuid owner_org_id FK
        uuid variant_id FK
        date period_start
        date period_end
        numeric planned_qty
    }

    products ||--o{ product_variants : "variacoes"
    products ||--o{ product_custom_field_values : "valores"
    product_custom_fields ||--o{ product_custom_field_values : "define"
    raw_materials ||--o{ raw_material_costs : "custo medio"
    raw_materials ||--o{ recipe_items : "usado em"
    product_variants ||--o{ recipe_items : "receita"
    product_variants ||--o{ production_batches : "produzido em"
    product_variants ||--o{ production_capacity_plans : "planejado em"
```

### C. Estoque e custo médio

O núcleo financeiro do sistema: `inventory_movements` é um ledger
append-only (nunca `UPDATE`/`DELETE` de linha existente — estorno é linha nova
apontando via `reverses_movement_id`), e `variant_costs` é o resultado
recalculado a partir dele (`costing.ts`). `variant_id` e `raw_material_id`
apontam pro domínio B; a linha pontilhada indica FK que cruza domínio.

```mermaid
erDiagram
    inventory_lots {
        uuid id PK
        uuid org_id FK
        uuid variant_id "FK - product_variants"
        uuid production_batch_id FK
        uuid source_lot_id FK
        numeric qty_received
        numeric qty_remaining
        integer unit_cost_cents
        date expires_on
    }
    lot_stage_events {
        uuid id PK
        uuid lot_id FK
        text stage
        timestamp entered_at
        timestamp exited_at
    }
    inventory_movements {
        uuid id PK
        uuid org_id FK
        uuid variant_id "FK - product_variants"
        uuid lot_id FK
        text movement_type
        numeric qty
        integer unit_cost_cents
        uuid reference_id "aponta pra order, batch, etc"
        uuid reverses_movement_id FK
    }
    variant_costs {
        uuid variant_id "FK - product_variants, PK"
        uuid org_id FK
        integer avg_cost_cents
        numeric qty
        integer value_cents
    }
    raw_material_movements {
        uuid id PK
        uuid raw_material_id "FK - raw_materials"
        uuid production_batch_id FK
        text direction
        numeric qty
        uuid reverses_movement_id FK
    }

    inventory_lots ||--o{ lot_stage_events : "etapas do lote"
    inventory_lots ||--o{ inventory_movements : "movimenta"
    inventory_lots |o--o{ inventory_lots : "lote de origem (fracionamento)"
    inventory_movements |o--o| inventory_movements : "estorna"
    raw_material_movements |o--o| raw_material_movements : "estorna"
```

### D. Comercial e financeiro

`orders` é compartilhada entre venda a contato (`buyer_contact_id`) e pedido
entre organizações (`buyer_org_id`) — por isso `due_date`/`paid_at`/`commission_cents`/
`fee_cents` servem os dois fluxos ao mesmo tempo, sem duplicar conceito
(Partes N, P, AA, AC). `commission_payouts.expense_id` é o que faz o pagamento
de comissão virar uma despesa de caixa de verdade (Parte AB).

```mermaid
erDiagram
    contacts {
        uuid id PK
        uuid org_id FK
        text name
        text kind
        text phone
    }
    orders {
        uuid id PK
        uuid supplier_org_id FK
        uuid buyer_org_id FK
        uuid buyer_contact_id FK
        uuid payment_method_id FK
        text status
        integer total_cents
        integer commission_cents
        integer fee_cents
        date due_date
        timestamp paid_at
        timestamp reverted_at
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid variant_id "FK - product_variants"
        numeric qty
        integer unit_price_cents
    }
    external_purchases {
        uuid id PK
        uuid org_id FK
        text supplier_name
        integer total_cents
        date due_date
        timestamp paid_at
        timestamp reverted_at
    }
    external_purchase_items {
        uuid id PK
        uuid external_purchase_id FK
        uuid variant_id "FK - product_variants"
        numeric qty
        integer unit_cost_cents
    }
    org_variant_prices {
        uuid org_id FK
        uuid variant_id "FK - product_variants"
        integer wholesale_cents
        integer retail_cents
        numeric min_qty
        boolean active
    }
    payment_methods {
        uuid id PK
        uuid org_id FK
        text name
        numeric fee_percent
        boolean is_deferred
    }
    expenses {
        uuid id PK
        uuid org_id FK
        text category
        integer amount_cents
        text cost_type
        date due_date
        timestamp paid_at
        timestamp reverted_at
    }
    commission_payouts {
        uuid id PK
        uuid org_id FK
        uuid vendor_id "FK - profiles"
        uuid expense_id FK
        integer amount_cents
    }
    loyalty_settings {
        uuid org_id PK
        boolean enabled
        numeric redeem_cents_per_point
    }
    loyalty_ledger {
        uuid id PK
        uuid org_id FK
        uuid contact_id FK
        uuid order_id FK
        numeric points
    }

    contacts ||--o{ orders : "compra como"
    orders ||--o{ order_items : "itens"
    payment_methods ||--o{ orders : "forma de pagamento"
    external_purchases ||--o{ external_purchase_items : "itens"
    contacts ||--o{ loyalty_ledger : "acumula pontos"
    orders |o--o{ loyalty_ledger : "gera pontos"
    expenses ||--o{ commission_payouts : "vira despesa"
```
