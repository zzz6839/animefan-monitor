FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies with legacy peer deps to handle any remaining conflicts
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 53000

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "53000"]
