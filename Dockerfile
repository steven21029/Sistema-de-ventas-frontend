FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api/v1
ARG VITE_EMPRESA_SLUG=""

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_EMPRESA_SLUG=${VITE_EMPRESA_SLUG}

RUN npm run build

FROM nginx:1.27-alpine AS runtime

ENV BACKEND_URL=http://host.docker.internal:8000
ENV BACKEND_HOST=127.0.0.1:8000
ENV NGINX_ENVSUBST_FILTER="BACKEND_URL|BACKEND_HOST"

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
