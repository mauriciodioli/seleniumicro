from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from app import db  # Importa db desde app.py
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
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambitoCategoriaRelation import AmbitoCategoriaRelation
from models.image import Image
from models.video import Video
from controllers.conexionesSheet.datosSheet import  actualizar_estado_en_sheet
import random
import re
from datetime import datetime
from werkzeug.utils import secure_filename

publicaciones = Blueprint('publicaciones', __name__)

# Completar la publicación con datos del sheet y base de datos
def completar_publicaciones(data):
    publicaciones_completas = []    

    try:
        for row in data:
            # === Extraer datos ===
            producto = row["Producto"]
            categoria = row["Categoría"]
            pais = row["País"]
            motivo_tendencia = row["Motivo de tendencia"]
            descripcion = row["descripcion"]
            precio_amazon = str(row["precio_amazon"])
            precio_ebay = str(row["precio_ebay"])
            precio_aliexpress = str(row["precio_aliexpress"])
            precio_venta_sugerido = row["precio_venta_sugerido"]
            margen_estimado = row["margen_estimado"]
            fecha = row["fecha"]
            motivo_tendencia_extendido = row["motivo_tendencia_extendido"]
            codigo_postal = row["codigoPostal"]
            user_id = int(row["usuario"])
            estado = row["estado"]
            boton_compra = 1 if str(row["botonCompra"]).strip().upper() == "TRUE" else 0
            idioma = row["idioma"]
            pago_online = 1 if str(row["pagoOnline"]).strip().upper() == "TRUE" else 0
            ambito = row["ambito"]

            imagenes_urls = [
                row.get("imagen"),
                row.get("imagen2"),
                row.get("imagen3"),
                row.get("imagen4"),
                row.get("imagen5"),
                row.get("imagen6")
            ]
            imagenes_urls = [url for url in imagenes_urls if url and url.strip() != ""]

            slug_base = generar_slug(producto)
            slug = slug_base
            contador = 1
            while db.session.query(Publicacion).filter_by(titulo=slug).first():
                contador += 1
                slug = f"{slug_base}-{contador}"

            ambito_class = machear_ambito(ambito)
            categoria_id = machear_ambitoCategoria(categoria, idioma,ambito_class.id)

            usuario_id = machear_usuario(user_id)
            ubicacion_id = machear_ubicacion(user_id, codigo_postal)

            texto = f"$ {precio_amazon} {precio_ebay} {precio_aliexpress} AliExpress {row.get('búsqueda_aliexpress', '')} {producto}"

            publicacion = Publicacion(
                user_id=usuario_id,
                titulo=slug,
                texto=texto,
                ambito=ambito_class.valor,
                correo_electronico="mauriciodioli@gmail.com",
                descripcion=motivo_tendencia,
                color_texto="black",
                color_titulo="black",
                fecha_creacion=fecha,
                estado=estado,
                botonCompra=boton_compra,
                imagen=imagenes_urls[0] if imagenes_urls else None,
                idioma=idioma,
                codigoPostal=codigo_postal,
                pagoOnline=pago_online,
                categoria_id=categoria_id
            )

            db.session.add(publicacion)
            db.session.flush()  # Asegura que se genere el ID

            publicaciones_completas.append(publicacion)

            publicacion_id = publicacion.id
            registrar_publicacion_ubicacion(publicacion_id, codigo_postal, user_id)
            registrar_categoria_publicacion(categoria_id, publicacion_id)

            for index, url in enumerate(imagenes_urls):
                filename = secure_filename(f"{slug}_{index}.jpg")
                
                cargar_imagen(request, filename,url, publicacion_id, "black", producto, "image/jpeg", user_id, index)

        db.session.commit()
 
       # fila_idx_list = [row["fila_idx"] for row in data] 
       # sheet_name =
       # actualizar_estado_en_sheet(fila_idx_list, sheet_name)
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error en completar_publicaciones: {e}")

    return publicaciones_completas

def registrar_publicacion_ubicacion(publicacion_id, codigo_postal, user_id):
    try:
        if db.session.query(UsuarioPublicacionUbicacion).filter_by(id=publicacion_id).first():
            return True

        region = db.session.query(UsuarioRegion).filter_by(user_id=user_id).first()
        ubicacion = db.session.query(UsuarioUbicacion).filter_by(user_id=user_id).first()

        new = UsuarioPublicacionUbicacion(
            user_id=user_id,
            id_region=region.id if region else None,
            id_publicacion=publicacion_id,
            id_ubicacion=ubicacion.id if ubicacion else 0,
            codigoPostal=codigo_postal
        )
        db.session.add(new)
        return True
    except Exception as e:
        print(f"❌ Error registrar_publicacion_ubicacion: {e}")
        return False
def registrar_categoria_publicacion(categoria_id, publicacion_id):
    try:
        new = CategoriaPublicacion(
            categoria_id=categoria_id,
            publicacion_id=publicacion_id,
            estado='activo'
        )
        db.session.add(new)
        return True
    except Exception as e:
        print(f"❌ Error registrar_categoria_publicacion: {e}")
        return False
def cargar_imagen(request, filename,url, id_publicacion, color_texto, titulo, mimetype, userid, index, size=0):
    try:
        existente = db.session.query(Image).filter_by(title=filename).first()
        if existente:
            registrar_media(publicacion_id=id_publicacion, imagen_id=existente.id, video_id=0, tipo='imagen', size=size)
            return filename

        nueva = Image(
            user_id=userid,
            title=filename,
            description=titulo,
            colorDescription=color_texto,
            filepath=url,
            randomNumber=random.randint(1, 1_000_000),
            size=float(size),
            mimetype=mimetype
        )
        db.session.add(nueva)
        db.session.flush()
        registrar_media(id_publicacion, nueva.id, 0, 'imagen', size)
        return filename

    except Exception as e:
        print(f"❌ Error en cargar_imagen: {e}")
        return None
def registrar_media(publicacion_id, imagen_id, video_id, tipo='imagen', size=0):
    try:
        media = Public_imagen_video(
            publicacion_id=publicacion_id,
            imagen_id=imagen_id,
            video_id=video_id,
            fecha_creacion=datetime.now(),
            media_type=tipo,
            size=float(size)
        )
        db.session.add(media)
    except Exception as e:
        print(f"❌ Error en registrar_media: {e}")
def machear_ambito(ambito):
    if not ambito:
        return None

    ambito_normalizada = ambito.strip().lower()

    ambito = db.session.query(Ambitos).filter(
        (Ambitos.nombre.ilike(f"%{ambito_normalizada}%")) |
        (Ambitos.valor.ilike(f"%{ambito_normalizada}%"))
    ).first()

    if ambito:
        return ambito
    else:
        print(f"⚠️ No se encontró ámbito para la categoría: '{ambito_normalizada}'")
        return None
def machear_ambitoCategoria(categoria, idioma='es', ambito_id=None):
    if not categoria:
        print("❌ Categoría vacía")
        return None

    categoria_normalizada = categoria.strip().lower()
    print(f"🔍 Buscando categoría: '{categoria_normalizada}'")

    try:
        # Evitar autoflush antes del query por si hay objetos pendientes en session
        with db.session.no_autoflush:
            ambito_categoria = db.session.query(AmbitoCategoria).filter_by(valor=categoria_normalizada).first()

        if ambito_categoria:
            print(f"✅ Categoría encontrada: ID {ambito_categoria.id}")
            return ambito_categoria.id

        # Crear color aleatorio
        COLORES_DISPONIBLES = ["red", "green", "blue", "orange", "purple", "pink", "yellow", "cyan", "teal", "brown"]
        color_aleatorio = random.choice(COLORES_DISPONIBLES)

        # Crear nueva categoría
        nueva_categoria = AmbitoCategoria(
            nombre=categoria.strip().capitalize(),
            descripcion=f"Categoría generada automáticamente para '{categoria}'",
            idioma=idioma,
            valor=categoria_normalizada,
            estado="ACTIVO",
            color=color_aleatorio
        )
        db.session.add(nueva_categoria)
        db.session.flush()  # Obtener ID antes de usar

        # Asociar con ámbito si se pasó un ID válido
        if ambito_id is not None:
            try:
                relacion = AmbitoCategoriaRelation(
                    ambito_id=ambito_id,
                    ambitoCategoria_id=nueva_categoria.id,
                    estado="ACTIVO"
                )
                db.session.add(relacion)
            except SQLAlchemyError as err_rel:
                print(f"⚠️ Se creó la categoría pero falló la relación con el ámbito: {err_rel}")

        print(f"🆕 Categoría creada con ID {nueva_categoria.id} y color {color_aleatorio}")
        return nueva_categoria.id

    except SQLAlchemyError as e:
        print(f"❌ Error creando categoría '{categoria}': {e}")
        db.session.rollback()
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
    
    
    
    
    
    
    
    













        





def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def es_formato_imagen(filepath):
    # Extensiones de archivo de imagen comunes
    extensiones_imagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']

    # Verificar si la extensión del archivo está en la lista de extensiones de imagen
    return any(filepath.lower().endswith(ext) for ext in extensiones_imagen)



def cargar_id_publicacion_id_imagen_video(id_publicacion,nueva_imagen_id,nuevo_video_id,media_type,size=0):
    nuevo_ids= Public_imagen_video(
        publicacion_id=id_publicacion,
        imagen_id=nueva_imagen_id,
        video_id=nuevo_video_id,
        fecha_creacion=datetime.now(),
        media_type=media_type,
        size=float(size)
    )
    db.session.add(nuevo_ids)
    db.session.commit()
    db.session.close()
    return True



def generar_slug(texto):
    texto = texto.lower()
    texto = re.sub(r'[^\w\s-]', '', texto)  # quita símbolos raros
    texto = re.sub(r'[\s_]+', '-', texto)   # reemplaza espacios/guiones bajos por guiones
    return texto.strip('-')
