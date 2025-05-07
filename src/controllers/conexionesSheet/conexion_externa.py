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
def loginApi(): 
    
    sheetId = '1munTyxoLc5px45cz4cO_lLRrqyFsOwjTUh8xDPOiHOg'
    sheet_name = 'alemania'
    sheet = autenticar_y_abrir_sheet(sheetId, sheet_name) 
    # Obtener los datos de la hoja
    if sheet:
        data = sheet.get_all_records()  # Obtiene todas las filas como un diccionario
        completar_publicaciones(data)  
        # Imprimir los datos en la consola
        print("Contenido del Sheet:")
        #print(data)
    return render_template("index.html", data=data)


