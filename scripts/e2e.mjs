import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const log = [];
const ok = (m) => log.push("PASS " + m);
const fail = (m) => { log.push("FAIL " + m); process.exitCode = 1; };

process.on("uncaughtException", (e) => { console.log(log.join("\n")); console.log("CRASH:", e.message.split("\n")[0]); process.exit(1); });
const b = await chromium.launch({ ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("response", (r) => { if (r.status() >= 500) errs.push(`HTTP ${r.status()} ${r.url()}`); });

// 1. redireciona para login
await p.goto(BASE + "/", { waitUntil: "networkidle" });
p.url().includes("/login") ? ok("redireciona para /login sem sessao") : fail("nao protegeu a raiz");

// 2. senha errada
await p.fill('input[name=password]', "errada");
await p.click("button:has-text('Entrar')");
await p.waitForTimeout(800);
p.url().includes("/login") ? ok("senha errada nao entra") : fail("senha errada entrou!");

// 3. login
await p.fill('input[name=password]', "segredo123");
await p.click("button:has-text('Entrar')");
await p.waitForURL(BASE + "/", { timeout: 15000 });
ok("login funciona");

// 4. cadastrar produto
await p.goto(BASE + "/produtos", { waitUntil: "networkidle" });
await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
await p.fill('input[name=name]', "Laranjinha");
await p.fill('input[name=cost]', "1,50");
await p.fill('input[name=wholesale]', "2,00");
await p.fill('input[name=retail]', "3,00");
await p.click("button:has-text('Salvar produto')");
await p.waitForTimeout(1500);
(await p.content()).includes("Laranjinha") ? ok("produto criado") : fail("produto nao apareceu");
(await p.content()).includes("R$&nbsp;1,50") || (await p.content()).includes("1,50") ? ok("preco padrao gravado") : fail("preco nao gravado");

// 5. cadastrar dois sabores
for (const s of ["Uva", "Abacaxi"]) {
  await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
  await p.fill('form:has(input[name=product_id]) input[name=name]', s);
  await p.click("button:has-text('Salvar sabor')");
  await p.waitForTimeout(1200);
}
const html1 = await p.content();
html1.includes("Uva") && html1.includes("Abacaxi") ? ok("dois sabores criados") : fail("sabores nao criados");
html1.includes("lucro") ? ok("mostra lucro por sabor") : fail("sem lucro por sabor");

// 6. compra: entrada de 100 Uva + 50 Abacaxi
await p.goto(BASE + "/compras/nova", { waitUntil: "networkidle" });
const qtyInputs = p.locator('input[inputmode=numeric]');
await qtyInputs.nth(0).fill("100");
await qtyInputs.nth(1).fill("50");
await p.fill('input[name=supplier]', "Fornecedor A");
await p.click("button:has-text('Registrar entrada')");
await p.waitForURL(/\/compras$/, { timeout: 15000 });
(await p.content()).includes("Fornecedor A") ? ok("compra registrada") : fail("compra nao registrada");
(await p.content()).includes("225,00") ? ok("total da compra = R$225,00 (150x1,50)") : fail("total da compra errado: " + (await p.content()).match(/R\$[^<]*/g)?.slice(0,5));

// 7. estoque reflete a entrada
await p.goto(BASE + "/estoque", { waitUntil: "networkidle" });
const st = await p.content();
st.includes(">150<") ? ok("estoque total 150 un") : fail("estoque total errado");

// 8. venda no atacado: 40 Uva
await p.goto(BASE + "/vendas/nova", { waitUntil: "networkidle" });
const saleQty = p.locator('input[inputmode=numeric]');
await saleQty.nth(0).fill("40");
await p.waitForTimeout(400);
const footer = await p.locator("text=lucro").first().textContent();
footer.includes("20,00") ? ok("lucro previsto 40x0,50 = R$20,00") : fail("lucro previsto errado: " + footer);
await p.click("button:has-text('Registrar venda')");
await p.waitForURL(/\/vendas$/, { timeout: 15000 });
const vh = await p.content();
vh.includes("80,00") ? ok("venda de R$80,00 registrada") : fail("total da venda errado");
vh.includes("20,00") ? ok("lucro da venda R$20,00") : fail("lucro da venda errado");

// 9. estoque baixou
await p.goto(BASE + "/estoque", { waitUntil: "networkidle" });
const st2 = await p.content();
st2.includes(">110<") ? ok("estoque caiu para 110 un") : fail("estoque nao baixou");

// 9b. venda no VAREJO: 10 Uva a 3,00
await p.goto(BASE + "/vendas/nova", { waitUntil: "networkidle" });
await p.click("button:has-text('Varejo')");
await p.waitForTimeout(300);
await p.locator('input[inputmode=numeric]').nth(1).fill("10");
await p.waitForTimeout(400);
const vf = await p.locator("text=lucro").first().textContent();
vf.includes("15,00") ? ok("varejo: lucro 10x1,50 = R$15,00") : fail("lucro varejo errado: " + vf);
await p.click("button:has-text('Registrar venda')");
await p.waitForURL(/\/vendas$/, { timeout: 15000 });
(await p.content()).includes("varejo") ? ok("venda de varejo registrada") : fail("canal varejo nao gravado");

// 9c. comparacao por canal no painel
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const ch = await p.content();
ch.includes("Atacado x varejo") ? ok("painel compara canais") : fail("sem comparacao de canal");
ch.includes("R$&nbsp;0,50") || ch.includes("0,50") ? ok("lucro/un do atacado = R$0,50") : fail("lucro/un atacado errado");
ch.includes("1,50") ? ok("lucro/un do varejo = R$1,50") : fail("lucro/un varejo errado");
ch.includes("40,00") ? ok("custo de oportunidade do atacado = R$40,00 (40un x R$1,00)") : fail("custo de oportunidade errado");

// 9d. CUSTO MEDIO MOVEL: 2a compra de Abacaxi a preco diferente
// saldo antes: 100 compradas - 40 vendidas = 60 un a R$1,50 (valor 90,00)
// compra 40 a R$2,00 -> (60*150 + 40*200)/100 = (9000+8000)/100 = R$1,70
await p.goto(BASE + "/compras/nova", { waitUntil: "networkidle" });
await p.locator('input[inputmode=decimal]').nth(0).fill("2,00");
await p.locator('input[inputmode=numeric]').nth(0).fill("40");
await p.click("button:has-text('Registrar entrada')");
await p.waitForURL(/\/compras$/, { timeout: 15000 });
await p.goto(BASE + "/estoque", { waitUntil: "networkidle" });
const est = (await p.content()).replace(/<!--.*?-->/g, "");
est.includes("médio R$&nbsp;1,70") || est.includes("médio R$ 1,70") ? ok("custo medio movel = R$1,70 (nao a media simples R$1,75)")
  : fail("custo medio errado: " + (est.match(/médio[^<]*/g) || []).slice(0, 3));
await p.goto(BASE + "/produtos", { waitUntil: "networkidle" });
(await p.content()).includes("vs tabela") ? ok("produtos avisa divergencia tabela x custo real") : fail("sem aviso de divergencia");
await p.goto(BASE + "/", { waitUntil: "networkidle" });
(await p.content()).includes("Custo mudou") ? ok("painel alerta que o custo mudou") : fail("painel nao alertou");

// 10. despesa
await p.goto(BASE + "/despesas", { waitUntil: "networkidle" });
await p.fill('input[name=amount]', "30,00");
await p.fill('input[name=description]', "gasolina");
await p.click("button:has-text('Lançar despesa')");
await p.waitForTimeout(1500);
(await p.content()).includes("gasolina") ? ok("despesa lancada") : fail("despesa nao lancada");

// 11. dashboard: lucro bruto 20, liquido -10, caixa 80-225-30
await p.goto(BASE + "/", { waitUntil: "networkidle" });
const dh = await p.content();
dh.includes("35,00") ? ok("lucro bruto total R$35,00 (20 atacado + 15 varejo)") : fail("lucro bruto total errado");
dh.includes("5,00") ? ok("lucro liquido R$5,00 (35 - 30 de despesa)") : fail("lucro liquido errado");
dh.includes("225,00") ? ok("caixa -225,00 (110 entrou - 335 saiu)") : fail("caixa errado");
dh.includes("40") ? ok("meta de unidades conta so o atacado (40)") : fail("meta contou varejo tambem");
dh.includes("Metas do mês") ? ok("painel mostra meta de lucro e de unidades") : fail("sem metas");

// 12. ajuste de perda
await p.goto(BASE + "/estoque", { waitUntil: "networkidle" });
await p.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
await p.locator('form input[name=qty]').first().fill("10");
await p.locator("button:has-text('Salvar')").first().click();
await p.waitForTimeout(1500);
(await p.content()).includes(">130<") ? ok("perda de 10 baixou estoque para 130") : fail("ajuste nao aplicou");

// 13. relatorios em todos os periodos
for (const q of ["mes", "anterior", "7d", "30d"]) {
  const r = await p.goto(`${BASE}/relatorios?p=${q}`, { waitUntil: "networkidle" });
  r.status() === 200 ? ok("relatorios?p=" + q + " renderiza") : fail("relatorios " + q + " status " + r.status());
}
(await p.content()).includes("Ranking de sabores") ? ok("ranking presente") : fail("sem ranking");

// 14. clientes e config
for (const path of ["/clientes", "/config", "/vendas", "/compras", "/produtos"]) {
  const r = await p.goto(BASE + path, { waitUntil: "networkidle" });
  r.status() === 200 ? ok(path + " ok") : fail(path + " status " + r.status());
}

// 15. logout
await p.goto(BASE + "/config", { waitUntil: "networkidle" });
await p.click("button:has-text('Sair')");
await p.waitForTimeout(1200);
p.url().includes("/login") ? ok("logout funciona") : fail("logout falhou");

await b.close();
if (errs.length) { log.push("ERROS DE RUNTIME:"); errs.forEach((e) => log.push("  " + e)); process.exitCode = 1; }
console.log(log.join("\n"));
console.log("\n" + log.filter(l=>l.startsWith("PASS")).length + " passaram, " + log.filter(l=>l.startsWith("FAIL")).length + " falharam");
