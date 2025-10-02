#!/bin/bash

# WellnessHub Deployment Script
# This script sets up and runs the complete WellnessHub application

set -e

echo "🚀 Starting WellnessHub Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Stop any existing containers
print_status "Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Clean up old images if requested
if [[ "$1" == "--clean" ]]; then
    print_status "Cleaning up old images and volumes..."
    docker compose down --rmi all --volumes --remove-orphans 2>/dev/null || true
    docker system prune -f
fi

# Build the application
print_status "Building application images..."
if [[ "$1" == "--no-cache" ]] || [[ "$2" == "--no-cache" ]]; then
    docker compose build --no-cache
else
    docker compose build
fi

# Check if build was successful
if [ $? -ne 0 ]; then
    print_error "Build failed. Please check the error messages above."
    exit 1
fi

print_success "Build completed successfully"

# Start the services
print_status "Starting WellnessHub services..."
docker compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check MongoDB
if docker compose exec mongodb mongosh --eval "db.runCommand('ping')" &> /dev/null; then
    print_success "✅ MongoDB is healthy"
else
    print_warning "⚠️  MongoDB might not be ready yet"
fi

# Check Redis
if docker compose exec redis redis-cli ping &> /dev/null; then
    print_success "✅ Redis is healthy"
else
    print_warning "⚠️  Redis might not be ready yet"
fi

# Check Backend API
sleep 5
if curl -f http://localhost:5000/health &> /dev/null; then
    print_success "✅ Backend API is healthy"
else
    print_warning "⚠️  Backend API might not be ready yet"
fi

# Check Frontend
if curl -f http://localhost/health &> /dev/null; then
    print_success "✅ Frontend is healthy"
else
    print_warning "⚠️  Frontend might not be ready yet"
fi

echo ""
print_success "🎉 WellnessHub deployment completed!"
echo ""
echo "📋 Application URLs:"
echo "   🌐 Frontend:     http://localhost"
echo "   🔧 Backend API:  http://localhost:5000"
echo "   📚 API Docs:     http://localhost:5000/api"
echo "   ❤️  Health Check: http://localhost:5000/health"
echo ""
echo "📊 Service Status:"
docker compose ps
echo ""
echo "📝 To view logs:"
echo "   docker compose logs -f [service_name]"
echo ""
echo "🛑 To stop all services:"
echo "   docker compose down"
echo ""
print_status "Happy wellness journey! 🌟"