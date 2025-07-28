FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Make scripts directory executable
RUN chmod -R +x ./scripts

EXPOSE 3010

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
