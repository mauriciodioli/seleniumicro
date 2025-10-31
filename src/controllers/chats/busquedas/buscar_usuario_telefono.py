from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from extensions import db
from sqlalchemy import func
from models.usuario import Usuario
from sqlalchemy.exc import SQLAlchemyError
from models.publicaciones.publicaciones import Publicacion
from models.publicaciones.estado_publi_usu import Estado_publi_usu
from models.publicaciones.publicacion_imagen_video import Public_imagen_video
from models.usuarioRegion import UsuarioRegion
from models.usuarioUbicacion import UsuarioUbicacion
from models.usuarioPublicacionUbicacion import UsuarioPublicacionUbicacion
from models.publicaciones.ambitoCategoria import AmbitoCategoria
from models.publicaciones.categoriaPublicacion import CategoriaPublicacion
from models.publicaciones.publicacionCodigoPostal import PublicacionCodigoPostal
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambito_usuario import Ambito_usuario
from models.publicaciones.ambitoCategoriaRelation import AmbitoCategoriaRelation
from models.categoriaCodigoPostal import CategoriaCodigoPostal
from models.publicaciones.categoria_general import CategoriaGeneral, CategoriaTraduccion, normalizar_slug
from models.image import Image
from models.video import Video
from models.chats.contacto import Contacto
from models.codigoPostal import CodigoPostal
from controllers.conexionesSheet.datosSheet import  actualizar_estado_en_sheet
from models.publicaciones.ambito_general import get_or_create_ambito

import controllers.conexionesSheet.datosSheet as datoSheet
import os
import random
import re
from datetime import datetime
from werkzeug.utils import secure_filename


buscar_usuario_telefono = Blueprint('buscar_usuario_telefono',__name__)

autenticado_sheet = False

# 1. Calcula la ruta al directorio raíz de tu proyecto (dos niveles arriba de este archivo)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


@buscar_usuario_telefono.route('/api/chat/identidad-buscar', methods=['POST'])
def identidad_buscar():
    data = request.get_json(silent=True) or {}
    q   = (data.get('q') or '').strip()
    typ = (data.get('type') or '').strip() or 'name'

    if not q:
        return jsonify({"ok": False, "error": "query-empty"}), 400

    user = None

    if typ == 'phone':
        # 1) buscar contacto con ese teléfono
        c = (
            db.session.query(Contacto)
            .filter(Contacto.valor == q)
            .filter(Contacto.is_active == True)
            .first()
        )
        if c:
            user = db.session.query(Usuario).filter(Usuario.id == c.user_id).first()

    elif typ == 'alias':
        # tu modelo Usuario NO tiene alias → por ahora mock
        user = None
    else:
        # name / fallback → tu modelo tampoco tiene nombre → usamos correo
        user = (
            db.session.query(Usuario)
            .filter(Usuario.correo_electronico.ilike(f"%{q}%"))
            .first()
        )

    # si no hay user → devolvemos mock para que el front no muera
    if not user:
        return jsonify({
            "ok": True,
            "user": {
                "id": 0,
                "nombre": f"Mock · {q}",
                "alias": None,
                "tel": q if typ == 'phone' else None,
                "micrositio": None,
                "idioma": "es",
                "url": None,
                "last_msg": None,
            }
        })

    # si hay user → buscamos la última publicación de ese user
    pub = (
        db.session.query(Publicacion)
        .filter(Publicacion.user_id == user.id)
        .order_by(Publicacion.fecha_creacion.desc())
        .first()
    )

    return jsonify({
        "ok": True,
        "user": {
            "id": user.id,
            "nombre": getattr(user, 'correo_electronico', None),
            "alias": None,  # no hay alias en tu modelo
            "tel": q if typ == 'phone' else None,
            "micrositio": getattr(pub, 'ambito', None),
            "idioma": getattr(pub, 'idioma', None) or 'es',
            "url": None,
            "last_msg": None,
        }
    })