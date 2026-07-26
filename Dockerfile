ARG NODE_VERSION=22.17.0

FROM node:${NODE_VERSION}-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci \
    && chown -R node:node /app

COPY --chown=node:node . .

USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "5173"]
