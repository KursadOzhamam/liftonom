# syntax=docker/dockerfile:1
# Liftonom API (.NET 10) — çok aşamalı üretim imajı.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Önce sadece csproj → restore katmanı önbelleğe alınır (kaynak değişince yeniden restore olmaz)
COPY Liftonom.Api.csproj ./
RUN dotnet restore Liftonom.Api.csproj

# Kaynak + yayınlama
COPY . .
RUN dotnet publish Liftonom.Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Kestrel 8080'i dinler — Coolify/Traefik bu porta yönlendirir.
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "Liftonom.Api.dll"]
