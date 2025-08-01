from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
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

import gspread
from oauth2client.service_account import ServiceAccountCredentials
import pprint
import os
import sys
import csv
from pathlib import Path
from dotenv import load_dotenv

# ✅ Carga del entorno desde el .env raíz
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

datoSheet = Blueprint('datoSheet', __name__)

# ✅ Rutas del .env (relativas a BASE_DIR)
PAHT_SHEET = os.environ.get('PAHT_SHEET')
PAHT_CREDENTIALS = os.environ.get('PAHT_CREDENTIALS')

# ✅ Convertirlas en rutas absolutas
ruta_absoluta_sheet = BASE_DIR / PAHT_SHEET
directorio_credenciales = BASE_DIR / PAHT_CREDENTIALS

autenticado_sheet = False
sheet_manager = False

SPREADSHEET_ID = '1GMv6fwa1-4iwhPBZqY6ZNEVppPeyZY0R4JB39Xmkc5s'  # drpiBot de producción

precios_data = {}


def login():
    GoogleAuth.DEFAULT_SETTINGS['client_config_file'] = str(directorio_credenciales)
    gauth = GoogleAuth()
    gauth.LoadCredentialsFile(str(directorio_credenciales))

    if gauth.credentials is None:
        gauth.LocalWebserverAuth(port_numbers=[8092])
    elif gauth.access_token_expired:
        gauth.Refresh()
    else:
        gauth.Authorize()

    gauth.SaveCredentialsFile(str(directorio_credenciales))
    credenciales = GoogleDrive(gauth)
    return credenciales


def autenticar_y_abrir_sheet(sheetId, sheet_name):
    print("[DEBUG] Entrando a autenticar_y_abrir_sheet", flush=True)
    try:
        scope = [
            'https://spreadsheets.google.com/feeds',
            'https://www.googleapis.com/auth/drive'
        ]
        print(f"[DEBUG] buscando credenciales en: {ruta_absoluta_sheet}", flush=True)

        creds = ServiceAccountCredentials.from_json_keyfile_name(str(ruta_absoluta_sheet), scope)
        client = gspread.authorize(creds)
        sheet = client.open_by_key(sheetId).worksheet(sheet_name)

        print(f"[DEBUG] hoja abierta correctamente: {sheet.title}", flush=True)
        return sheet
    except Exception as e:
        print(f"[ERROR] Error al autenticar y abrir la hoja: {e}", flush=True)
        return None


def actualizar_estado_en_sheet(sheet, fila_idx_list: list[int], col_name: str = "validado"):
    header = sheet.row_values(1)

    try:
        col_idx = header.index(col_name) + 1
    except ValueError:
        raise RuntimeError(f"Columna '{col_name}' no existe")

    for row_idx in fila_idx_list:
        if not isinstance(row_idx, int):
            raise ValueError(f"Se esperaba un número de fila, pero se recibió: {type(row_idx)} → {row_idx}")

        print(f"✅ Actualizando fila {row_idx}, columna '{col_name}' (índice {col_idx}) → 'TRUE'")
        sheet.update_cell(row_idx, col_idx, "TRUE")


def leerSheet(sheetId, sheet_name):
    global autenticado_sheet, sheet_manager

    if not autenticado_sheet:
        credentials_path = BASE_DIR / 'src/utils/pruebasheetpython.json'  # ✅ corregido aquí también

        sheet_manager = GoogleSheetManager(str(credentials_path))

        if sheet_manager.autenticar():
            autenticado_sheet = True
            handler = SheetHandler(sheet_manager, sheetId, sheet_name)
    else:
        if autenticado_sheet:
            handler = SheetHandler(sheet_manager, sheetId, sheet_name)
        else:
            print("Error al autenticar. Revisa los detalles del error.")
            autenticado_sheet = False
            return render_template('notificaciones/noPoseeDatos.html', layout='layout_fichas')

    return handler.leerSheet()
