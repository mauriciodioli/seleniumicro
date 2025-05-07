# publicaciones.py
from flask import Blueprint, render_template, request,current_app, redirect, url_for, flash,jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from models import Categoria, Usuario, Publicacion, Imagen, Video, UbicacionPublicacion  # Asegúrate de importar tus modelos
import gspread


publicaciones = Blueprint('publicaciones',__name__)

# Conexión con la base de datos
engine = create_engine('mysql://usuario:contraseña@localhost/base_datos')
Session = sessionmaker(bind=engine)
session = Session()



# Completar la publicación con datos del sheet y base de datos
def completar_publicaciones(data):
    publicaciones_completas = []
    
    for row in data:
        # Consulta la categoria_id desde la tabla 'Categoria'
        categoria = session.query(Categoria).filter(Categoria.nombre == row['Categoría']).first()
        categoria_id = categoria.id if categoria else None
        
        # Consulta el user_id desde la tabla 'Usuario'
        usuario = session.query(Usuario).filter(Usuario.correo_electronico == row['Correo Electronico']).first()
        user_id = usuario.id if usuario else None
        
        # Consulta las imágenes asociadas (tabla 'Imagen')
        imagenes = session.query(Imagen).filter(Imagen.producto == row['Producto']).all()
        imagen_urls = [img.url for img in imagenes]  # Obtén solo las URLs de las imágenes
        
        # Consulta los videos asociados (tabla 'Video')
        videos = session.query(Video).filter(Video.producto == row['Producto']).all()
        video_urls = [video.url for video in videos]  # Obtén solo las URLs de los videos
        
        # Consulta la ubicación de la publicación (tabla 'UbicacionPublicacion')
        ubicacion = session.query(UbicacionPublicacion).filter(UbicacionPublicacion.producto == row['Producto']).first()
        pais = ubicacion.pais if ubicacion else None
        
        # Crear el objeto de Publicación con los datos obtenidos
        publicacion = Publicacion(
            user_id=user_id,
            titulo=row['Producto'],
            texto=row['Descripcion'],
            ambito=row['Motivo de tendencia'],
            correo_electronico=row['Correo Electronico'],
            descripcion=row['descripcion'],
            color_texto="black",  # Puedes personalizar estos campos
            color_titulo="black", # Lo mismo
            fecha_creacion=row['fecha'],
            estado="inactivo",  # Aquí puedes colocar otro valor si corresponde
            botonCompra=1,  # Ajusta según corresponda
            imagen=imagen_urls,
            video=video_urls,
            idioma="es",  # Si el idioma es siempre el mismo
            codigoPostal=row['Codigo Postal'],
            pagoOnline=0,  # Ajusta según corresponda
            categoria_id=categoria_id,
            ubicacion=pais  # Asignar el país de la ubicación de la publicación
        )
        
        publicaciones_completas.append(publicacion)
    
    return publicaciones_completas
