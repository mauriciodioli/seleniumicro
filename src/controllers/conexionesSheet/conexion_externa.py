from flask import Blueprint, render_template, request,current_app, redirect, url_for, flash,jsonify
from datetime import datetime
import enum
from models.sheetModels.GoogleSheetManager import GoogleSheetManager
from models.sheetModels.sheet_handler import SheetHandler
import copy
import socket
import requests
import time
import json

from utils.db import db

import random
from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
#import routes.api_externa_conexion.cuenta as cuenta
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from controllers.conexionesSheet.datosSheet import login, autenticar_y_abrir_sheet
from controllers.publicaciones import completar_publicaciones
import pprint
import os #obtener el directorio de trabajo actual
import json
import sys



conexion_externa = Blueprint('conexion_externa',__name__)

autenticado_sheet = False



@conexion_externa.route("/")
def index():
    # Aquí puedes realizar cualquier lógica adicional que necesites
    return render_template("index.html")



@conexion_externa.route("/resultado_carga_directo_sheet", methods=["POST"])
def resultado_carga():
    
    sheetId = '1munTyxoLc5px45cz4cO_lLRrqyFsOwjTUh8xDPOiHOg'
    sheet_name = request.form.get("sheet_name")  # recibe del AJAX
    sheet = autenticar_y_abrir_sheet(sheetId, sheet_name)

    if sheet:
        data = sheet.get_all_records()
        completar_publicaciones(data)
        print("Contenido del Sheet:")
       

    # Podés devolver solo un mensaje si es AJAX
    return "Datos cargados correctamente", 200


@conexion_externa.route("/carga_publicacion_en_db/", methods=["POST"])
def carga_publicacion_en_db():
    data = request.get_json()
    sheet_name = data.get("sheet_name")
    fila       = data.get("fila")          # dict con la fila elegida

    if not fila:
        return "Fila vacía", 400

    try:
        completar_publicaciones([fila])    # reusa tu función (recibe lista)
        return "Fila procesada", 200
    except Exception as e:
        return f"Error {e}", 500

