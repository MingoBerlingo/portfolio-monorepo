#!/bin/bash

# Saiver Monorepo Development Setup Script
# This script helps you get started with the development environment

set -e

echo "🚀 Setting up Saiver Monorepo Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if PNPM is installed
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing PNPM..."
    npm install -g pnpm
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. You have $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo "✅ PNPM $(pnpm --version) detected"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "🐳 Docker detected. You can start development services with:"
    echo "   pnpm docker:up"
else
    echo "⚠️  Docker not detected. Some services may not be available."
fi

echo ""
echo "🎉 Setup complete! You can now:"
echo ""
echo "  📱 Start web development:  pnpm web:dev"
echo "  📚 Start Storybook:        pnpm web:storybook"  
echo "  🔨 Build everything:       pnpm build"
echo "  🧪 Run tests:             pnpm test"
echo "  🐳 Start Docker services: pnpm docker:up"
echo ""
echo "📖 For more information, see README.md"
echo "🤝 Contributing? Check CONTRIBUTING.md"