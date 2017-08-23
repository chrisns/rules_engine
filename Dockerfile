FROM node:alpine

RUN mkdir /app
WORKDIR /app
COPY package.json .
RUN npm install -s --prod
COPY . .

ENV NODE_ENV=production

CMD node index.js