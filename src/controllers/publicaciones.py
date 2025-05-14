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
from models.publicaciones.categoriaPublicacion import CategoriaPublicacion
from models.publicaciones.ambitos import Ambitos
from models.publicaciones.ambitoCategoriaRelation import AmbitoCategoriaRelation
from models.image import Image
from models.video import Video
import random
from datetime import datetime
from werkzeug.utils import secure_filename

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
        # Agrupar imágenes en una lista si tienen contenido
        imagenes_urls = [
            row.get("imagen"),
            row.get("imagen2"),
            row.get("imagen3"),
            row.get("imagen4"),
            row.get("imagen5"),
            row.get("imagen6")
        ]

        # Filtrar vacíos
        imagenes_urls = [url for url in imagenes_urls if url and url.strip() != ""]
        
        
        
        # Convertir a lista de diccionarios como file_metadata_list
        file_metadata_list = []
        for i, img_url in enumerate(imagenes_urls):
            file_metadata_list.append({
                "fileName": f"imagen_auto_{i}.jpg",  # nombre simulado
                "fileSize": 0,  # tamaño falso (opcional)
                "content_type": "image/jpeg",
                "url": img_url  # extra para mostrarla si querés
            })
        
        
        
        
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

        publicacion_id = publicacionUbicacion(publicacion.id,codigo_postal,user_id)
        publicacionCategoriaPublicacion(categoria_id,publicacion.id)
       
        for index, file in enumerate(file_metadata_list):
            filename_pre = file.get("fileName")
            size = file.get("fileSize", 0)
            content_type = file.get("content_type")
            imagen_url = file.get("url")  # si querés usar el link directo

            print(f"🖼️ Imagen {index}: {imagen_url} ({filename_pre}, {size} bytes, {content_type})")
            # Verifica si el archivo tiene un nombre
            if filename_pre == '':
                continue

            # Asegúrate de usar un nombre de archivo seguro
            filename =  secure_filename(filename_pre).replace("_", "")
            # Decide si el archivo es una imagen o un video
            file_ext = filename.rsplit('.', 1)[-1].lower()
            if file_ext in {'png', 'jpg', 'jpeg', 'gif'}:
                # Llama a la función de carga de imagen
                color_texto = request.form.get('color_texto')
                titulo_publicacion = request.form.get('postTitle_creaPublicacion')
                file_path = cargarImagen_crearPublicacion(                                                    
                                                request, 
                                                filename, 
                                                publicacion_id, 
                                                color_texto, 
                                                titulo_publicacion, 
                                                content_type,
                                                userid=user_id, 
                                                index=index,
                                                size=size)


                
            elif file_ext in {'mp4', 'avi', 'mov'}:
                # Llama a la función de carga de video
                color_texto = request.form.get('color_texto')   
                titulo_publicacion = producto
                file_path = cargarVideo_crearPublicacion(                                                        
                                                    '',                                                         
                                                    filename, 
                                                    publicacion_id,
                                                    color_texto, 
                                                    titulo_publicacion,
                                                    content_type,
                                                    user_id,
                                                    index,
                                                    size
                                                    )
        # Obtener todas las publicaciones del usuario
        publicaciones_user = db.session.query(Publicacion).filter_by(user_id=user_id,ambito=ambito).all()
        for pub in publicaciones_user:
            if not pub.imagen:
                pub.imagen = imagenes_urls[0] if imagenes_urls else None
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
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
def publicacionUbicacion(nueva_publicacion_id,codigoPostal,user_id):
    try:
        # Buscar si el usuario ya tiene una ubicación guardada
       
        usuarioRegion = db.session.query(UsuarioRegion).filter_by(user_id=user_id).first()
        usuario_ubicacion = db.session.query(UsuarioUbicacion).filter_by(user_id=user_id).first() # Suponiendo que existe un modelo UsuarioUbicacion
        publicacion_ubicacion = db.session.query(UsuarioPublicacionUbicacion).filter_by(id=nueva_publicacion_id).first() # Suponiendo que existe un modelo UsuarioUbicacion
        if publicacion_ubicacion:
            return True
        else:
            
            if usuario_ubicacion:
                id_ubicaion = usuario_ubicacion.id
            else:
                # Si no existe, creamos un nuevo registro de ubicación
                id_ubicaion = 0
                
            new_publicacion_ubicacion = UsuarioPublicacionUbicacion(
                        user_id = user_id,
                        id_region = usuarioRegion.id,
                        id_publicacion = nueva_publicacion_id,
                        id_ubicacion = id_ubicaion,
                        codigoPostal = codigoPostal,
                    )
            db.session.add(new_publicacion_ubicacion)

        db.session.commit()
        
        return True
    except Exception as e:
        print(str(e))
        db.session.rollback()  # Asegúrate de hacer rollback en caso de error
        return False
    
    
    
    


def publicacionCategoriaPublicacion(categoria_id,publicacion_id):
    try:
        new_categoria_publicacion = CategoriaPublicacion(
            categoria_id=int(categoria_id),
            publicacion_id=publicacion_id,
            estado='activo'
        )
        db.session.add(new_categoria_publicacion)
        db.session.commit()
        
        return True
    except Exception as e:
        print(str(e))
        db.session.rollback()  # Asegúrate de hacer rollback en caso de error
        return False
    
    















        

def cargarImagen_crearPublicacion( request, filename, id_publicacion, color_texto, titulo_publicacion=None, mimetype=None, userid=0, index=None, size=0):
    size = size
    # Guardar información en la base de datos   
   
    nombre_archivo = filename
    descriptionImagen = titulo_publicacion
    randomNumber_ = random.randint(1, 1000000)  # Número aleatorio
    
    try:
        imagen_existente = db.session.query(Image).filter_by(title=filename).first()
        if imagen_existente:
            cargar_id_publicacion_id_imagen_video(id_publicacion, imagen_existente.id, 0, 'imagen', size=size)
            return filename
        else:
            nueva_imagen = Image(
                user_id=userid,
                title=nombre_archivo,
                description=descriptionImagen,
                colorDescription=color_texto,
                filepath=filename,
                randomNumber=randomNumber_,
                size=float(size),
                mimetype=mimetype
            )
            db.session.add(nueva_imagen)
            db.session.commit()
            
            cargar_id_publicacion_id_imagen_video(id_publicacion, nueva_imagen.id, 0, 'imagen', size=size)
            return filename
    except Exception as db_error:
      
        db.session.rollback()  # Deshacer cambios en caso de error
        db.session.close()  # Asegurarse de cerrar la sesión incluso si ocurre un error

        raise  # Propagar el error para que pueda ser manejado por capas superiores
      


def cargarVideo_crearPublicacion( request, filename, id_publicacion, color_texto, titulo_publicacion=None, mimetype=None, userid=0, index=None, size=0):
    print(f"Entering cargarVideo_crearPublicacion with filename: {filename}, userid: {userid}, index: {index}, size: {size}")
   # Guardar información en la base de datos
   
    nombre_archivo = filename
    descriptionVideo = titulo_publicacion
    randomNumber_ = random.randint(1, 1000000)  # Número aleatorio
    
    try:
        video_existente = db.session.query(Video).filter_by(title=filename,size=size).first()

        if video_existente:
            print("Video already exists, saving relation to publicacion_media")
            # Si la imagen ya existe, solo guarda la relación en publicacion_media
            
            cargar_id_publicacion_id_imagen_video(id_publicacion,0,video_existente.id,'video',size=size)
            return filename
        else:
            print("Creating new video")
            nuevo_video = Video(
                user_id=userid,
                title=nombre_archivo,
                description=descriptionVideo,
                colorDescription=color_texto,
                filepath=filename,
                randomNumber=randomNumber_,
                size=float(size),
                mimetype=mimetype
            )
            db.session.add(nuevo_video)
            db.session.commit()
            print("Saving relation to publicacion_media")
            cargar_id_publicacion_id_imagen_video(id_publicacion,0,nuevo_video.id,'video',size=size)
        return filename
    except Exception as db_error:
       
        db.session.rollback()  # Deshacer cambios en caso de error
        db.session.close()  # Asegurarse de cerrar la sesión incluso si ocurre un error

        raise  # Propagar el error para que pueda ser manejado por capas superiores



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