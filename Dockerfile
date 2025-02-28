# Usa la imagen oficial de Node.js
FROM node:20-alpine AS builder

# Configura el directorio de trabajo
WORKDIR /usr/src/app

# Copia solo package.json y package-lock.json para optimizar la instalación de dependencias
COPY package*.json ./

# Instala todas las dependencias, incluidas las de desarrollo
RUN npm install

# Copia el resto del código fuente
COPY . .

# Compila la aplicación
RUN npm run build

# ---------------------------------------
# Imagen final optimizada para producción
# ---------------------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copia solo los archivos necesarios desde la fase de compilación
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/static/products ./static/products

# Instala solo dependencias de producción
RUN npm install --only=production

# Expone el puerto de la API
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/main"]
