FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies with legacy peer deps to handle any remaining conflicts
RUN npm install --legacy-peer-deps

COPY . .

# Build the application for production
RUN npm run build

EXPOSE 53000

# Use a simple HTTP server to serve the built files with proper CORS headers
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "53000", "--cors"]
