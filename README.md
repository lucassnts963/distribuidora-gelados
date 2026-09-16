# Giro

Fabricante, distribuidores e clientes — girando juntos. Sistema web para uma
cadeia de fabricante → distribuidores → clientes, onde
qualquer organização pode fabricar, revender, ter clientes próprios, ou as
três coisas ao mesmo tempo — não existe um "tipo" fixo de organização, os
módulos aparecem conforme cada uma passa a usá-los.

Banco de dados Postgres via Supabase (schema `public`, nomes de
tabelas/colunas em inglês), autenticação real por usuário (Supabase Auth),
interface em português, mobile-first e instalável como PWA.

---

## O que cada organização pode fazer

- **Produção**: cadastro de produtos e variações (com campos personalizados
  configuráveis), insumos (entrada/saída), lotes de produção, capacidade
  produtiva, estoque de produto acabado com validade e etapas opcionais.
- **Revenda**: comprar de um fornecedor parceiro ou de fora da cadeia
  (compra externa), vender no atacado/varejo (contato sem login ou venda
  avulsa), preço próprio por variação, custo médio ponderado móvel,
  despesas, relatório do mês (receita, CMV, lucro bruto/líquido, caixa).
- **Rede**: propor parceria (fornecedor ↔ comprador) por código de convite,
  aceitar/recusar, ver a disponibilidade (sem custo) do estoque de um
  parceiro fornecedor.
- **Pedidos**: comprador solicita, fornecedor aceita → separa → despacha
  (baixa o próprio estoque), comprador confirma recebimento (dá entrada no
  próprio estoque). Pedido pra alguém sem login no sistema é lançado direto
  pelo vendedor.

Cada organização só vê o que é seu, mais a disponibilidade (não o custo, os
insumos, nem a capacidade produtiva) de quem tem parceria ativa com ela —
tudo reforçado por Row Level Security no Postgres, não só na aplicação.

## Rodando local

```bash
npm install
cp .env.example .env       # os valores do Supabase já vêm preenchidos
npm run dev                # http://localhost:3000
```

Crie uma conta em `/cadastro`, depois uma organização em `/onboarding`.

## Custo médio ponderado móvel

Mesma lógica e mesmos números do app original (ver `src/lib/costing.ts`):
custo médio real, não a média simples das compras — cada saída (venda,
perda, ajuste) sai pelo custo médio vigente naquele momento, congelado no
próprio movimento. Uma compra com data retroativa reprocessa tudo
cronologicamente e recalcula o custo das saídas posteriores automaticamente.

```bash
SUPABASE_SERVICE_ROLE_KEY=<pegue em Project Settings > API> npm run test:custo
```

(A service role bypassa RLS só pra montar o cenário de teste — a lógica
testada é a mesma usada pela aplicação em produção.)

## Checklist de teste manual

Não há um e2e automatizado nesta entrega (ver nota abaixo). Sugestão de
roteiro pra validar o fluxo inteiro, em duas contas diferentes (ex: duas
abas anônimas) representando um fabricante e um distribuidor parceiro:

**Conta A (fabricante)**
1. `/cadastro` → `/onboarding`, criar organização "Fabricante Teste".
2. `/produtos` → criar produto, adicionar variação.
3. `/produtos/campos` → criar um campo personalizado (ex: validade padrão),
   voltar em `/produtos/<id>` e preencher o valor.
4. `/insumos` → cadastrar insumo, lançar entrada.
5. `/producao` → planejar lote, iniciar, concluir (com lote/validade),
   conferir em `/estoque` que o saldo e a validade aparecem.
6. `/estoque` → avançar a etapa do lote, lançar uma perda pequena e conferir
   que o saldo desconta.
7. `/config` → copiar o **código de convite**. Na seção "Equipe", convidar
   um segundo usuário (nome + email + papel) e conferir que o email de
   convite chega (depende do SMTP configurado no projeto Supabase).

**Conta B (distribuidor)**
8. Criar organização "Distribuidor Teste".
9. `/parcerias` → colar o código de convite da Conta A, escolher "vou
   comprar dele", propor.

**Conta A**
10. `/parcerias` → aceitar a parceria pendente.

**Conta B**
11. `/pedidos` → conferir que o fornecedor aparece em "Novo pedido" com a
    disponibilidade da Conta A, solicitar um pedido.

**Conta A**
12. `/pedidos` → aceitar → iniciar separação → despachar. Conferir que o
    próprio estoque (`/estoque`) baixou.

**Conta B**
13. `/pedidos` → confirmar recebimento. Conferir que o estoque
    (`orgStock`, aparece em `/vendas` ao montar uma venda) subiu.
14. `/precos` → definir preço de atacado/varejo pra variação recebida.
15. `/contatos` → cadastrar um cliente.
16. `/vendas` → vender pro contato, conferir custo médio e total.
17. `/despesas` → lançar uma despesa.
18. `/relatorios` → conferir receita, CMV, lucro e disponibilidade do
    fornecedor parceiro (sem aparecer custo/insumos da Conta A).

**Multi-tenant (o que NÃO deve funcionar)**
19. Confirmar que a Conta B não vê `/producao`, `/insumos` nem o custo dos
    movimentos da Conta A — só a disponibilidade em `/pedidos`/`/relatorios`.
20. Criar uma terceira organização sem nenhuma parceria e confirmar que ela
    não vê nada das outras duas.

> **Nota de ambiente**: esta reescrita foi desenvolvida numa sessão sem
> acesso de rede direto ao Supabase (só via ferramentas MCP) — build e
> typecheck passam limpos e cada query foi conferida manualmente contra o
> schema real, mas o fluxo acima ainda não foi clicado de ponta a ponta.
> Você é o primeiro teste real end-to-end.

## PWA

`npm run icons` regenera os ícones em `public/icons/` (script
`scripts/generate-icons.mjs`) se o desenho mudar. Manifest e service worker
já configurados — instale pelo navegador (Chrome/Safari → "Adicionar à tela
de início").

## Docker Compose

```bash
docker compose up -d --build
```

Só builda a aplicação — o banco é o Supabase gerenciado, não tem volume
local. Veja `docker-compose.yml`/`Dockerfile`. Primeira versão do deploy
real é na Vercel; o Docker Compose fica pronto pra uma futura VPS própria.

## Deploy na Vercel

A integração usada nesta sessão não tinha permissão pra criar o projeto
direto (erro 403), então falta esse passo manual:

1. [vercel.com/new](https://vercel.com/new) → importar `lucassnts963/distribuidora-gelados` (o framework Next.js é detectado sozinho).
2. Antes de clicar em Deploy, decidir o **branch de produção**: por padrão a Vercel usa `main`, mas o código novo (essa reescrita inteira) está em `claude/supabase-multi-tenant` — `main` ainda está vazio/desatualizado. Ou muda a branch de produção do projeto nas configurações da Vercel pra `claude/supabase-multi-tenant`, ou faz o merge desse branch em `main` primeiro (há também um PR #1 antigo, da versão SQLite anterior — provavelmente vale fechar ele já que essa reescrita o substitui).
3. Em **Environment Variables**, adicionar (Production e Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://gluwyubhmdxwafgotaxa.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_fZX5eRDyNTT8bsVq9kVqnA_XNyZ_ZXn`
   - `SUPABASE_SERVICE_ROLE_KEY` = (pegue em Project Settings → API do Supabase; **obrigatória** — usada pela tela de convite de colega em Config > Equipe)
4. Deploy. Depois disso, todo push no branch de produção redeploya sozinho.
