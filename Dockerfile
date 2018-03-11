FROM node:alpine as build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -s
COPY . .
RUN npm test
RUN npm prune --production
RUN rm -r test package-lock.json .eslintrc.js

FROM node:alpine
COPY --from=build /app /app
WORKDIR /app
CMD node index.js
