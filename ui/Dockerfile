# Frontend Dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install runtime dependencies
COPY package*.json ./
RUN npm install --production

# Copy built application and runtime server
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js

# Expose port
EXPOSE 3000

# Run Express static server with API proxy
CMD ["node", "server.js"]
