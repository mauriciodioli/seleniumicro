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
from utils.db_session import get_db_session
from utils.chat_pairs import get_chat_scopes_for_pair
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

def _get_user_by_phone(session,phone: str):
    c = (
        session.query(Contacto)
        .filter(Contacto.valor == phone)
        .filter(Contacto.is_active == True)
        .first()
    )
    if not c:
        return None
    return session.query(Usuario).filter(Usuario.id == c.user_id).first()


def _get_user_by_email_like(session,q: str):
    return (
        session.query(Usuario)
        .filter(Usuario.correo_electronico.ilike(f"%{q}%"))
        .first()
    )


# ========== HELPERS DE DATOS DEL USUARIO ==========

def _get_publicaciones_de_usuario(session,user_id: int) -> list[dict]:
    """Todas las publicaciones del usuario, normalizadas (excluye 'pendiente')."""
    pubs = (
        session.query(Publicacion)
        .filter(
            Publicacion.user_id == user_id,
            Publicacion.estado != 'pendiente'   
        )
        .order_by(Publicacion.fecha_creacion.desc())
        .all()
    )

    out = []
    for p in pubs:
        out.append({
            "id": p.id,
            "titulo": p.titulo,
            "ambito": p.ambito,
            "categoria_id": p.categoria_id,
            "idioma": p.idioma or "es",
            "imagen": p.imagen,
            "descripcion": p.descripcion,
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
        .filter(Ambitos.valor.in_(list(nombres)))
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
    """Extrae códigos postales únicos desde el listado de publicaciones."""
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


def _get_categorias_from_pubs(user_id,pubs: list[dict]) -> set[int]:
    """categoría que está DIRECTO en publicacion.categoria_id"""
    cats = set()
    for p in pubs:
        cid = p.get("categoria_id")
        if cid:
            cats.add(cid)
    return cats


def _get_categorias_from_categoriaPublicacion(session,pub_ids: list[int]) -> set[int]:
    """
    Si usaste la tabla puente categoriaPublicacion,
    acá levantamos categorías adicionales que no estaban en publicacion.categoria_id.
    """
    if not pub_ids:
        return set()
    rows = (
        session.query(CategoriaPublicacion)
        .filter(CategoriaPublicacion.publicacion_id.in_(pub_ids))
        .all()
    )
    cats = set()
    for r in rows:
        if r.categoria_id:
            cats.add(r.categoria_id)
    return cats


def _get_categorias_de_ambito(session,ambito_id: int) -> list[dict]:
    """
    Dado un ambito_id (tabla ambitos.id), trae las categorías
    relacionadas en ambitoCategoriaRelation -> ambitoCategoria.
    """
    rels = (
        session.query(AmbitoCategoriaRelation)
        .filter(AmbitoCategoriaRelation.ambito_id == ambito_id)
        .all()
    )
    if not rels:
        return []

    cat_ids = [r.ambitoCategoria_id for r in rels]
    cats = (
        session.query(AmbitoCategoria)
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
@buscar_usuario_telefono.route('/buscar_usuario_telefono/api/chat/identidad-buscar/', methods=['POST'])
def identidad_buscar():
    data = request.get_json(silent=True) or {}
    q   = (data.get('q') or '').strip()
    typ = (data.get('type') or '').strip() or 'name'

    # opcional: id del que está mirando (viewer)
    viewer_id = data.get('viewer_user_id')
    try:
        viewer_id = int(viewer_id) if viewer_id is not None else None
    except (TypeError, ValueError):
        viewer_id = None

    if not q:
        return jsonify({"ok": False, "error": "query-empty"}), 400

    with get_db_session() as session:
        # 1) resolver usuario
        if typ == "phone":
            user = _get_user_by_phone(session, q)
        elif typ == "alias":
            user = None
        else:
            user = _get_user_by_email_like(session, q)

        # ------- si NO hay usuario: devolvemos estructura vacía / mock -------
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
        pubs = _get_publicaciones_de_usuario(session, user.id)

        # 3) categorías usadas POR el user (dos fuentes)
        pub_ids = [p["id"] for p in pubs]
        cats_direct = _get_categorias_from_pubs(user.id, pubs)
        cats_bridge = _get_categorias_from_categoriaPublicacion(session, pub_ids)
        categorias_usuario = set(cats_direct).union(cats_bridge)

        # 4) ámbitos a partir de las pubs
        nombres_amb = {p["ambito"] for p in pubs if p.get("ambito")}
        amb_db = _get_ambitos_from_db_by_name(nombres_amb)

        # índice por 'valor' (sin emoji), que es lo que traen las publicaciones
        amb_por_valor = {
            a["valor"]: a
            for a in amb_db.values()
            if a.get("valor")
        }

        # --- ámbitos “normales” del usuario ---
        ambitos_normales = []

        for nombre in nombres_amb:  # nombre = 'Health', 'Osobisty', etc.
            a = amb_por_valor.get(nombre)
            if a:
                a_out = dict(a)

                # TODAS las categorías del ámbito
                cats_ambito = _get_categorias_de_ambito(session, a_out["id"])

                # solo categorías donde el usuario tiene publicaciones
                cats_filtradas = [
                    c for c in cats_ambito
                    if c.get("id") in categorias_usuario
                ]

                a_out["categorias"] = cats_filtradas
                ambitos_normales.append(a_out)
            else:
                ambitos_normales.append({
                    "id": None,
                    "nombre": nombre,
                    "descripcion": None,
                    "idioma": None,
                    "valor": None,
                    "estado": None,
                    "categorias": [],
                })

        # --- ámbitos que vienen del historial de chat entre viewer y este user ---
        ambitos_finales = list(ambitos_normales)

        if viewer_id is not None:
            ambitos_chat = get_chat_scopes_for_pair(session, viewer_id, user.id)

            # ids de ámbito y categoría que aparecen en scopes de chat
            ambito_ids_chat = {s.get("ambito_id") for s in ambitos_chat if s.get("ambito_id")}
            categoria_ids_chat = {s.get("categoria_id") for s in ambitos_chat if s.get("categoria_id")}

            if ambito_ids_chat:
                amb_rows = (
                    session.query(Ambitos)
                    .filter(Ambitos.id.in_(ambito_ids_chat))
                    .all()
                )
            else:
                amb_rows = []

            if categoria_ids_chat:
                cat_rows = (
                    session.query(AmbitoCategoria)
                    .filter(AmbitoCategoria.id.in_(categoria_ids_chat))
                    .all()
                )
            else:
                cat_rows = []

            amb_db_by_id = {a.id: a for a in amb_rows}
            cat_db_by_id = {c.id: c for c in cat_rows}

            # índice de ámbitos ya armados (los "normales")
            amb_por_id = {a["id"]: a for a in ambitos_normales if a.get("id")}

            seen_pairs = set()

            for s in ambitos_chat:
                aid = s.get("ambito_id")
                cid = s.get("categoria_id")
                if not aid:
                    continue

                pair = (aid, cid)
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)

                a_row = amb_db_by_id.get(aid)
                if not a_row:
                    continue  # ámbito no encontrado en tabla ambitos

                # conseguir (o crear) el ámbito de salida
                a_out = amb_por_id.get(aid)
                if not a_out:
                    a_out = {
                        "id": a_row.id,
                        "nombre": a_row.nombre,
                        "descripcion": a_row.descripcion,
                        "idioma": a_row.idioma,
                        "valor": a_row.valor,
                        "estado": a_row.estado,
                        "categorias": [],
                    }
                    amb_por_id[aid] = a_out
                    ambitos_finales.append(a_out)

                # si hay categoría asociada, la agregamos
                if cid:
                    c_row = cat_db_by_id.get(cid)
                    if c_row:
                        ya_esta = any(c["id"] == cid for c in a_out.get("categorias", []))
                        if not ya_esta:
                            a_out.setdefault("categorias", []).append({
                                "id": c_row.id,
                                "nombre": c_row.nombre,
                                "descripcion": c_row.descripcion,
                                "idioma": c_row.idioma,
                                "valor": c_row.valor,
                                "estado": c_row.estado,
                                "categoria_general_id": c_row.categoria_general_id,
                                "from_chat": True,
                            })

        # 5) códigos postales
        cps = _get_codigos_postales_from_pubs(pubs)

        # 6) idiomas
        idiomas = []
        seen_lang = set()
        for p in pubs:
            lang = p.get("idioma") or "es"
            if lang not in seen_lang:
                seen_lang.add(lang)
                idiomas.append(lang)

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
            "ambitos": ambitos_finales,
            "categorias": list(categorias_usuario),
            "codigos_postales": cps,
            "idiomas": idiomas,
        }

        return jsonify(resp), 200
