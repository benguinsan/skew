ARG NODE_VERSION=22.17.0

FROM node:${NODE_VERSION}-alpine

RUN apk add --no-cache su-exec

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci \
    && chown -R node:node /app

COPY --chown=node:node . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "5173"]
