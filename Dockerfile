FROM node:16.4.1-alpine as build
LABEL org.opencontainers.image.source https://github.com/chrisns/rules_engine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -s
RUN npm audit fix
COPY test test
COPY rules.js .
COPY .eslintrc.js .
RUN npm test
RUN npm prune --production
RUN rm -r test package-lock.json .eslintrc.js

FROM node:16.4.1-alpine
RUN apk --no-cache add openssl wget

COPY --from=build /app /app
WORKDIR /app
COPY . .
ENV NODE_ENV=production
USER node
ENV TZ=Europe/London
CMD node index.js
