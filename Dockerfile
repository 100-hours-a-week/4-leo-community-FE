FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN --mount=type=cache,id=community-frontend-npm,target=/root/.npm,sharing=locked \
    npm ci --omit=dev

COPY --chown=node:node app.js ./
COPY --chown=node:node api/ ./api/
COPY --chown=node:node component/ ./component/
COPY --chown=node:node css/ ./css/
COPY --chown=node:node html/ ./html/
COPY --chown=node:node js/ ./js/
COPY --chown=node:node public/ ./public/
COPY --chown=node:node utils/ ./utils/

USER node

EXPOSE 3000

CMD ["node", "app.js"]
