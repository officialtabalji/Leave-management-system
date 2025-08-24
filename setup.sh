#!/bin/bash

echo "🚀 Setting up NIT Goa LMS - Leave Management System"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please upgrade Node.js to version 18 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files if they don't exist
echo "🔧 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/env.example backend/.env
    echo "⚠️  Please update backend/.env with your configuration values"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local from template..."
    cp frontend/env.example frontend/.env.local
    echo "⚠️  Please update frontend/.env.local with your configuration values"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your MongoDB URI and Google OAuth credentials"
echo "2. Update frontend/.env.local with your Google OAuth client ID"
echo "3. Start MongoDB service (local or Atlas)"
echo "4. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "📚 For detailed setup instructions, see README.md"
echo ""
echo "🚀 Happy coding!"
