FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps && npm cache clean --force

COPY . .

RUN chmod +x node_modules/.bin/* 2>/dev/null || true

RUN npm run build

EXPOSE 53000

RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "53000", "--cors"]
