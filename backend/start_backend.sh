#!/bin/bash

# Advanced Exercise Analysis Backend Startup Script

echo "🚀 Starting Advanced Exercise Analysis Backend..."

# Check if Python 3.8+ is installed
python_version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
if [ -z "$python_version" ]; then
    echo "❌ Python 3.8+ is required but not found. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python version: $python_version"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Use venv binaries explicitly (avoids conda/system PATH conflicts)
VENV_PYTHON="venv/bin/python"
VENV_PIP="venv/bin/pip"
VENV_UVICORN="venv/bin/uvicorn"

echo "🔧 Using virtual environment (venv/bin)..."

# Install/upgrade pip
echo "📦 Upgrading pip..."
"$VENV_PIP" install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
"$VENV_PIP" install -r requirements.txt

# Check if all dependencies are installed
echo "🔍 Checking dependencies..."
"$VENV_PYTHON" -c "
import sys
required_packages = ['fastapi', 'numpy', 'scipy', 'sklearn', 'pandas', 'dtaidistance']
missing_packages = []

for package in required_packages:
    try:
        __import__(package)
        print(f'✅ {package}')
    except ImportError:
        missing_packages.append(package)
        print(f'❌ {package}')

if missing_packages:
    print(f'\\n❌ Missing packages: {missing_packages}')
    print('Please run: pip install -r requirements.txt')
    sys.exit(1)
else:
    print('\\n✅ All dependencies installed successfully!')
"

if [ $? -ne 0 ]; then
    echo "❌ Dependency check failed. Please install missing packages."
    exit 1
fi

# Start the server
echo "🌐 Starting FastAPI server..."
echo "📊 API Documentation will be available at: http://localhost:8000/docs"
echo "🏥 Health check endpoint: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

"$VENV_UVICORN" advanced_analysis:app --host 0.0.0.0 --port 8000 --reload