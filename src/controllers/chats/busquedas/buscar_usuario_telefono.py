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



# ========== HELPERS DE RESOLUCIÓN DE USUARIO ==========

def _get_user_by_phone(phone: str):
    c = (
        db.session.query(Contacto)
        .filter(Contacto.valor == phone)
        .filter(Contacto.is_active == True)
        .first()
    )
    if not c:
        return None
    return db.session.query(Usuario).filter(Usuario.id == c.user_id).first()


def _get_user_by_email_like(q: str):
    return (
        db.session.query(Usuario)
        .filter(Usuario.correo_electronico.ilike(f"%{q}%"))
        .first()
    )


# ========== HELPERS DE DATOS DEL USUARIO ==========

def _get_publicaciones_de_usuario(user_id: int) -> list[dict]:
    """Todas las publicaciones del usuario, normalizadas."""
    pubs = (
        db.session.query(Publicacion)
        .filter(Publicacion.user_id == user_id)
        .order_by(Publicacion.fecha_creacion.desc())
        .all()
    )
    out = []
    for p in pubs:
        out.append({
            "id": p.id,
            "titulo": p.titulo,
            "ambito": p.ambito,                    # <- string, ej: "salud"
            "categoria_id": p.categoria_id,        # <- FK opcional
            "idioma": p.idioma or "es",
            "codigo_postal": p.codigoPostal,
            "estado": p.estado,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
        })
    return out


def _get_ambitos_from_db_by_name(nombres: set[str]) -> dict:
    """
    Trae de la tabla ambitos los que coincidan por nombre.
    Devuelve dict {nombre: {...ambito...}}
    """
    if not nombres:
        return {}
    rows = (
        db.session.query(Ambitos)
        .filter(Ambitos.nombre.in_(list(nombres)))
        .all()
    )
    out = {}
    for a in rows:
        out[a.nombre] = {
            "id": a.id,
            "nombre": a.nombre,
            "descripcion": a.descripcion,
            "idioma": a.idioma,
            "valor": a.valor,
            "estado": a.estado,
        }
    return out


def _get_codigos_postales_from_pubs(pubs: list[dict]) -> list[str]:
    seen = set()
    cps = []
    for p in pubs:
        cp = p.get("codigo_postal")
        if not cp:
            continue
        if cp in seen:
            continue
        seen.add(cp)
        cps.append(cp)
    return cps


def _get_categorias_from_pubs(pubs: list[dict]) -> set[int]:
    """categoría que está DIRECTO en publicacion.categoria_id"""
    cats = set()
    for p in pubs:
        cid = p.get("categoria_id")
        if cid:
            cats.add(cid)
    return cats


def _get_categorias_from_categoriaPublicacion(pub_ids: list[int]) -> set[int]:
    """
    Si usaste la tabla puente categoriaPublicacion,
    acá levantamos categorías adicionales que no estaban en publicacion.categoria_id.
    """
    if not pub_ids:
        return set()
    rows = (
        db.session.query(CategoriaPublicacion)
        .filter(CategoriaPublicacion.publicacion_id.in_(pub_ids))
        .all()
    )
    cats = set()
    for r in rows:
        if r.categoria_id:
            cats.add(r.categoria_id)
    return cats


def _get_categorias_de_ambito(ambito_id: int) -> list[dict]:
    """
    Dado un ambito_id (tabla ambitos.id), trae las categorías
    relacionadas en ambitoCategoriaRelation -> ambitoCategoria.
    """
    rels = (
        db.session.query(AmbitoCategoriaRelation)
        .filter(AmbitoCategoriaRelation.ambito_id == ambito_id)
        .all()
    )
    if not rels:
        return []

    cat_ids = [r.ambitoCategoria_id for r in rels]
    cats = (
        db.session.query(AmbitoCategoria)
        .filter(AmbitoCategoria.id.in_(cat_ids))
        .all()
    )
    out = []
    for c in cats:
        out.append({
            "id": c.id,
            "nombre": c.nombre,
            "descripcion": c.descripcion,
            "idioma": c.idioma,
            "valor": c.valor,
            "estado": c.estado,
            "categoria_general_id": c.categoria_general_id,
        })
    return out


# ========== ENDPOINT PRINCIPAL ==========

@buscar_usuario_telefono.route('/api/chat/identidad-buscar', methods=['POST'])
def identidad_buscar():
    data = request.get_json(silent=True) or {}
    q   = (data.get('q') or '').strip()
    typ = (data.get('type') or '').strip() or 'name'

    if not q:
        return jsonify({"ok": False, "error": "query-empty"}), 400

    # 1) resolver usuario
    if typ == "phone":
        user = _get_user_by_phone(q)
    elif typ == "alias":
        # todavía no tenemos alias
        user = None
    else:
        user = _get_user_by_email_like(q)

    # ------- si NO hay usuario: devolvemos estructura vacía -------
    if not user:
        return jsonify({
            "ok": True,
            "user": {
                "id": 0,
                "nombre": f"Mock · {q}",
                "alias": None,
                "tel": q if typ == "phone" else None,
            },
            "publicaciones": [],
            "ambitos": [],
            "categorias": [],
            "codigos_postales": [],
            "idiomas": ["es"],
        }), 200

    # 2) publicaciones del user
    pubs = _get_publicaciones_de_usuario(user.id)

    # 3) ámbitos a partir de las pubs
    nombres_amb = {p["ambito"] for p in pubs if p.get("ambito")}
    amb_db = _get_ambitos_from_db_by_name(nombres_amb)

    # armamos lista final de ámbitos
    ambitos_final = []
    for nombre in nombres_amb:
        if nombre in amb_db:
            # ámbito real de tabla
            a = amb_db[nombre]
            # y le pegamos las categorías de ese ámbito
            a["categorias"] = _get_categorias_de_ambito(a["id"])
            ambitos_final.append(a)
        else:
            # ámbito que vino como string en publicación pero no está en tabla
            ambitos_final.append({
                "id": None,
                "nombre": nombre,
                "descripcion": None,
                "idioma": None,
                "valor": None,
                "estado": None,
                "categorias": [],  # no podemos resolver
            })

    # 4) códigos postales
    cps = _get_codigos_postales_from_pubs(pubs)

    # 5) idiomas
    idiomas = []
    seen_lang = set()
    for p in pubs:
        lang = p.get("idioma") or "es"
        if lang not in seen_lang:
            seen_lang.add(lang)
            idiomas.append(lang)

    # 6) categorías usadas POR el user (dos fuentes)
    pub_ids = [p["id"] for p in pubs]
    cats_direct = _get_categorias_from_pubs(pubs)
    cats_bridge = _get_categorias_from_categoriaPublicacion(pub_ids)
    categorias_usuario = list(cats_direct.union(cats_bridge))

    # ------- respuesta final -------
    resp = {
        "ok": True,
        "user": {
            "id": user.id,
            "nombre": getattr(user, "correo_electronico", None),
            "alias": None,
            "tel": q if typ == "phone" else None,
        },
        "publicaciones": pubs,
        "ambitos": ambitos_final,
        "categorias": categorias_usuario,
        "codigos_postales": cps,
        "idiomas": idiomas,
    }

    print("\n=== /api/chat/identidad-buscar → RESPONSE MOCK ===")
    print(resp)
    print("=================================================\n")

    return jsonify(resp), 200