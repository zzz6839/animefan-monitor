# Build stage
FROM node:18-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install && npm install axios @types/axios

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
