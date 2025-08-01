from dotenv import load_dotenv
import os

from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

user = os.environ["MYSQL_USER"]
password = os.environ["MYSQL_PASSWORD"]
host = os.environ["MYSQL_HOST"]
database = os.environ["MYSQL_DATABASE"]
port = os.environ["MYSQL_PORT"]  # Asegúrate de tener la variable de entorno MYSQL_PORT configurada



#DATABASE_CONNECTION_URI = f'mysql+pymysql://{user}:{password}@{host}/{database}'
DATABASE_CONNECTION_URI = f'mysql+pymysql://{user}:{password}@{host}:{port}/{database}'
#print(DATABASE_CONNECTION_URI)

# Obtener las variables de entorno
sdk_prueba = os.getenv('sdk_prueba')#test
sdk_produccion = os.getenv('sdk_produccion') #test
MERCADOPAGO_KEY_API = os.getenv('MERCADOPAGO_KEY_API')#para produccion
MERCADOPAGO_URL = os.getenv('MERCADOPAGO_URL')
DOMAIN = os.getenv('DOMAIN')

