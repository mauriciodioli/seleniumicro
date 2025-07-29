# Capa 1: Imagen base
FROM python:3.12-slim

# Capa 2: Configurar el directorio de trabajo
WORKDIR /app

# Capa 3: Copiar solo el archivo de requisitos para aprovechar la caché
COPY src/requirements.txt .

# Capa 4: Instalar dependencias del sistema
RUN apt-get update && \
    apt-get install -y \
    git \
    wget \
    curl \
    unzip \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    chromium-driver \
    chromium \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Capa 5: Instalar dependencias Python
RUN pip install --no-cache-dir -r requirements.txt

# Capa 6: Copiar todo el código fuente
COPY src/ .
COPY config/.env /app/.env

# Capa 7: Comando por defecto para ejecutar la aplicación
CMD ["python", "./app.py"]
