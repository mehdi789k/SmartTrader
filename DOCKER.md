# Docker deployment guide

## Prerequisites
- Docker installed (https://docs.docker.com/get-docker/)
- Docker Compose installed (included with Docker Desktop)

## Build Images

```bash
# Build all images
docker-compose build

# Or build specific service
docker-compose build backend
docker-compose build frontend
```

## Run with Docker Compose

```bash
# Start all services
docker-compose up

# Run in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Notes

- MetaTrader5 Python module requires Windows platform. The backend container can still build on Linux if MT5 is skipped via platform-specific dependency markers.
- For production use, update SECRET_KEY in docker-compose.yml
- Adjust CORS_ORIGINS for your domain
- Enable volume mounting for logs persistence

## Production Deployment

For production deployment with MetaTrader5:
1. MetaTrader5 module only works on Windows
2. Consider running backend on Windows Server with MT5 installed
3. Use separate container or VM for frontend
4. Use HTTPS and load balancer
5. Set proper environment variables
6. Use external logging and monitoring
