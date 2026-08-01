# VI Impact

[![Continuous Integration](https://github.com/JrCotrim/VI-Impact/actions/workflows/ci.yml/badge.svg)](https://github.com/JrCotrim/VI-Impact/actions/workflows/ci.yml)

Aplicação full-stack que relaciona eventos públicos ligados ao **GTA VI** com movimentações das ações da **Take-Two Interactive (`TTWO`)**.

O projeto reúne dados de mercado, catálogo de eventos, comparação com o benchmark **QQQ**, visualizações interativas e uma infraestrutura completa com testes, Health Checks, Docker Compose e integração contínua.

> Projeto educacional e de portfólio. As informações exibidas não constituem recomendação de investimento.

---

## Visão geral

O VI Impact permite:

- acompanhar cotação, variação diária e volume negociado da TTWO;
- visualizar o histórico de preços em diferentes períodos;
- comparar TTWO com o ETF QQQ;
- relacionar eventos do GTA VI ao gráfico de cotações;
- calcular retornos da ação após cada evento;
- comparar o desempenho da TTWO com o mercado;
- ordenar eventos por impacto positivo ou negativo;
- consultar detalhes, fontes e categorias dos eventos;
- executar toda a aplicação localmente ou com Docker Compose.

A aplicação não afirma que um evento causou determinada movimentação. Ela apresenta uma análise temporal dos dados disponíveis.

---

## Dashboard

O dashboard possui:

- cards de preço atual, variação diária, volume e última atualização;
- mini gráficos de preço e volume;
- gráfico de cotações com períodos de `1D` até `Máx.`;
- comparação entre TTWO e QQQ;
- marcadores de eventos sobre o gráfico;
- linha do tempo com filtros;
- ranking de impacto em 1, 5 e 30 pregões;
- filtros por direção, categoria e pesquisa;
- painel detalhado de cada evento;
- temas claro e noturno;
- estados de carregamento, erro e nova tentativa.

---

## Principais funcionalidades

### Dados de mercado

- integração com a API da Twelve Data;
- coleta automática de cotações;
- persistência das cotações no SQL Server;
- prevenção de registros duplicados;
- consulta de série histórica;
- cache das séries históricas;
- comparação com o benchmark QQQ.

### Análise de impacto

Para cada evento elegível, a aplicação pode calcular:

- retorno no mesmo pregão;
- retorno após 1 pregão;
- retorno após 5 pregões;
- retorno após 30 pregões;
- variação de volume;
- retorno do QQQ no mesmo período;
- retorno excedente da TTWO em relação ao benchmark.

### Catálogo de eventos

- eventos relacionados ao GTA VI;
- título, descrição, categoria e subcategoria;
- prioridade e tipo de fonte;
- data do acontecimento e publicação;
- link para a fonte;
- status e precisão da data;
- sincronização automática do catálogo na inicialização.

### Resiliência

A integração com o provedor de mercado possui:

- timeout por tentativa;
- repetição automática de falhas transitórias;
- atraso exponencial com jitter;
- suporte ao cabeçalho `Retry-After`;
- circuit breaker;
- cache de respostas;
- logs estruturados;
- respostas seguras para o frontend.

### Tratamento de erros

A API utiliza o formato `ProblemDetails` e retorna campos como:

```json
{
  "type": "https://httpstatuses.com/503",
  "title": "Provedor temporariamente indisponível",
  "status": 503,
  "detail": "Não foi possível consultar os dados de mercado neste momento.",
  "instance": "/api/stocks/TTWO/time-series",
  "errorCode": "provider_unavailable",
  "traceId": "identificador-da-requisicao"
}
```

O frontend interpreta códigos como `429`, `502`, `503` e `504`, preserva dados anteriores quando possível e apresenta opção de nova tentativa.

---

## Arquitetura

O backend segue uma arquitetura em camadas:

```text
VI-Impact
├── VIImpact.API
├── VIImpact.Application
├── VIImpact.Domain
├── VIImpact.Infrastructure
├── VIImpact.Tests
├── VIImpact.Web
├── .github
│   └── workflows
├── docker-compose.yml
└── README.md
```

### `VIImpact.API`

Responsável por:

- controllers e rotas HTTP;
- configuração da aplicação;
- tratamento global de erros;
- Health Checks;
- worker de coleta automática;
- inicialização e migração do banco.

### `VIImpact.Application`

Responsável por:

- interfaces;
- modelos de aplicação;
- serviços e regras de negócio;
- cálculo de impacto dos eventos;
- cache do ranking.

### `VIImpact.Domain`

Contém as entidades centrais do domínio, como:

- cotações;
- eventos do GTA VI;
- categorias e demais tipos relacionados.

### `VIImpact.Infrastructure`

Responsável por:

- Entity Framework Core;
- SQL Server;
- repositórios;
- integração com a Twelve Data;
- política de resiliência;
- seed do catálogo de eventos.

### `VIImpact.Tests`

Contém testes automatizados para:

- cálculo de impacto;
- cache do ranking;
- integração resiliente com a Twelve Data;
- tratamento global de exceções;
- Health Check do banco.

### `VIImpact.Web`

Frontend construído com React, TypeScript e Vite.

No ambiente Docker, o build estático é servido pelo Nginx, que também encaminha as rotas `/api` e `/health` para a API.

---

## Tecnologias

### Backend

- C#
- .NET 10
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- xUnit
- HttpClient
- Background Services
- ProblemDetails
- Health Checks

### Frontend

- React 19
- TypeScript
- Vite 8
- Recharts
- ESLint
- Nginx

### Infraestrutura

- Docker
- Docker Compose
- GitHub Actions
- Git
- GitHub

---

## Principais endpoints

### Dashboard

```http
GET /api/dashboard/TTWO?includeGtaEvents=true&limit=500
```

### Cotação atual

```http
GET /api/stocks/TTWO
```

### Histórico armazenado

```http
GET /api/stocks/TTWO/history?limit=100
```

### Série histórica

```http
GET /api/stocks/TTWO/time-series?period=1Y
```

### Eventos

```http
GET /api/gtaevents
```

### Detalhes de impacto

```http
GET /api/gtaevents/{eventId}/impact?symbol=TTWO&benchmarkSymbol=QQQ
```

### Ranking de impacto

```http
GET /api/gtaevents/impact-ranking?symbol=TTWO&benchmarkSymbol=QQQ
```

### Health Checks

```http
GET /health/live
GET /health/ready
```

O endpoint `/health/ready` também verifica a conexão com o SQL Server.

---

## Executar com Docker

### Requisitos

- Docker Desktop;
- virtualização habilitada;
- WSL 2 no Windows;
- chave da Twelve Data.

### 1. Clone o repositório

```powershell
git clone https://github.com/JrCotrim/VI-Impact.git
cd VI-Impact
```

### 2. Crie o arquivo de ambiente

```powershell
Copy-Item .env.example .env
```

Edite o `.env`:

```env
SQL_SA_PASSWORD=UMA_SENHA_FORTE
TWELVE_DATA_API_KEY=SUA_CHAVE_AQUI
```

O arquivo `.env` está ignorado pelo Git e não deve ser enviado ao repositório.

### 3. Inicie a aplicação

```powershell
docker compose up --build
```

Serviços disponíveis:

| Serviço | Endereço |
|---|---|
| Frontend | `http://localhost:5173` |
| API | `http://localhost:5170` |
| SQL Server | `localhost:1433` |

### 4. Verifique os containers

```powershell
docker compose ps
```

### 5. Teste a prontidão

```powershell
curl.exe -i "http://localhost:5170/health/ready"
curl.exe -i "http://localhost:5173/health/ready"
```

### 6. Encerre os containers

```powershell
docker compose down
```

O volume `sqlserver-data` preserva os dados do banco.

Para remover também o volume:

```powershell
docker compose down -v
```

---

## Executar sem Docker

### Requisitos

- .NET SDK 10;
- Node.js;
- SQL Server LocalDB;
- chave da Twelve Data.

### 1. Configure a chave da API

```powershell
dotnet user-secrets set `
  "TwelveData:ApiKey" `
  "SUA_CHAVE_AQUI" `
  --project .\VIImpact.API\VIImpact.API.csproj
```

### 2. Execute a API

```powershell
dotnet run --project .\VIImpact.API\VIImpact.API.csproj
```

A API estará disponível em:

```text
http://localhost:5170
```

### 3. Execute o frontend

Em outro terminal:

```powershell
cd .\VIImpact.Web
npm install
npm run dev
```

O frontend estará disponível em:

```text
http://localhost:5173
```

O Vite encaminha as rotas `/api` e `/health` para a API local.

---

## Banco de dados

No desenvolvimento sem Docker, a aplicação usa SQL Server LocalDB:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=VIImpactDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

Na inicialização, a API:

1. cria um escopo de banco;
2. aplica migrações pendentes;
3. remove dados antigos de teste;
4. sincroniza o catálogo de eventos.

No Docker, a string de conexão é substituída por variável de ambiente.

---

## Coleta automática

O worker de cotações pode ser configurado por `appsettings.json` ou variáveis de ambiente:

```json
{
  "StockCollection": {
    "Enabled": true,
    "Symbol": "TTWO",
    "IntervalMinutes": 5
  }
}
```

No Docker, os equivalentes são:

```env
STOCK_COLLECTION_ENABLED=true
STOCK_SYMBOL=TTWO
STOCK_INTERVAL_MINUTES=5
```

---

## Testes

Execute:

```powershell
dotnet test VIImpact.slnx
```

Estado atual:

```text
18 testes
0 falhas
```

As principais áreas cobertas são:

- cálculo de impacto;
- retornos em diferentes janelas;
- comparação com benchmark;
- cache do ranking;
- timeout e repetição de requisições;
- rate limit;
- circuit breaker;
- respostas `ProblemDetails`;
- Health Check do banco.

---

## Build do frontend

```powershell
cd .\VIImpact.Web
npm run lint
npm run build
```

---

## Integração contínua

O workflow está localizado em:

```text
.github/workflows/ci.yml
```

Ele é executado em Pull Requests, manualmente e nos pushes configurados.

Jobs atuais:

```text
Backend build and tests
Frontend lint and build
Validate Docker Compose
```

Cada execução valida:

- restore do backend;
- build em modo `Release`;
- testes automatizados;
- lint do frontend;
- build do frontend;
- sintaxe e interpolação do Docker Compose.

---

## Segurança

- a chave da Twelve Data não fica no código;
- o `.env` não é versionado;
- os valores usados na CI são fictícios;
- mensagens internas de exceção não são expostas ao cliente;
- o `traceId` permite correlacionar erros com os logs;
- a API executa no container com usuário sem privilégios.

---

## Fluxo simplificado

```text
Twelve Data
    │
    ▼
VIImpact.Infrastructure
    │
    ▼
VIImpact.Application
    │
    ▼
VIImpact.API
    │
    ├── SQL Server
    │
    ▼
Nginx
    │
    ▼
React Dashboard
```

---

## Status

O projeto possui um MVP full-stack funcional com:

- backend em camadas;
- dashboard interativo;
- análise de eventos;
- comparação com benchmark;
- persistência;
- resiliência;
- tratamento de erros;
- Health Checks;
- testes automatizados;
- Docker Compose;
- integração contínua.

Próximas evoluções possíveis:

- autenticação e autorização;
- painel administrativo de eventos;
- cobertura de testes de integração;
- deploy em ambiente de nuvem;
- observabilidade com métricas e tracing;
- suporte a novos ativos e benchmarks.

---

## Objetivo do projeto

O VI Impact foi desenvolvido para aprendizado e composição de portfólio, aplicando na prática:

- arquitetura em camadas;
- injeção de dependência;
- integração com APIs externas;
- persistência de dados;
- processamento em segundo plano;
- cache;
- resiliência;
- análise de séries temporais;
- testes automatizados;
- containerização;
- integração contínua;
- boas práticas com Git e GitHub.

---

## Autor

Desenvolvido por **Júnior Cotrim**.

GitHub: [@JrCotrim](https://github.com/JrCotrim)

---

## Aviso

Este projeto possui finalidade educacional e de portfólio.

Os dados financeiros podem apresentar atraso, indisponibilidade ou diferenças em relação a outras fontes. Os movimentos observados não comprovam causalidade e não devem ser interpretados como recomendação de investimento.
