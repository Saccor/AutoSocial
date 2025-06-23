# AutoSocial AI Dependencies Installation Script
Write-Host "🔧 Installing AutoSocial AI Dependencies..." -ForegroundColor Green

# Check Python version
$pythonVersion = python --version
Write-Host "🐍 Python Version: $pythonVersion" -ForegroundColor Cyan

# Install PyTorch with explicit CPU support (compatible with Python 3.13)
Write-Host "📦 Installing PyTorch (CPU version for Python 3.13 compatibility)..." -ForegroundColor Yellow
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install other dependencies
Write-Host "📦 Installing other dependencies..." -ForegroundColor Yellow
pip install fastapi>=0.100.0
pip install "uvicorn[standard]>=0.20.0"
pip install transformers>=4.30.0
pip install pydantic>=2.0.0
pip install python-multipart>=0.0.6
pip install "typing-extensions>=4.8.0"
pip install accelerate>=0.20.0

Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "🔍 Testing installation..." -ForegroundColor Cyan
python -c "import torch; import transformers; import fastapi; print('✅ All packages imported successfully!')"
Write-Host ""
Write-Host "🚀 Ready to start the AI service!" -ForegroundColor Green
Write-Host "Run: python main.py" -ForegroundColor White 