# Capa 1: Imagen base
FROM python:3.12-slim

# Capa 2: Configurar el directorio de trabajo
WORKDIR /app

# Capa 3: Copiar solo el archivo de requisitos para aprovechar la caché
COPY src/requirements.txt .

# Capa 4: Instalar dependencias desde el archivo de requisitos
RUN pip install --no-cache-dir -r requirements.txt


# Capa 6: Copiar todo el código fuente
COPY src/ .

# Capa 7: Comando por defecto para ejecutar la aplicación
CMD ["python", "./app.py"]

