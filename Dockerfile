# ==============================================================================
# Stage 1 — Build
# ==============================================================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vide en prod : l'app buildée appelle l'API sur son propre domaine (chemins
# relatifs), routée par Traefik vers baby-krebs-api -- même principe que le
# proxy Vite en dev (voir src/api/client.ts).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ==============================================================================
# Stage 2 — Nginx
# ==============================================================================
FROM nginx:alpine

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
