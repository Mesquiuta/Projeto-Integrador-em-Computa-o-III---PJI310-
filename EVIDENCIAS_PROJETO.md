# Evidências do Projeto Integrador — UNIVESP

> Material de apoio para o relatório final e para o vídeo de apresentação do PI.
> Tema: **Previsão de produção para redução de desperdícios em padaria**.

---

## 1. Resumo do que foi implementado

O sistema entregue é uma aplicação web completa (frontend + backend) que permite:

| Requisito do PI | Onde está |
|---|---|
| Cadastrar produtos da padaria | Tela "Produtos" + API `/api/products` |
| Registrar vendas por produto, data e período | Tela "Vendas" + API `/api/sales` |
| Registrar produção realizada | Tela "Produção" + API `/api/production` |
| Registrar sobras/perdas | Tela "Sobras / Perdas" + API `/api/waste` |
| Visualizar produtos com maior saída | Dashboard (gráfico de barras) |
| Visualizar desperdício/sobra por produto | Dashboard (gráfico de barras e KPI %) |
| Gerar sugestão de produção para o próximo dia | Tela "Sugestão de Produção" + `/api/recommendations` |
| Painel com indicadores e gráficos | Dashboard (KPIs + 3 gráficos + tabela) |
| Demonstração fácil para banca | Botão "Carregar dados de demonstração" → 30 dias × 8 produtos |
| Projeto rodando sem erro, README claro | `npm install && npm start` + README.md detalhado |

**Stack escolhida (justificada no relatório):**
- Node.js + Express (REST API estável e amplamente documentada)
- Persistência em arquivo JSON local (simples, sem instalação de banco, ideal para demonstração)
- Frontend HTML/CSS/JS puro (zero build step, abre direto no navegador)
- Chart.js via CDN (gráficos legíveis sem configuração)
- Testes com `node:test` nativo (Node 18+)

---

## 2. Prints/telas para capturar no relatório

Sugestão de capturas que evidenciam cada item exigido:

| # | Captura | O que mostrar |
|---|---|---|
| 1 | **Tela do Dashboard com dados carregados** | KPIs (Total Vendido, Produzido, Sobras, % Desperdício), gráfico de linha (evolução diária), gráficos de barras (mais vendidos e mais sobras), tabela de sugestão. |
| 2 | **Tela de Produtos** | Lista dos 8 produtos (Pão Francês, Pão Doce, Pão de Queijo, Bolo de Cenoura, Sonho, Croissant, Baguete, Salgado Assado). |
| 3 | **Modal de cadastro de produto** | Formulário aberto, com campos nome, categoria, unidade, preço. |
| 4 | **Tela de Vendas com filtros aplicados** | Filtrar por produto + período + intervalo de datas, mostrando a tabela filtrada. |
| 5 | **Tela de Produção** | Lista com produção dos últimos dias. |
| 6 | **Tela de Sobras/Perdas** | Lista com motivos diferenciados (sobra do dia, quebra, etc.) com tag colorida. |
| 7 | **Tela de Sugestão de Produção** | Tabela com média de vendas, média de sobras, quantidade sugerida e justificativa textual. |
| 8 | **Sugestão recalculada com margem diferente** | Alterar a margem de 10% para 15% e mostrar a tabela mudando. |
| 9 | **Console do navegador limpo (F12)** | Provar que não há erros vermelhos no console. |
| 10 | **Terminal com `npm test` verde** | Provar que todos os testes passam. |

> 💡 Para o relatório, capture as imagens com pelo menos **1280×720** e mostre a barra do navegador para evidenciar `localhost:3000`.

---

## 3. Roteiro rápido para o vídeo (≈ 4 minutos)

```
[0:00 – 0:20] Abertura
  - "Olá! Este é o Projeto Integrador da UNIVESP, com o tema
     'Previsão de produção para redução de desperdícios em padaria'."
  - Mostrar o título do README na tela inicial.

[0:20 – 0:50] Problema e proposta
  - "Padarias enfrentam dois problemas opostos: produzir demais
     gera sobra e desperdício; produzir de menos causa ruptura.
     O sistema usa dados históricos para sugerir quanto produzir."

[0:50 – 1:30] Setup e dados de exemplo
  - Mostrar o terminal: `npm install` → `npm start`.
  - Abrir o navegador em http://localhost:3000.
  - Clicar em "Carregar dados de demonstração" e mostrar a confirmação.

[1:30 – 2:30] Dashboard
  - Mostrar os 4 KPIs principais.
  - Comentar o gráfico de linha (evolução).
  - Mostrar os 2 gráficos de barras (mais vendidos / mais sobras).
  - Apontar a tabela "Sugestão para amanhã" no fim da página.

[2:30 – 3:10] CRUD em ação
  - Ir em "Produtos" → cadastrar 1 produto novo (ex.: "Pão Australiano").
  - Ir em "Vendas" → registrar 1 venda do dia para esse produto.
  - Ir em "Produção" → registrar 1 produção.
  - Ir em "Sobras" → registrar 1 sobra (ex.: 2 unidades por sobra do dia).

[3:10 – 3:50] Sugestão de produção (núcleo do projeto)
  - Ir em "Sugestão de Produção".
  - Mostrar a tabela completa com justificativa de cada produto.
  - Alterar margem de 10% para 15% e mostrar o recálculo.
  - Ler em voz alta uma justificativa: "Sugestão baseada na média
    do mesmo dia da semana com ajuste por sobra recente."

[3:50 – 4:00] Encerramento
  - "Todo o código está disponível, com testes automatizados
     e README explicando o algoritmo. Obrigado!"
```

---

## 4. Funcionalidades demonstráveis (checklist para banca)

- [x] Cadastro completo de produtos (CRUD + soft-delete inteligente)
- [x] Registro de vendas por produto, data e período do dia
- [x] Registro de produção diária
- [x] Registro de sobras com motivo (5 motivos pré-definidos)
- [x] Listagens com filtros por data, produto, período e motivo
- [x] Validações no backend (400 com mensagem amigável) e no frontend (erro inline no modal)
- [x] Dashboard com 4 KPIs, 3 gráficos e tabela de sugestão
- [x] Algoritmo de sugestão de produção com 4 ajustes (dia da semana, sobras, ruptura, margem)
- [x] Justificativa textual para cada sugestão
- [x] Margem de segurança configurável (0–50%) e data alvo configurável
- [x] Exportação da sugestão em CSV
- [x] Dados de demonstração realistas (8 produtos × 30 dias)
- [x] Persistência em arquivo JSON (sobrevive a reinício do servidor)
- [x] API REST com 24 endpoints documentados no README
- [x] Testes automatizados (`npm test`) com `node:test`
- [x] Layout responsivo (funciona em celular)
- [x] Mensagens de erro amigáveis (sem stack trace para o usuário)

---

## 5. Fluxo de demonstração completa (passo a passo)

1. **Pré-requisito**: Node.js 18+ instalado.
2. No terminal, dentro da pasta do projeto:
   ```
   npm install
   npm start
   ```
3. Abrir http://localhost:3000.
4. Clicar em **"Carregar dados de demonstração"** no menu lateral.
5. Navegar pelas telas:
   - **Dashboard** → KPIs, gráficos, sugestão para amanhã.
   - **Produtos** → criar um produto novo via "+ Novo produto".
   - **Vendas** → criar uma venda para esse produto.
   - **Produção** → registrar quanto foi produzido.
   - **Sobras** → registrar a sobra do dia.
   - **Sugestão de Produção** → ver a tabela completa com justificativa, mudar a margem.
6. Encerrar mostrando o terminal com `npm test` verde.

---

## 6. Pontos para destacar no relatório final

### Engenharia de software
- Separação clara de camadas: persistência (`db.js`), domínio (`services/forecast.js`), API (`routes/*.js`), apresentação (`public/`).
- Validação de entrada centralizada (`validators.js`).
- Tratamento de erros padronizado com mensagens em português.
- Soft-delete inteligente: produto com vínculos é inativado, não removido (preserva integridade do histórico).

### Algoritmo
- Abordagem **estatística explicável** ao invés de ML caixa-preta — adequada ao contexto acadêmico e à realidade do negócio (poucos dados).
- 4 ajustes de regra de negócio: dia da semana, janelas progressivas, sobras recentes, detecção de ruptura.
- Margem de segurança parametrizável (configuração de risco).
- Caso de borda tratado: "dados insuficientes" → resposta clara, sem quebrar a tela.

### Demonstrabilidade
- Botão único que popula 30 dias × 8 produtos com padrões realistas (fim de semana vende mais doces; segunda é mais fraca).
- Seeder determinístico (PRNG com seed fixa) → resultados reproduzíveis.

---

## 7. Limitações honestas do protótipo

A banca costuma valorizar a sinceridade técnica. Limitações reconhecidas:

1. **Persistência em JSON local**: simples e estável para demo, mas não suporta concorrência alta. Para produção, migrar para SQLite ou Postgres.
2. **Sem autenticação**: o escopo do PI é o problema de negócio, não a gestão de usuários.
3. **Histórico limitado a 30 dias** no algoritmo: parametrizável, foi escolhido como compromisso entre relevância (dados recentes) e estabilidade (média representativa).
4. **Não considera feriados nem clima**: extensão natural seria adicionar um calendário de eventos.
5. **Não há multi-padaria**: cada instalação atende a um único estabelecimento.

Essas limitações estão também documentadas no README.md e em "Próximos passos".

---

## 8. Como gerar evidências em formato digital

Para o relatório final, sugiro:

1. **Vídeo**: gravar a tela usando OBS Studio (gratuito) ou Loom, exportar em MP4 720p.
2. **Capturas**: usar Win+Shift+S (Windows) ou Cmd+Shift+4 (Mac).
3. **Logs de teste**: rodar `npm test > evidencia-testes.txt 2>&1` para anexar o resultado.
4. **JSON de exemplo**: incluir um trecho de `server/data/db.json` (depois do seed) como evidência da estrutura de dados.
5. **Diagrama de arquitetura**: a árvore de pastas do README serve como descrição textual.

---

## 9. Resposta rápida às perguntas mais comuns de banca

> **"Por que não usaram um banco de dados de verdade?"**
> Para um Projeto Integrador, o foco é o problema de negócio (desperdício) e a demonstrabilidade. Um arquivo JSON é estável, transparente (dá pra abrir e ver), zero configuração, e suficiente para o cenário de uma padaria com volume realista de registros. Migrar para SQLite é um próximo passo trivial.

> **"O algoritmo é machine learning?"**
> Não — é estatística histórica com regras de negócio explicáveis. A escolha foi consciente: ML exigiria volume de dados que padarias reais não têm no início, e a banca não conseguiria auditar uma rede neural. A solução implementada cobre os cenários comuns e é justificável passo a passo.

> **"Como o sistema se calibra ao longo do tempo?"**
> A cada novo dia de venda/sobra registrado, o histórico cresce automaticamente. O algoritmo recalcula a sugestão usando os dados mais recentes — sem precisar "treinar" nada.

> **"Funciona offline?"**
> O servidor roda local na máquina (localhost), portanto sim — sem internet, depois de instalado. Apenas Chart.js é carregado via CDN; trocar por uma cópia local é trivial.
