FROM python:3.11-slim

# Install system libraries required by PyMuPDF
# Note: libgl1-mesa-glx was renamed to libgl1 in Debian Trixie
# Note: libmupdf-dev is NOT needed - PyMuPDF bundles its own MuPDF
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create temp uploads directory
RUN mkdir -p temp_uploads

EXPOSE 5000

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120"]

