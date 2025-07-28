FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Make scripts directory executable
RUN chmod -R +x ./scripts

EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]