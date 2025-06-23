# AutoSocial AI Analysis Microservice

A Python FastAPI microservice using Hugging Face Transformers for social media content analysis with GPU acceleration support.

## Features

- **Sentiment Analysis**: Twitter-trained RoBERTa model for accurate sentiment detection
- **Content Classification**: Zero-shot classification for trending categories
- **Viral Pattern Analysis**: AI-powered insights into engagement patterns
- **Content Suggestions**: Rule-based content generation with ML insights
- **GPU Acceleration**: Automatic CUDA detection and GPU acceleration (5-10x faster inference)
- **Memory Optimization**: FP16 precision on GPU for better memory usage

## Setup

### Basic Setup (CPU)

1. **Install Python dependencies**:
   ```bash
   cd ai-microservice
   pip install -r requirements.txt
   ```

### GPU Setup (Recommended for Performance)

1. **Run GPU setup script** (Windows):
   ```bash
   cd ai-microservice
   .\setup-gpu.ps1
   ```

2. **Manual GPU setup**:
   ```bash
   # For NVIDIA GPUs with CUDA support
   pip uninstall torch torchvision torchaudio -y
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   
   # Install other dependencies
   pip install -r requirements.txt
   ```

### Running the Service

1. **Start the server**:
   ```bash
   python main.py
   # Or using uvicorn directly:
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Test the service**:
   ```bash
   curl http://localhost:8000/health
   ```

3. **Check GPU status**:
   ```bash
   # The /health endpoint will show GPU information
   curl http://localhost:8000/health | grep gpu
   ```

## API Endpoints

- `GET /`: Service information
- `GET /health`: Health check
- `POST /analyze-posts`: Analyze trending posts
- `POST /generate-content-suggestions`: Generate content ideas
- `POST /analyze-overall-patterns`: Overall viral pattern analysis
- `GET /docs`: Interactive API documentation

## Models Used

- **Sentiment**: `cardiffnlp/twitter-roberta-base-sentiment-latest`
- **Classification**: `facebook/bart-large-mnli`

## Performance

### GPU vs CPU Performance
- **GPU (CUDA)**: ~5-10x faster inference, ideal for production
- **CPU**: Slower but works on any machine, good for development

### Memory Requirements
- **GPU**: ~2-4 GB VRAM for both models
- **CPU**: ~1-2 GB RAM for models

### Automatic Device Detection
The service automatically detects and uses the best available device:
1. NVIDIA GPU with CUDA support (fastest)
2. CPU fallback (slower but universal)

## Environment

The service runs on port 8000 and accepts CORS requests from Next.js (ports 3000/3001).

Device information is available at the `/health` endpoint. 