#!/bin/bash
# WoundCare Development Server Startup Script

echo "=========================================="
echo "WoundCare Development Environment"
echo "=========================================="
echo ""
echo "Configuration:"
echo "- Environment: LOCAL"
echo "- Backend: http://localhost:5000"
echo "- Database: Docker MSSQL (localhost:4433)"
echo "- React App: http://localhost:5173"
echo ""

# Verify .env.local
echo "Checking .env.local configuration..."
if [ -f ".env.local" ]; then
    ENV_SETTING=$(grep "VITE_ENVIRONMENT=" .env.local | cut -d'=' -f2)
    echo "✓ .env.local found"
    echo "  Environment: $ENV_SETTING"
    if [ "$ENV_SETTING" != "local" ]; then
        echo "⚠ WARNING: VITE_ENVIRONMENT is not set to 'local'"
        echo "  Update .env.local to use VITE_ENVIRONMENT=local"
    fi
else
    echo "✗ .env.local not found!"
    exit 1
fi

echo ""
echo "Verifying prerequisites..."

# Check Docker MSSQL
echo -n "Checking Docker MSSQL... "
if docker ps | grep -q "localWoundCareDBServer"; then
    echo "✓ Running"
else
    echo "⚠ Not running. Start with: docker start localWoundCareDBServer"
fi

# Check Node modules
echo -n "Checking Node modules... "
if [ -d "node_modules" ]; then
    echo "✓ Installed"
else
    echo "✗ Not installed. Run: npm install"
    exit 1
fi

echo ""
echo "Starting development server..."
echo ""
echo "Access points:"
echo "  - React App: http://localhost:5173"
echo "  - API: https://api-dev.local/test"
echo "  - API: https://api-prod.local/test"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd client
npm run dev

