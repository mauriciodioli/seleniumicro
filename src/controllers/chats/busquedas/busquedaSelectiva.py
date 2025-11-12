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
from sqlalchemy import case



busquedaSelectiva = Blueprint('busquedaSelectiva',__name__)

autenticado_sheet = False

# 1. Calcula la ruta al directorio raíz de tu proyecto (dos niveles arriba de este archivo)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# ===================== CASCADA · ENDPOINTS =====================
@busquedaSelectiva.route('/api/cascade/cps', methods=['POST'])
def api_cascade_cps():
    try:
        cps = (
            db.session.query(
                Publicacion.codigoPostal.label('cp'),
                func.coalesce(CodigoPostal.ciudad, '').label('ciudad'),
                func.count(Publicacion.id).label('n')
            )
            .outerjoin(CodigoPostal, CodigoPostal.codigoPostal == Publicacion.codigoPostal)
            .filter(Publicacion.codigoPostal.isnot(None))
            .group_by(Publicacion.codigoPostal, CodigoPostal.ciudad)
            .order_by(Publicacion.codigoPostal.asc())
            .all()
        )
        items = [{'cp': r.cp, 'ciudad': r.ciudad, 'label': f"{r.ciudad+' — ' if r.ciudad else ''}{r.cp}", 'n': r.n} for r in cps]
        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        db.session.rollback(); return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()


@busquedaSelectiva.route('/api/cascade/dominios', methods=['POST'])
def api_cascade_dominios():
    data = request.get_json(silent=True) or {}
    cp = (data.get('cp') or '').strip()
    if not cp: return jsonify({'ok': False, 'error': 'cp requerido'}), 400
    try:
        dominios = (
            db.session.query(Publicacion.ambito, func.count(Publicacion.id))
            .filter(Publicacion.codigoPostal == cp)
            .group_by(Publicacion.ambito)
            .order_by(Publicacion.ambito.asc())
            .all()
        )
        items = [{'valor': d[0], 'label': d[0], 'n': d[1]} for d in dominios if d[0]]
        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        db.session.rollback(); return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()


@busquedaSelectiva.route('/api/cascade/categorias', methods=['POST'])
def api_cascade_categorias():
    data = request.get_json(silent=True) or {}
    cp  = (data.get('cp')  or '').strip()
    dom = (data.get('dom') or '').strip()
    if not cp or not dom: return jsonify({'ok': False, 'error': 'cp y dom requeridos'}), 400
    try:
        subq = (db.session.query(Publicacion.id)
                .filter(Publicacion.codigoPostal == cp, Publicacion.ambito == dom)
                .subquery())

        rows = (
            db.session.query(
                AmbitoCategoria.id.label('id'),
                AmbitoCategoria.nombre.label('nombre'),
                AmbitoCategoria.valor.label('valor'),
                func.count(CategoriaPublicacion.publicacion_id).label('n')
            )
            .join(CategoriaPublicacion, CategoriaPublicacion.categoria_id == AmbitoCategoria.id)
            .filter(CategoriaPublicacion.publicacion_id.in_(db.session.query(subq.c.id)))
            .group_by(AmbitoCategoria.id, AmbitoCategoria.nombre, AmbitoCategoria.valor)
            .order_by(AmbitoCategoria.nombre.asc())
            .all()
        )
        items = [{'id': r.id, 'label': r.nombre or f"Cat {r.id}", 'valor': r.valor, 'n': r.n} for r in rows]
        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        db.session.rollback(); return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()


@busquedaSelectiva.route('/api/cascade/publicaciones/sinCP/', methods=['POST'])
def api_cascade_publicaciones_sinCp():
    data = request.get_json(silent=True) or {}
    cp  = (data.get('cp')  or '').strip()
    dom = (data.get('dom') or '').strip()
    cat = str(data.get('cat') or '').strip()
    user_id = data.get('user_id')  # opcional

    if not dom or not cat.isdigit():
        return jsonify({'ok': False, 'error': 'cp, dom y cat válidos requeridos'}), 400
    cat_id = int(cat)

    q = (
        db.session.query(Publicacion)
        .join(CategoriaPublicacion, CategoriaPublicacion.publicacion_id == Publicacion.id)
        .filter(
            Publicacion.ambito == dom,
            CategoriaPublicacion.categoria_id == cat_id
        )
    )
    if str(user_id).isdigit():
        q = q.filter(Publicacion.user_id == int(user_id))

    rows = (
        q.order_by(Publicacion.fecha_creacion.desc(), Publicacion.id.desc())
         .limit(200)
         .all()
    )

    items = [{
        'id': p.id,
        'titulo': p.titulo,
        'ambito': p.ambito,
        'categoria_id': cat_id,
        'idioma': p.idioma,
        'codigo_postal': p.codigoPostal,
        'estado': p.estado,
        'fecha_creacion': (p.fecha_creacion.isoformat() if hasattr(p.fecha_creacion, 'isoformat') else str(p.fecha_creacion)),
        'user_id': p.user_id,
        'imagen': getattr(p, 'imagen', None),
        'descripcion': getattr(p, 'descripcion', None),
    } for p in rows]

    return jsonify({'ok': True, 'items': items})





@busquedaSelectiva.route('/api/cascade/publicaciones', methods=['POST'])
def api_cascade_publicaciones():
    data = request.get_json(silent=True) or {}
    cp  = (data.get('cp')  or '').strip()
    dom = (data.get('dom') or '').strip()
    cat = str(data.get('cat') or '').strip()
    user_id = data.get('user_id')  # opcional

    if not cp or not dom or not cat.isdigit():
        return jsonify({'ok': False, 'error': 'cp, dom y cat válidos requeridos'}), 400
    cat_id = int(cat)

    q = (
        db.session.query(Publicacion)
        .join(CategoriaPublicacion, CategoriaPublicacion.publicacion_id == Publicacion.id)
        .filter(
            Publicacion.codigoPostal == cp,
            Publicacion.ambito == dom,
            CategoriaPublicacion.categoria_id == cat_id
        )
    )
    if str(user_id).isdigit():
        q = q.filter(Publicacion.user_id == int(user_id))

    rows = (
        q.order_by(Publicacion.fecha_creacion.desc(), Publicacion.id.desc())
         .limit(200)
         .all()
    )

    items = [{
        'id': p.id,
        'titulo': p.titulo,
        'ambito': p.ambito,
        'categoria_id': cat_id,
        'idioma': p.idioma,
        'codigo_postal': p.codigoPostal,
        'estado': p.estado,
        'fecha_creacion': (p.fecha_creacion.isoformat() if hasattr(p.fecha_creacion, 'isoformat') else str(p.fecha_creacion)),
        'user_id': p.user_id,
        'imagen': getattr(p, 'imagen', None),
        'descripcion': getattr(p, 'descripcion', None),
    } for p in rows]

    return jsonify({'ok': True, 'items': items})



@busquedaSelectiva.route('/api/cascade/publicacion', methods=['POST'])
def api_cascade_publicacion():
    data = request.get_json(silent=True) or {}
    pub_id = data.get('id')
    if not pub_id: return jsonify({'ok': False, 'error': 'id requerido'}), 400
    try:
        p = db.session.get(Publicacion, int(pub_id))
        if not p: return jsonify({'ok': False, 'error': 'no encontrada'}), 404
        item = {
            'id': p.id,
            'titulo': p.titulo,
            'ambito': p.ambito,
            'idioma': p.idioma,
            'codigo_postal': p.codigoPostal,
            'estado': p.estado,
            'fecha_creacion': (p.fecha_creacion.isoformat() if hasattr(p.fecha_creacion, 'isoformat') else str(p.fecha_creacion)),
            'user_id': p.user_id,
            'imagen': getattr(p, 'imagen', None),
            'descripcion': getattr(p, 'descripcion', None),
            'precio': getattr(p, 'precio', None),
            'moneda': getattr(p, 'moneda', None),
        }
        return jsonify({'ok': True, 'item': item})
    except Exception as e:
        db.session.rollback(); return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()




@busquedaSelectiva.route('/api/cascade/usuarios', methods=['POST'])
def api_cascade_usuarios():
    data = request.get_json(silent=True) or {}
    cp  = (data.get('cp')  or '').strip()
    dom = (data.get('dom') or '').strip()
    cat = str(data.get('cat') or '').strip()
    if not cp or not dom or not cat.isdigit():
        return jsonify({'ok': False, 'error': 'cp, dom y cat válidos requeridos'}), 400
    cat_id = int(cat)

    try:
        # usuarios que publicaron en ese cp/dom/cat
        q = (
            db.session.query(
                Publicacion.user_id.label('user_id'),
                func.count(Publicacion.id).label('n')
            )
            .join(CategoriaPublicacion, CategoriaPublicacion.publicacion_id == Publicacion.id)
            .filter(
                Publicacion.codigoPostal == cp,
                Publicacion.ambito == dom,
                CategoriaPublicacion.categoria_id == cat_id
            )
            .group_by(Publicacion.user_id)
            .order_by(func.count(Publicacion.id).desc())
            .all()
        )

        # armar etiqueta legible
        items = []
        for r in q:
            u = db.session.get(Usuario, r.user_id)
            nombre = getattr(u, 'nombre', None) or getattr(u, 'correo_electronico', None) or f'Usuario {r.user_id}'
            items.append({'id': r.user_id, 'nombre': nombre, 'n': int(r.n)})

        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        db.session.rollback(); return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()




@busquedaSelectiva.route('/api/cascade/usuario/publicaciones', methods=['POST'])
def api_cascade_usuario_publicaciones():
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'ok': False, 'error': 'user_id requerido'}), 400

    try:
        rows = (
            db.session.query(Publicacion)
            .filter(
                Publicacion.user_id == int(user_id),
                Publicacion.estado.isnot(None),
                ~func.lower(Publicacion.estado).in_(['pendiente', 'pendientes'])
            )
            .order_by(Publicacion.fecha_creacion.desc(), Publicacion.id.desc())
            .limit(500)
            .all()
        )

        items = [{
            'id': p.id,
            'titulo': p.titulo,
            'ambito': p.ambito,
            'categoria_id': getattr(p, 'categoria_id', None),
            'idioma': p.idioma,
            'codigo_postal': p.codigoPostal,
            'estado': p.estado,
            'fecha_creacion': (p.fecha_creacion.isoformat() if hasattr(p.fecha_creacion, 'isoformat') else str(p.fecha_creacion)),
            'user_id': p.user_id,
            'imagen': getattr(p, 'imagen', None),
            'descripcion': getattr(p, 'descripcion', None),
            'precio': getattr(p, 'precio', None),
            'moneda': getattr(p, 'moneda', None),
        } for p in rows]

        return jsonify({'ok': True, 'items': items})
    except Exception as e:
        db.session.rollback()
        return jsonify({'ok': False, 'error': str(e)}), 500
    finally:
        db.session.close()
