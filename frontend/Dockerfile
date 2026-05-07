# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src
RUN npm run build

# ---- Production Stage ----
FROM nginx:1.25-alpine AS production

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/build /usr/share/nginx/html

# Non-root user
RUN adduser -D -H -u 1001 -s /bin/sh www-data-custom && \
    chown -R www-data-custom:www-data-custom /usr/share/nginx/html && \
    chown -R www-data-custom:www-data-custom /var/cache/nginx && \
    touch /var/run/nginx.pid && chown www-data-custom /var/run/nginx.pid

USER www-data-custom

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
