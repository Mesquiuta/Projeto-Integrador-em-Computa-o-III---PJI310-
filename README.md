# Padaria UNIVESP

Projeto Integrador da UNIVESP. É um sistema web pra ajudar uma padaria a planejar a produção do dia seguinte com base no que foi vendido, produzido e o que sobrou nos dias anteriores. A ideia é diminuir o desperdício sem deixar faltar produto.

Tem cadastro de produtos, registro de vendas, produção e sobras, um dashboard com gráficos e uma tela que sugere quanto produzir no dia seguinte com uma justificativa em texto.

## Como rodar

Precisa do Node.js 18 ou mais novo.

```bash
npm install
npm start
```

Depois é só abrir http://localhost:3000 no navegador.

Se quiser ver o sistema com dados, clica em "Carregar dados de demonstração" no menu lateral — ele popula 30 dias de histórico fictício pra você navegar.

Pra rodar os testes:

```bash
npm test
```
