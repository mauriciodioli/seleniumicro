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
import pprint
import os #obtener el directorio de trabajo actual
import json
import sys
import csv

#import drive
#drive.mount('/content/gdrive')



datoSheet = Blueprint('datoSheet',__name__)

newPath = os.path.join(os.getcwd(), 'src/utils/credentials_module.json') 
directorio_credenciales = newPath 

#SPREADSHEET_ID='1pyPq_2tZJncV3tqOWKaiR_3mt1hjchw12Bl_V8Leh74'#drpiBot2
#SPREADSHEET_ID='1yQeBg8AWinDLaErqjIy6OFn2lp2UM8SRFIcVYyLH4Tg'#drpiBot3 de pruba
SPREADSHEET_ID='1GMv6fwa1-4iwhPBZqY6ZNEVppPeyZY0R4JB39Xmkc5s'#drpiBot de produccion
#1GMv6fwa1-4iwhPBZqY6ZNEVppPeyZY0R4JB39Xmkc5s

precios_data = {}

def login():
    GoogleAuth.DEFAULT_SETTINGS['client_config_file'] = directorio_credenciales
    gauth = GoogleAuth()
    gauth.LoadCredentialsFile(directorio_credenciales)
    
    if gauth.credentials is None:
        gauth.LocalWebserverAuth(port_numbers=[8092])
    elif gauth.access_token_expired:
        gauth.Refresh()
    else:
        gauth.Authorize()
        
    gauth.SaveCredentialsFile(directorio_credenciales)
    credenciales = GoogleDrive(gauth)
    return credenciales

def autenticar_y_abrir_sheet(sheetId, sheet_name):
    try:
        scope = ['https://spreadsheets.google.com/feeds', 
                 'https://www.googleapis.com/auth/drive']
        newPath = os.path.join(os.getcwd(), 'src/utils/pruebasheetpython.json')
        creds = ServiceAccountCredentials.from_json_keyfile_name(newPath, scope)
        client = gspread.authorize(creds)
        sheet = client.open_by_key(sheetId).worksheet(sheet_name)  # Abre el sheet especificado
        return sheet
    except Exception as e:
        print(f"Error al autenticar y abrir la hoja de cálculo: {e}")
        return None  # Puedes devolver None o manejar de otra manera el error en tu aplicación





def actualizar_estado_en_sheet(
        sheet=None,
        *,
        sheet_id: str = None,
        sheet_name: str = None,
        fila_idx_list: list[int],
        col_name: str = "validado"
):
    """
    Marca la columna `col_name` en TRUE para las filas dadas (índices 1-based).

    • Pásale `sheet` (objeto gspread Worksheet) **o**
      `sheet_id` + `sheet_name` para que la función lo abra sola.
    """
    # 1. Obtén la worksheet
    if sheet is None:
        if not (sheet_id and sheet_name):
            raise ValueError("Debes pasar sheet OR sheet_id + sheet_name")
        sheet = autenticar_y_abrir_sheet(sheet_id, sheet_name)

    # 2. Encuentra la columna “validado”
    header = sheet.row_values(1)
    try:
        col_idx = header.index(col_name) + 1   # 1-based
    except ValueError:
        raise RuntimeError(f"Columna '{col_name}' no existe")

    # 3. Batch: una petición por fila (simple y seguro)
    for row_idx in fila_idx_list:
        sheet.update_cell(row_idx, col_idx, "TRUE")













#def leerSheet_arbitrador001(): 

def leerSheet(sheetId,sheet_name): 
     
        if not get.autenticado_sheet:        
            # recibo la tupla pero como este es para el bot leo el primer elemento 
            credentials_path = os.path.join(os.getcwd(), 'strategies/pruebasheetpython.json')
            # Crear instancia del gestor de hojas
            get.sheet_manager = GoogleSheetManager(credentials_path)

            if get.sheet_manager.autenticar():
                get.autenticado_sheet = True
                handler = SheetHandler(get.sheet_manager, sheetId, sheet_name)
        else:
            # Autenticar
            if  get.autenticado_sheet:
                # Crear instancia del manejador de hoja con el gestor y los datos de la hoja
                handler = SheetHandler(get.sheet_manager, sheetId, sheet_name)
            else:
                    print("Error al autenticar. Revisa los detalles del error.")
                    get.autenticado_sheet = False
                    return render_template('notificaciones/noPoseeDatos.html',layout = 'layout_fichas')    
                
                # Ejemplo de uso de leerSheet
        return handler.leerSheet()
    
    
    
    