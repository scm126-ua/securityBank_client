# Imagen de desarrollo del frontend: Vue 3 + Vite con recarga en caliente (HMR).
FROM node:24.21.0-alpine3.24

WORKDIR /app

# Primero solo los ficheros de dependencias, para aprovechar la caché de capas de Docker.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
