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
    media_limit = int(data.get('media_limit', 8))  # ← límite opcional

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

    def abs_url(path):
        if not path: return path
        if path.startswith('http'): return path
        # arma absoluta según tu storage/CDN
        return f"https://storage.googleapis.com/bucket_202404/{path}"

    items = []
    for rel, img, vid in rows:
        if img and img.filepath:
            items.append({'type':'image','src':abs_url(img.filepath),'title':img.title or p.titulo})
        elif vid and getattr(vid, 'filepath', None):
            items.append({'type':'video','src':abs_url(vid.filepath),'title':getattr(vid,'title','') or p.titulo})

    cover = None
    if items:
        cover = items[0]
        gallery = items[1:1+media_limit]
    else:
        # fallback: usa p.imagen como portada
        if getattr(p, 'imagen', None):
            cover = {'type': 'image', 'src': abs_url(p.imagen), 'title': p.titulo}
        gallery = []

    return jsonify({
        'ok': True,
        'pub': serialize_pub(p),
        'cover': cover,
        'gallery': gallery,
        'gallery_count': len(items) - (1 if items else 0),
    })
