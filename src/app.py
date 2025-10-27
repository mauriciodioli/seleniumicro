from flask import Flask
from flask_cors import CORS  # ⬅️ nuevo
from config import DATABASE_CONNECTION_URI
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from models.chats import *

from extensions import db, ma

app = Flask(__name__)

# --- Config ---
app.secret_key = '*0984632'
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_CONNECTION_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_POOL_RECYCLE'] = 280
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 10
ALLOWED_ORIGINS = [
    # DEV
    "http://127.0.0.1:5001",
    "http://localhost:5001",
    # PROD (ajusta a tus dominios reales)
    "https://dpia.site",
    "https://www.dpia.site",
    # si usas IP directa para pruebas
    "http://54.234.169.22:5001",
    "http://54.234.169.22",
]

CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS},r"/admin/*": {"origins": ALLOWED_ORIGINS}},    
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    supports_credentials=False,
    max_age=86400,
)
# Extensiones
db.init_app(app)
ma.init_app(app)

# Blueprints
from controllers.selenium_controller import selenium_controller
from controllers.conexionesSheet.datosSheet import datoSheet
from controllers.publicaciones import publicaciones
from controllers.conexionesSheet.conexion_externa import conexion_externa
from controllers.scrape_amazon_dpia import scrape_amazon_dpia
from controllers.filtro_publicacion import filtro_publicacion
from controllers.chats import chat_bp

app.register_blueprint(chat_bp)



app.register_blueprint(selenium_controller)
app.register_blueprint(datoSheet)
app.register_blueprint(conexion_externa)
app.register_blueprint(publicaciones)
app.register_blueprint(scrape_amazon_dpia)
app.register_blueprint(filtro_publicacion)




@app.teardown_appcontext
def cleanup_scoped_session(exc):
    try:
        db.session.remove()
    except Exception:
        pass

# ---------- Crear tablas (incluye 'popup') ----------
with app.app_context():
    # IMPORTA el/los modelos con LA MISMA instancia de db (extensions.db)
   
    # Log de sanity check
    print("DB URL:", db.engine.url)
    print("Metadata antes:", list(db.metadata.tables.keys()))

    # Crea TODO lo mapeado
    db.create_all()



    print("Metadata después:", list(db.metadata.tables.keys()))
    print("Tablas creadas/verificadas (create_all).")
# Probar conexión
def test_db_connection():
    
    try:
        with app.app_context():
            db.engine.connect()
            
            print("Conexión exitosa a la base de datos.")
    except OperationalError as e:
        print(f"Error de conexión a la base de datos: {e}")
    except SQLAlchemyError as e:
        print(f"Error en SQLAlchemy: {e}")

test_db_connection()

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)
