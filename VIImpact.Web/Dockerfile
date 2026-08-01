# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

WORKDIR /app

COPY VIImpact.Web/package*.json ./

RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install; \
    fi

COPY VIImpact.Web/ ./

RUN npm run build

FROM nginx:stable-alpine AS final

COPY VIImpact.Web/nginx.conf \
    /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist \
    /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK \
    --interval=15s \
    --timeout=5s \
    --start-period=10s \
    --retries=5 \
    CMD wget -q -O /dev/null http://localhost/ \
        || exit 1
