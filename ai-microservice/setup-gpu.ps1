# AutoSocial AI Microservice - GPU Setup Script
Write-Host "🔥 AutoSocial AI GPU Setup" -ForegroundColor Green
Write-Host "This script will help you set up GPU acceleration for the AI microservice" -ForegroundColor Yellow
Write-Host ""

# Check if CUDA is available
Write-Host "🔍 Checking for CUDA availability..." -ForegroundColor Cyan
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Version: {torch.version.cuda}') if torch.cuda.is_available() else print('No CUDA detected')"

Write-Host ""
Write-Host "📋 GPU Setup Options:" -ForegroundColor Yellow
Write-Host "1. Install CUDA-enabled PyTorch (for NVIDIA GPUs)" -ForegroundColor White
Write-Host "2. Install CPU-only PyTorch (current setup)" -ForegroundColor White
Write-Host "3. Check current PyTorch installation" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "🚀 Installing CUDA-enabled PyTorch..." -ForegroundColor Green
        Write-Host "Note: This requires an NVIDIA GPU with CUDA support" -ForegroundColor Yellow
        
        # Uninstall current PyTorch
        pip uninstall torch torchvision torchaudio -y
        
        # Install CUDA version (CUDA 12.1 compatible)
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
        
        Write-Host "✅ CUDA PyTorch installation completed!" -ForegroundColor Green
        Write-Host "🔄 Testing GPU availability..." -ForegroundColor Cyan
        python -c "import torch; print(f'✅ CUDA Available: {torch.cuda.is_available()}'); print(f'🔥 GPU Name: {torch.cuda.get_device_name(0)}') if torch.cuda.is_available() else print('❌ GPU not detected')"
    }
    "2" {
        Write-Host "💻 Current CPU-only setup is already configured" -ForegroundColor Blue
        Write-Host "No changes needed for CPU operation" -ForegroundColor White
    }
    "3" {
        Write-Host "🔍 Current PyTorch Installation:" -ForegroundColor Cyan
        python -c "import torch; print(f'PyTorch Version: {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Version: {torch.version.cuda}') if torch.cuda.is_available() else print('CPU-only installation')"
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🔧 Performance Notes:" -ForegroundColor Yellow
Write-Host "• GPU acceleration provides 5-10x faster inference" -ForegroundColor White
Write-Host "• Requires NVIDIA GPU with CUDA support" -ForegroundColor White
Write-Host "• Models will automatically use GPU if available" -ForegroundColor White
Write-Host "• Check /health endpoint for GPU status" -ForegroundColor White 