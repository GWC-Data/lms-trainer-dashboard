# ---- build ----
# Node 22: vite 8 (admin) needs >=20.19, and 22 is safe for the vite 5 apps too.
FROM node:22-alpine AS build
WORKDIR /app

# No git hooks to install in an image, and .git is not in the build context.
ENV HUSKY=0

# VITE_* values are inlined into the bundle by vite at BUILD time. Setting them
# on the Cloud Run service does nothing -- they have to arrive as build args.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- serve ----
# The vite dev server is not a production server; serve the static build.
FROM nginx:1.27-alpine

# Cloud Run sets PORT itself; this is the local/default fallback.
ENV PORT=8080
# Substitute ONLY $PORT -- without this filter envsubst would also eat nginx's
# own $uri variables in try_files and break SPA routing.
ENV NGINX_ENVSUBST_FILTER=PORT

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
