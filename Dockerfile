# Este repo es un monorepo con npm workspaces (server + client): el único
# package-lock.json válido vive en la raíz, así que el build tiene que
# construirse con la raíz como contexto — un Dockerfile dentro de server/
# nunca puede ver ese lockfile, y `npm ci` falla sin él por diseño (a
# diferencia de `npm install`, que sí genera uno al vuelo).
#
# Multi-stage: "builder" instala todo el workspace y compila solo el
# paquete "server"; la imagen final solo lleva su dist compilado y las
# dependencias de producción de ese workspace.

FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

COPY server ./server
RUN npm exec --workspace=server -- prisma generate
RUN npm run build --workspace=server

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --omit=dev --workspace=server

# El cliente de Prisma se genera con "output" custom en src/generated/prisma
# (ver server/prisma/schema.prisma), así que ya queda compilado dentro de
# dist junto con el resto del código — no vive en node_modules/.prisma.
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

EXPOSE 3000
CMD ["node", "server/dist/main"]
