# ---- build ----
FROM node:22-alpine AS build

WORKDIR /app

# Disable git hooks during Docker build
ENV HUSKY=0

# Vite variables are embedded into the frontend at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build Vite application
RUN npm run build


# ---- serve ----
FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

# Cloud Run provides PORT at runtime
ENV PORT=8080

# Only substitute PORT in the nginx template.
# This prevents envsubst from modifying nginx variables such as $uri.
ENV NGINX_ENVSUBST_FILTER=PORT

# Nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy Vite production build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
