# VI Impact

O VI Impact é uma aplicação full-stack que analisa possíveis relações entre eventos relacionados ao GTA VI e as movimentações das ações da Take-Two Interactive.

A aplicação coleta cotações da ação `TTWO`, armazena o histórico, permite cadastrar eventos relacionados ao GTA VI e calcula a variação do preço da ação antes e depois de cada evento.

## Funcionalidades

- Coleta automática de cotações da ação TTWO
- Integração com a API da Twelve Data
- Persistência de dados com SQL Server e Entity Framework Core
- Cadastro e listagem de eventos relacionados ao GTA VI
- Consulta do histórico de cotações
- Cálculo do impacto de eventos sobre a ação
- Endpoint com dados para o dashboard
- Filtro para exibir ou ocultar eventos do GTA VI
- Prevenção de cotações duplicadas
- Respostas de erro padronizadas
- Testes unitários automatizados

## Arquitetura

O backend utiliza uma arquitetura dividida em camadas:

```text
VIImpact
├── VIImpact.API
├── VIImpact.Application
├── VIImpact.Domain
├── VIImpact.Infrastructure
└── VIImpact.Tests
```

### VIImpact.API

Contém os controllers, contratos da API, configurações e serviços executados em segundo plano.

### VIImpact.Application

Contém as interfaces, modelos e serviços responsáveis pelas regras da aplicação.

### VIImpact.Domain

Contém as principais entidades do domínio.

### VIImpact.Infrastructure

Contém a persistência com Entity Framework Core, os repositórios e as integrações com serviços externos.

### VIImpact.Tests

Contém os testes automatizados das regras de negócio da aplicação.

## Tecnologias utilizadas

- C#
- .NET
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server LocalDB
- Twelve Data API
- xUnit
- Git
- GitHub

## Principais endpoints

### Consultar uma cotação em tempo real

```http
GET /api/stocks/TTWO
```

Esse endpoint consulta a cotação diretamente na API da Twelve Data, sem salvar o resultado no banco de dados.

### Consultar o histórico de cotações

```http
GET /api/stocks/TTWO/history?limit=100
```

### Listar eventos do GTA VI

```http
GET /api/gtaevents
```

### Cadastrar um evento do GTA VI

```http
POST /api/gtaevents
Content-Type: application/json
```

Exemplo de requisição:

```json
{
  "title": "Novo evento relacionado ao GTA VI",
  "description": "Descrição do evento.",
  "sourceUrl": "https://example.com",
  "occurredAtUtc": "2026-07-28T19:46:36Z"
}
```

### Calcular o impacto de um evento

```http
GET /api/gtaevents/{eventId}/impact?symbol=TTWO
```

O endpoint localiza a cotação mais próxima antes e depois do evento e calcula:

- preço anterior;
- preço posterior;
- variação em valor;
- variação percentual.

### Consultar os dados do dashboard

```http
GET /api/dashboard/TTWO?includeGtaEvents=true&limit=500
```

Para ocultar os eventos do GTA VI:

```http
GET /api/dashboard/TTWO?includeGtaEvents=false&limit=500
```

## Como executar o projeto

### Requisitos

- .NET SDK
- Visual Studio
- SQL Server LocalDB
- Chave de API da Twelve Data

### Configuração do banco de dados

Durante o desenvolvimento, o projeto utiliza SQL Server LocalDB:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\MSSQLLocalDB;Database=VIImpactDb;Trusted_Connection=True;TrustServerCertificate=True"
  }
}
```

Para criar ou atualizar o banco de dados, abra o Console do Gerenciador de Pacotes e execute:

```powershell
Update-Database -StartupProject VIImpact.API
```

O projeto padrão do Console do Gerenciador de Pacotes deve ser:

```text
VIImpact.Infrastructure
```

### Configuração da chave da Twelve Data

A chave da API deve ser armazenada com o .NET User Secrets.

Ela não deve ser adicionada ao `appsettings.json` nem enviada para o GitHub.

```powershell
dotnet user-secrets set "TwelveData:ApiKey" "SUA_CHAVE_AQUI" --project VIImpact.API
```

### Iniciar a aplicação

Defina o projeto `VIImpact.API` como projeto de inicialização e execute pelo Visual Studio.

## Coleta automática de cotações

O serviço de coleta automática pode ser configurado no arquivo `appsettings.json`:

```json
{
  "StockCollection": {
    "Enabled": true,
    "Symbol": "TTWO",
    "IntervalMinutes": 5
  }
}
```

O worker consulta periodicamente a cotação configurada e salva apenas dados que ainda não estejam armazenados.

Uma cotação é considerada duplicada quando possui os mesmos valores de:

```text
Symbol
Price
ChangePercent
Volume
MarketTimestampUtc
```

## Datas das cotações

Cada cotação possui duas informações de data:

```text
RecordedAtUtc
```

Representa o momento em que o VI Impact coletou e registrou a cotação.

```text
MarketTimestampUtc
```

Representa o horário da cotação informado pela fonte de dados do mercado.

## Tratamento de erros

A API utiliza respostas padronizadas no formato `ProblemDetails`.

Exemplo de resposta para uma rota inexistente:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Not Found",
  "status": 404,
  "traceId": "identificador-da-requisicao"
}
```

O `traceId` permite relacionar uma resposta de erro aos registros internos da aplicação.

## Testes

Os testes podem ser executados pelo Gerenciador de Testes do Visual Studio ou pelo terminal:

```powershell
dotnet test
```

Atualmente, os testes verificam:

- o cálculo da variação do preço da ação antes e depois de um evento;
- o comportamento do serviço quando o evento informado não existe.

## Status do projeto

O MVP do backend está funcional.

Atualmente, o sistema já consegue:

```text
Coletar cotações da TTWO
→ armazenar o histórico
→ cadastrar eventos do GTA VI
→ localizar cotações antes e depois
→ calcular o impacto do evento
→ fornecer dados para um dashboard
```

A próxima etapa será o desenvolvimento da interface interativa do dashboard.

## Objetivo

Este projeto está sendo desenvolvido para aprendizado e composição de portfólio, aplicando conceitos como:

- arquitetura em camadas;
- injeção de dependência;
- integração com APIs externas;
- persistência de dados;
- serviços em segundo plano;
- tratamento de erros;
- testes automatizados;
- boas práticas com Git e GitHub.

## Aviso

Este projeto possui finalidade educacional e de portfólio.

As informações do mercado financeiro apresentadas pela aplicação não devem ser consideradas recomendações de investimento.