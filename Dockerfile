FROM node:16

WORKDIR /usr/src/trading

COPY . .

RUN npm install

CMD ["npm", "start"]