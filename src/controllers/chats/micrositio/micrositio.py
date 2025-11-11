from flask import Blueprint, request, jsonify
from extensions import db
from models.publicaciones.publicaciones import Publicacion
from models.publicaciones.publicacion_imagen_video import Public_imagen_video
from models.image import Image
from models.video import Video

micrositio = Blueprint('micrositio', __name__)

def serialize_pub(p):
    return {
        'id': p.id, 'titulo': p.titulo, 'ambito': p.ambito, 'idioma': p.idioma,
        'codigo_postal': p.codigoPostal, 'estado': p.estado,
        'fecha_creacion': (p.fecha_creacion.isoformat() if getattr(p, 'fecha_creacion', None) else None),
        'user_id': p.user_id, 'imagen': getattr(p, 'imagen', None),
        'descripcion': getattr(p, 'descripcion', None),
        'precio': getattr(p, 'precio', None), 'moneda': getattr(p, 'moneda', None),
        'correo_electronico': getattr(p, 'correo_electronico', None),
    }

@micrositio.route('/api/micrositio/detalle', methods=['POST'])
def api_micrositio_detalle():
    data = request.get_json(silent=True) or {}
    pub_id = data.get('id')
    if not pub_id:
        return jsonify({'ok': False, 'error': 'id requerido'}), 400

    p = db.session.get(Publicacion, int(pub_id))
    if not p:
        return jsonify({'ok': False, 'error': 'no encontrada'}), 404

    rows = (
        db.session.query(Public_imagen_video, Image, Video)
        .outerjoin(Image, Public_imagen_video.imagen_id == Image.id)
        .outerjoin(Video, Public_imagen_video.video_id == Video.id)
        .filter(Public_imagen_video.publicacion_id == p.id)
        .order_by(Public_imagen_video.id.asc())
        .all()
    )
    media = []
    for rel, img, vid in rows:
        if img and img.filepath:
            media.append({'type': 'image', 'src': img.filepath, 'title': img.title or p.titulo})
        elif vid and getattr(vid, 'filepath', None):
            media.append({'type': 'video', 'src': vid.filepath, 'title': getattr(vid, 'title', '') or p.titulo})

    if not media and getattr(p, 'imagen', None):
        media.append({'type': 'image', 'src': p.imagen, 'title': p.titulo})

    return jsonify({'ok': True, 'pub': serialize_pub(p), 'media': media})
