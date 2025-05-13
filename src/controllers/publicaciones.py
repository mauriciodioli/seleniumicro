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

    for row in data:
        producto = row["Producto"]
        categoria = row["Categoría"]
        pais = row["País"]
        fuente = row["Fuente"]
        motivo_tendencia = row["Motivo de tendencia"]
        descripcion = row["descripcion"]
        precio_amazon = str(row["precio_amazon"])
        precio_ebay = str(row["precio_ebay"])
        precio_aliexpress = str(row["precio_aliexpress"])
        precio_venta_sugerido = row["precio_venta_sugerido"]
        margen_estimado = row["margen_estimado"]
        imagen_url = row["imagen"]
        imagen2 = row["imagen2"]
        imagen3 = row["imagen3"]
        imagen4 = row["imagen4"]
        imagen5 = row["imagen5"]
        imagen6 = row["imagen6"]
        fecha = row["fecha"]
        motivo_tendencia_extendido = row["motivo_tendencia_extendido"]
        busqueda_amazon = row["búsqueda_amazon"]
        busqueda_ebay = row["búsqueda_ebay"]
        busqueda_aliexpress = row["búsqueda_aliexpress"]
        ambito = row["ambito"]
        codigo_postal = row["codigoPostal"]
        user_id = row["usuario"]
        estado = row["estado"]
        boton_compra = row["botonCompra"]
        idioma = row["idioma"]
        pago_online = row["pagoOnline"]

        ambito_id = machear_ambito(ambito)
        categoria_id = machear_ambitoCategoria(categoria)
        usuario_id = machear_usuario(int(user_id))
        ubicacion_id = machear_ubicacion(user_id,codigo_postal)
        # Conversiones booleanas (TRUE/FALSE → 1/0)
        boton_compra = 1 if str(row["botonCompra"]).strip().upper() == "TRUE" else 0
        pago_online = 1 if str(row["pagoOnline"]).strip().upper() == "TRUE" else 0
       
        proveedor_mas_barato = "AliExpress"  # Cambialo si lo tenés en la data
        link_proveedor = row.get("búsqueda_aliexpress", "")

        texto = "$ " + precio_amazon + " " + precio_ebay + " " + precio_aliexpress + " " + proveedor_mas_barato + " " + link_proveedor + " " + producto

        publicacion = Publicacion(
            user_id=usuario_id,
            titulo=producto,
            texto=texto,
            ambito=ambito_id,
            correo_electronico="mauriciodioli@gmail.com",
            descripcion=motivo_tendencia,
            color_texto="black",
            color_titulo="black",
            fecha_creacion=fecha,
            estado=estado,
            botonCompra=boton_compra,
            imagen=imagen_url,
            idioma=idioma,
            codigoPostal=codigo_postal,
            pagoOnline=pago_online,
            categoria_id=categoria_id           
        )

        print(f"✅ Publicación procesada: {publicacion.titulo}")
        publicaciones_completas.append(publicacion)
        db.session.add(publicacion)
        db.session.commit()

  

    db.session.close()
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
        return ambito.valor
    else:
        print(f"⚠️ No se encontró ámbito para la categoría: '{categoria}'")
        return None

def machear_ambitoCategoria(categoria):
    if not categoria:
        return None

    categoria_normalizada = categoria.strip().lower()

    ambito_categoria = db.session.query(AmbitoCategoria).filter_by(valor=categoria_normalizada).first()

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
def machear_ubicacion(user_id, codigoPostal):    
    if not codigoPostal:
        return None

    try:
        ubicacion = db.session.query(UsuarioUbicacion).filter_by( user_id=int(user_id),  codigoPostal=codigoPostal ).first()
    except Exception as e:
        print(f"❌ Error al machear ubicación: {e}")
        return None

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