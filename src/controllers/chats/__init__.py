from flask import Blueprint
chat_bp = Blueprint("chat_bp", __name__, url_prefix="/chats")

# importa vistas para registrar rutas
from . import chat_controller, endpoint_controller  # noqa
