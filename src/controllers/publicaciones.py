from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from app import db  # Importa db desde app.py

from models.usuario import Usuario
from models.publicaciones.publicaciones import Publicacion
from models.publicaciones.estado_publi_usu import Estado_publi_usu
from models.publicaciones.publicacion_imagen_video import Public_imagen_video
from models.usuarioRegion import UsuarioRegion
from models.usuarioUbicacion import UsuarioUbicacion
from models.usuarioPublicacionUbicacion import UsuarioPublicacionUbicacion
from models.publicaciones.ambitoCategoria import AmbitoCategoria
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambitoCategoriaRelation import AmbitoCategoriaRelation
from models.image import Image
from models.video import Video

publicaciones = Blueprint('publicaciones', __name__)

# Completar la publicación con datos del sheet y base de datos
def completar_publicaciones(data):
    publicaciones_completas = []
    user_id = '22'  # Usuario fijo, puede venir por parámetro

    for row in data:
        (
            producto, categoria, pais, ambito, fuente, motivo_tendencia,
            precio_amazon, precio_ebay, precio_aliexpress,
            proveedor_mas_barato, link_proveedor, codigoPostal,
            precio_venta_sugerido, margen_estimado, imagen_url, fecha
        ) = row

        ambito_id = machear_ambito(ambito)
        categoria_id = machear_ambitoCategoria(categoria)
        usuario_id = machear_usuario(user_id)
        ubicacion_id = machear_ubicacion(codigoPostal)

        imagen_obj = db.session.query(Image).filter(Image.url.ilike(f"%{imagen_url}%")).first()
        imagenes_urls = [imagen_obj.url] if imagen_obj else []

        video_obj = db.session.query(Video).filter(Video.producto.ilike(f"%{producto}%")).first()
        videos_urls = [video_obj.url] if video_obj else []

        publicacion = Publicacion(
            user_id=usuario_id,
            titulo=producto,
            texto=motivo_tendencia,
            ambito=ambito_id,
            correo_electronico=None,
            descripcion=motivo_tendencia,
            color_texto="black",
            color_titulo="black",
            fecha_creacion=fecha,
            estado="inactivo",
            botonCompra=1,
            imagen=imagenes_urls,
            video=videos_urls,
            idioma="es",
            codigoPostal=codigoPostal,
            pagoOnline=0,
            categoria_id=categoria_id,
            ubicacion=pais
        )

        print(f"✅ Publicación procesada: {publicacion.titulo}")
        publicaciones_completas.append(publicacion)

    return publicaciones_completas



def machear_ambito(categoria):
    if not categoria:
        return None

    categoria_normalizada = categoria.strip().lower()

    ambito = db.session.query(Ambitos).filter(
        (Ambitos.nombre.ilike(f"%{categoria_normalizada}%")) |
        (Ambitos.valor.ilike(f"%{categoria_normalizada}%"))
    ).first()

    if ambito:
        return ambito.id
    else:
        print(f"⚠️ No se encontró ámbito para la categoría: '{categoria}'")
        return None

def machear_ambitoCategoria(categoria):
    if not categoria:
        return None

    categoria_normalizada = categoria.strip().lower()

    ambito_categoria = db.session.query(AmbitoCategoria).filter(
        (AmbitoCategoria.nombre.ilike(f"%{categoria_normalizada}%")) |
        (AmbitoCategoria.valor.ilike(f"%{categoria_normalizada}%"))
    ).first()

    if ambito_categoria:
        return ambito_categoria.id
    else:
        print(f"⚠️ No se encontró categoría para la categoría: '{categoria}'")
        return None
def machear_usuario(user_id):
    try:
        usuario = db.session.query(Usuario).filter(Usuario.id == int(user_id)).first()
        if usuario:
            return usuario.id
        else:
            print(f"⚠️ No se encontró usuario para el ID: '{user_id}'")
            return None
    except ValueError:
        print(f"❌ user_id inválido: '{user_id}'")
        return None
def machear_imagen(imagen):
    if not imagen:
        return None

    imagen_normalizada = imagen.strip().lower()

    imagen = db.session.query(Image).filter(
        (Image.url.ilike(f"%{imagen_normalizada}%")) |
        (Image.producto.ilike(f"%{imagen_normalizada}%"))
    ).first()

    if imagen:
        return imagen.id
    else:
        print(f"⚠️ No se encontró imagen para la URL: '{imagen}'")
        return None
def machear_video(video):
    if not video:
        return None

    video_normalizado = video.strip().lower()

    video = db.session.query(Video).filter(
        (Video.url.ilike(f"%{video_normalizado}%")) |
        (Video.producto.ilike(f"%{video_normalizado}%"))
    ).first()

    if video:
        return video.id
    else:
        print(f"⚠️ No se encontró video para la URL: '{video}'")
        return None
def machear_ubicacion(codigoPostal):    
    if not codigoPostal:
        return None

    codigoPostal_normalizado = codigoPostal.strip().lower()

    ubicacion = db.session.query(UsuarioUbicacion).filter(
        (UsuarioUbicacion.codigoPostal.ilike(f"%{codigoPostal_normalizado}%")) |
        (UsuarioUbicacion.pais.ilike(f"%{codigoPostal_normalizado}%"))
    ).first()

    if ubicacion:
        return ubicacion.id
    else:
        print(f"⚠️ No se encontró ubicación para el código postal: '{codigoPostal}'")
        return None
def machear_publicacion(publicacion):
    if not publicacion:
        return None

    publicacion_normalizada = publicacion.strip().lower()

    publicacion = db.session.query(Publicacion).filter(
        (Publicacion.titulo.ilike(f"%{publicacion_normalizada}%")) |
        (Publicacion.descripcion.ilike(f"%{publicacion_normalizada}%"))
    ).first()

    if publicacion:
        return publicacion.id
    else:
        print(f"⚠️ No se encontró publicación para el título: '{publicacion}'")
        return None
def machear_estado_publicacion(estado):
    if not estado:
        return None

    estado_normalizado = estado.strip().lower()

    estado_publicacion = db.session.query(Estado_publi_usu).filter(
        (Estado_publi_usu.estado.ilike(f"%{estado_normalizado}%")) |
        (Estado_publi_usu.descripcion.ilike(f"%{estado_normalizado}%"))
    ).first()

    if estado_publicacion:
        return estado_publicacion.id
    else:
        print(f"⚠️ No se encontró estado de publicación para el estado: '{estado}'")
        return None
def machear_publicacion_ubicacion(publicacion_ubicacion):   
    if not publicacion_ubicacion:
        return None

    publicacion_ubicacion_normalizada = publicacion_ubicacion.strip().lower()

    publicacion_ubicacion = db.session.query(UsuarioPublicacionUbicacion).filter(
        (UsuarioPublicacionUbicacion.codigoPostal.ilike(f"%{publicacion_ubicacion_normalizada}%")) |
        (UsuarioPublicacionUbicacion.pais.ilike(f"%{publicacion_ubicacion_normalizada}%"))
    ).first()

    if publicacion_ubicacion:
        return publicacion_ubicacion.id
    else:
        print(f"⚠️ No se encontró publicación de ubicación para el código postal: '{publicacion_ubicacion}'")
        return None