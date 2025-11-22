#!/bin/bash

# Alqawqaa Studio - Complete Installation Script
# Run this after fixing npm permissions with:
# sudo chown -R $(id -u):$(id -g) "$HOME/.npm"

set -e

echo "🚀 Installing Alqawqaa Studio dependencies..."

# Core dependencies
echo "📦 Installing React and TypeScript..."
npm install react react-dom
npm install -D @types/react @types/react-dom typescript vite @vitejs/plugin-react

# Electron
echo "⚡ Installing Electron..."
npm install -D electron electron-builder electron-vite @types/node

# Drawing libraries
echo "🎨 Installing Konva for canvas drawing..."
npm install konva react-konva
npm install -D @types/konva

# TailwindCSS
echo "💅 Installing TailwindCSS..."
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms

# Utilities
echo "🛠️  Installing utilities..."
npm install date-fns clsx

# Database (for future use)
echo "💾 Installing SQLite..."
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Biome linter/formatter
echo "✨ Installing Biome..."
npm install -D @biomejs/biome

# Initialize Tailwind
echo "🎨 Initializing TailwindCSS..."
npx tailwindcss init -p

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run dev' to start development"
echo "2. Run 'npm run build' to build for production"
echo "3. Run 'npm run package:win' to create Windows installer"
