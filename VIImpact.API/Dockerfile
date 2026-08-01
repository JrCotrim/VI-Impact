# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080

USER $APP_UID

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release

WORKDIR /src

COPY ["VIImpact.API/VIImpact.API.csproj", "VIImpact.API/"]
COPY ["VIImpact.Application/VIImpact.Application.csproj", "VIImpact.Application/"]
COPY ["VIImpact.Domain/VIImpact.Domain.csproj", "VIImpact.Domain/"]
COPY ["VIImpact.Infrastructure/VIImpact.Infrastructure.csproj", "VIImpact.Infrastructure/"]

RUN dotnet restore "VIImpact.API/VIImpact.API.csproj"

COPY . .

WORKDIR "/src/VIImpact.API"

RUN dotnet publish "VIImpact.API.csproj" \
    --configuration "$BUILD_CONFIGURATION" \
    --output /app/publish \
    /p:UseAppHost=false

FROM runtime AS final

WORKDIR /app

COPY --from=build /app/publish .

HEALTHCHECK \
    --interval=15s \
    --timeout=5s \
    --start-period=20s \
    --retries=5 \
    CMD curl --fail --silent --show-error \
        http://localhost:8080/health/ready \
        || exit 1

ENTRYPOINT ["dotnet", "VIImpact.API.dll"]
