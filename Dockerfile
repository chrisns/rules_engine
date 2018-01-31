FROM node:alpine

RUN mkdir /app
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -s --prod
COPY . .

CMD node index.js
