FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    SERVE_FRONTEND=true \
    PORT=3000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY config ./config
COPY db ./db
COPY public ./public
COPY scripts ./scripts
COPY src ./src
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

USER node
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
