.PHONY: dev prod stop logs clean help setup-env

# Default target
help:
	@echo "BakBak Application Commands:"
	@echo "  make dev     - Run development server (npm run dev)"
	@echo "  make prod    - Build and run production deployment with Docker"
	@echo "  make stop    - Stop production containers"
	@echo "  make logs    - View application logs"
	@echo "  make clean   - Clean up containers and images"
	@echo "  make help    - Show this help message"

# Development target - just run npm dev
dev:
	@echo "🚀 Starting development server..."
	npm run dev

# Production deployment target
prod: setup-env
	@echo "🚀 Starting BakBak production deployment..."
	@echo "📁 Creating data directory..."
	@mkdir -p ./data
	@echo "🏗️  Building Docker image..."
	docker-compose build
	@echo "🚀 Starting application..."
	docker-compose up -d
	@echo "🏥 Waiting for application to be healthy..."
	@sleep 10
	@if docker-compose ps | grep -q "Up"; then \
		echo "✅ Application is running successfully!"; \
		echo "🌐 Access your app at: http://$$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost'):3010"; \
		echo "📊 Check logs with: make logs"; \
		echo "🛑 Stop with: make stop"; \
	else \
		echo "❌ Application failed to start. Check logs:"; \
		docker-compose logs; \
		exit 1; \
	fi

# Stop production containers
stop:
	@echo "🛑 Stopping BakBak application..."
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Clean up
clean: stop
	@echo "🧹 Cleaning up Docker containers and images..."
	docker-compose down --rmi all --volumes --remove-orphans

# Setup .env file if it doesn't exist
setup-env:
	@if [ ! -f .env ]; then \
		echo "📋 Creating .env file from template..."; \
		cp .env.example .env; \
		echo "⚠️  Please edit .env file with your AWS_S3_BUCKET and other values before running 'make prod' again"; \
		echo "📝 Edit the .env file now and set your S3 bucket name"; \
		exit 1; \
	fi