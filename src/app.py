# src/app.py
from flask import Flask,render_template, request, redirect, url_for, flash, jsonify
from controllers.selenium_controller import selenium_controller
from controllers.conexionesSheet.datosSheet import datoSheet
from controllers.publicaciones import publicaciones
from controllers.conexionesSheet.conexion_externa import conexion_externa

import os
app = Flask(__name__)

# Registra el Blueprint
app.register_blueprint(selenium_controller)
app.register_blueprint(datoSheet)
app.register_blueprint(conexion_externa)
app.register_blueprint(publicaciones)





if __name__ == '__main__':
    app.run(debug=True)
