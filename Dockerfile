FROM node:alpine as build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -s
COPY test test
COPY rules.js .
COPY .eslintrc.js .
RUN npm test
RUN npm prune --production
RUN rm -r test package-lock.json .eslintrc.js

FROM node:alpine

COPY --from=build /app /app
WORKDIR /app
COPY . .
CMD node index.js
