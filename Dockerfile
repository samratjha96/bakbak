FROM node:20-slim
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  curl \
  unzip \
  && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3010
RUN npm rebuild better-sqlite3
CMD ["npm", "run", "dev"]
