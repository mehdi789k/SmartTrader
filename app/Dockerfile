# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application package into container
COPY app /app/app

# Create logs directory inside app package
RUN mkdir -p /app/app/logs

# Expose port
EXPOSE 8000

# Run application through package path
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
