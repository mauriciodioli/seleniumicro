# routes/codigos_postales.py
from flask import Blueprint, render_template, request, jsonify, current_app
from utils.db_session import get_db_session
from models.codigoPostal import CodigoPostal
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambito_codigo_postal import AmbitoCodigoPostal
from models.publicaciones.ambitoCategoria import AmbitoCategoria
from models.publicaciones.categoriaCodigoPostal import CategoriaCodigoPostal

from models.chats.contacto import Contacto

from sqlalchemy.exc import IntegrityError
import re

whatssapp = Blueprint('whatssapp', __name__)  # si ya existe así en otros lados, mantenelo

DEFAULT_PUBLICACION_ID = 41   # <- NUNCA 0 en una FK opcional
DEFAULT_AMBITO_ID      = 1      # <- Debe existir en BD
DEFAULT_CATEGORIA_ID   = 1      # <- Debe existir en BD
DEFAULT_CP_ID          = None   # <- 99999 va a romper si no existe

# --- Schemas (Marshmallow) ---------------------------------------------------
# --- Página (vista) -----------------------------------------------------------
@whatssapp.route('/social-chats-whatssapp/', methods=['GET'])
def pagina_chats_whatssapp():
    with get_db_session() as session:
        datos = session.query(CodigoPostal).order_by(CodigoPostal.id.asc()).all()
        return render_template('media/whatssapp.html', datos=datos, layout='layout_administracion')

# --- Helpers -----------------------------------------------------------------
def _validate_e164(valor: str) -> str:
    v = (valor or "").strip().replace(" ", "")
    if not re.fullmatch(r"\+\d{8,}", v):
        raise ValueError("Número en formato internacional (+E.164), ej: +393445977100")
    return v

# --- Listar ------------------------------------------------------------------
@whatssapp.route('/social-chats-whatssapp/whatsapp', methods=['GET']) 
def whatsapp_list():
    user_id        = request.args.get('user_id', type=int)
    publicacion_id = request.args.get('publicacion_id', type=int)
    is_active      = request.args.get('is_active', default=1, type=int)

    with get_db_session() as session:
        q = session.query(Contacto).filter(Contacto.tipo == 'whatsapp')

        if user_id is not None:
            q = q.filter(Contacto.user_id == user_id)
        if publicacion_id is not None:
            q = q.filter(Contacto.publicacion_id == publicacion_id)
        if is_active in (0, 1):
            q = q.filter(Contacto.is_active == bool(is_active))

        items = q.order_by(Contacto.is_primary.desc(), Contacto.id.desc()).all()

        resultados = []
        for item in items:
            resultados.append({
                "id": item.id,
                "user_id": item.user_id,
                "publicacion_id": item.publicacion_id,
                "tipo": item.tipo,
                "valor": item.valor,
                "codigo_postal_id": item.codigo_postal_id,
                "ambito_id": item.ambito_id,
                "categoria_id": item.categoria_id,
                "is_primary": item.is_primary,
                "is_active": item.is_active,
                "created_at": item.created_at.isoformat() if item.created_at else None,
                "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            })

        return jsonify(resultados), 200




def limpiar_y_convertir(valor_raw):
    """int si es válido; si está vacío o null, devuelve None"""
    if valor_raw is None:
        return None
    if isinstance(valor_raw, str) and valor_raw.strip() == '':
        return None
    try:
        return int(valor_raw)
    except (ValueError, TypeError):
        return None


@whatssapp.route('/social-chats-whatssapp/whatsapp', methods=['POST'])
def whatsapp_create():
    data = request.get_json(force=True) or {}

    user_id = int(data['user_id'])
    valor   = _validate_e164(data['valor'])
    is_primary = bool(data.get('is_primary', False))

    # ---- Normalización segura ----
    publicacion_id = limpiar_y_convertir(data.get('publicacion_id'))
    if publicacion_id in (0, None):
        publicacion_id = 41  # <- default

    ambito_id = limpiar_y_convertir(data.get('ambito_rel_id')) or 1
    categoria_id = limpiar_y_convertir(data.get('categoria_rel_id')) or 1

    # codigo_postal: si te llega un “código” y no el id, resolvelo acá
    codigo_postal_id = limpiar_y_convertir(data.get('codigo_postal_id'))
    if codigo_postal_id in (0, None):
        codigo_postal_id = None
    else:
        with get_db_session() as s:
            # ajustá el campo según tu modelo real (codigo vs codigoPostal)
            cp = (s.query(CodigoPostal)
                        .filter(CodigoPostal.codigoPostal == str(codigo_postal_id))
                        .first())
            if not cp:
                return jsonify({'error': 'codigo_postal_id no existe'}), 400
            codigo_postal_id = cp.id

    with get_db_session() as session:
        # 🔍 Buscar si ya existe contacto del mismo user/tipo/publicacion
        q = session.query(Contacto).filter(
            Contacto.user_id == user_id,
            Contacto.tipo == 'whatsapp',
        )
        if publicacion_id is None:
            q = q.filter(Contacto.publicacion_id.is_(None))
        else:
            q = q.filter(Contacto.publicacion_id == publicacion_id)

        existente = q.one_or_none()

        # Si se marca como primary, apagar otros antes (mismo user/tipo)
        if is_primary:
            session.query(Contacto).filter(
                Contacto.user_id == user_id,
                Contacto.tipo == 'whatsapp'
            ).update({'is_primary': is_primary}, synchronize_session=False)

        if existente:
            # ✅ UPDATE
            existente.valor = valor
            existente.codigo_postal_id = codigo_postal_id
            existente.ambito_id = ambito_id
            existente.categoria_id = categoria_id
            existente.is_primary = is_primary
            # si tenés updated_at auto, buenísimo; si no:
            # existente.updated_at = datetime.utcnow()
            session.flush()
            obj = existente
        else:
            # ➕ INSERT
            obj = Contacto(
                user_id=user_id,
                publicacion_id=publicacion_id,
                tipo='whatsapp',
                valor=valor,
                codigo_postal_id=codigo_postal_id,
                ambito_id=ambito_id,
                categoria_id=categoria_id,
                is_primary=is_primary,
                is_active=True,
            )
            session.add(obj)
            session.flush()

        resp = {
            "id": obj.id,
            "user_id": obj.user_id,
            "publicacion_id": obj.publicacion_id,
            "tipo": obj.tipo,
            "valor": obj.valor,
            "codigo_postal_id": obj.codigo_postal_id,
            "ambito_id": obj.ambito_id,
            "categoria_id": obj.categoria_id,
            "is_primary": obj.is_primary,
            "is_active": obj.is_active,
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
            "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
        }
        return jsonify(resp), 200 if existente else 201


 
@whatssapp.route('/social-chats-whatssapp/whatsapp/primary', methods=['POST'])
def whatsapp_get_primary_post():
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id', None)
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({'error': 'user_id requerido'}), 400
    if user_id <= 0:
        return jsonify({'error': 'user_id requerido'}), 400

    with get_db_session() as s:
        c = (s.query(Contacto)
               .filter(Contacto.user_id == user_id,
                       Contacto.tipo == 'whatsapp',
                       Contacto.is_primary.is_(True))
               .first())
        if not c:
            return jsonify({'error': 'No encontrado'}), 404

        return jsonify({'valor': c.valor}), 200


# --- Actualizar --------------------------------------------------------------
@whatssapp.route('/social-chats-whatssapp/whatsapp/<int:contact_id>', methods=['PUT', 'PATCH'])
def whatsapp_update(contact_id: int):
    data = request.get_json(force=True) or {}
    try:
        with get_db_session() as session:
            c = session.get(Contacto, contact_id)
            if not c or c.tipo != 'whatsapp':
                return jsonify({'error': 'No encontrado'}), 404

            if 'valor' in data:
                c.valor = _validate_e164(data['valor'])
            if 'is_active' in data:
                c.is_active = bool(data['is_active'])

            if 'is_primary' in data:
                make_primary = bool(data['is_primary'])
                if make_primary:
                    session.query(Contacto).filter(
                        Contacto.user_id == c.user_id,
                        Contacto.tipo == 'whatsapp',
                        Contacto.publicacion_id.is_(c.publicacion_id)
                    ).update({'is_primary': False})
                c.is_primary = make_primary

            session.commit()   # <- importante
            return jsonify(contact_schema.dump(c)), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except IntegrityError:
        return jsonify({'error': 'Duplicado para ese contexto'}), 409
    except Exception:
        current_app.logger.exception('whatsapp_update error')
        return jsonify({'error': 'Error interno'}), 500

# --- Borrar ------------------------------------------------------------------
@whatssapp.route('/social-chats-whatssapp/whatsapp/<int:contact_id>', methods=['DELETE'])
def whatsapp_delete(contact_id: int):
    try:
        with get_db_session() as session:
            c = session.get(Contacto, contact_id)
            if not c or c.tipo != 'whatsapp':
                return jsonify({'error': 'No encontrado'}), 404
            session.delete(c)
            session.commit()   # <- importante
            return jsonify({'ok': True}), 200
    except Exception:
        current_app.logger.exception('whatsapp_delete error')
        return jsonify({'error': 'Error interno'}), 500
