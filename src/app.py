# src/app.py
from flask import Flask,render_template, request, redirect, url_for, flash, jsonify
from controllers.selenium_controller import selenium_controller
from controllers.conexionesSheet.datosSheet import datoSheet
from controllers.publicaciones import publicaciones
from controllers.conexionesSheet.conexion_externa import conexion_externa
from models.usuario import Usuario, UsuarioSchema
from models.image import Image, ImageSchema
from models.video import Video, VideoSchema
from models.publicaciones.publicaciones import Publicacion, PublicacionSchema

import os
app = Flask(__name__)

# Registra el Blueprint
app.register_blueprint(selenium_controller)
app.register_blueprint(datoSheet)
app.register_blueprint(conexion_externa)
app.register_blueprint(publicaciones)
app.register_blueprint(image)  # Registra el blueprint de image
app.register_blueprint(video)  # Registra el blueprint de video
app.register_blueprint(publicacion)  # Registra el blueprint de publicacion





if __name__ == '__main__':
    app.run(debug=True)
