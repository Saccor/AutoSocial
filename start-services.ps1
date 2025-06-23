# AutoSocial Services Startup Script
# This script starts both the AI microservice and Next.js development server

Write-Host "🚀 Starting AutoSocial Services..." -ForegroundColor Green

# Start AI Microservice in background
Write-Host "📚 Starting AI Analysis Microservice (Python FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd ai-microservice && python main.py" -WindowStyle Minimized

# Wait a moment for AI service to start
Start-Sleep -Seconds 3

# Check if AI service is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ AI Microservice is running on http://localhost:8000" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ AI Microservice may still be starting..." -ForegroundColor Yellow
}

# Start Next.js Development Server
Write-Host "🌐 Starting Next.js Development Server..." -ForegroundColor Yellow
Write-Host "📱 Next.js will be available at http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Services Overview:" -ForegroundColor Cyan
Write-Host "   • AI Service: http://localhost:8000 (FastAPI + Hugging Face)" -ForegroundColor White
Write-Host "   • Web App: http://localhost:3000 (Next.js)" -ForegroundColor White
Write-Host "   • API Docs: http://localhost:8000/docs (Interactive AI API)" -ForegroundColor White
Write-Host ""

npm run dev 






