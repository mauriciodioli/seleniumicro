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
import random
import pandas as pd  
import sys
import re
import math
from datetime import datetime
from werkzeug.utils import secure_filename

filtro_publicacion = Blueprint('filtro_publicacion', __name__)


# Completar la publicación con datos del sheet y base de datos
def filtro_publicaciones  (items, k=3):
 
        # filtra y calcula score
        elegibles = []
        for d in items:
            rating_txt = d.get("rating")
            if not rating_txt:
                continue
            rating = float(rating_txt.split()[0].replace(",", "."))
            reviews = d.get("reviews", 0)
            precio  = d.get("precio", 0)
            if rating < 4.4 or reviews < 50 or precio <= 0:
                continue
            score = precio / (rating * math.log(reviews + 1))
            d["__score"] = score
            d["__rating_val"] = rating
            elegibles.append(d)

        # ordena por score ascendente
        elegibles.sort(key=lambda x: x["__score"])
        return elegibles[:k]





# ──────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────
def armar_publicaciones_validas_match_scrping_sheet(
        filas_validas,
        resultados_globales,
        sheet_name):
    """
    Devuelve una lista de filas (copias de las del sheet) con los
    3 mejores items añadidos en 'items_filtrados'.
    """
    # 1) Índice por palabra-clave → lista de items scrap
    por_kw = {r["producto"]: r["items"] for r in resultados_globales}

    publicaciones = []
    for fila in filas_validas:
        kw         = fila["Producto"]
        raw_items  = por_kw.get(kw, [])
        top3       = filtro_publicaciones(raw_items, 3)

        fila_cp = fila.copy()  # no tocar el original
        fila_cp["pais_scrapeado"] = sheet_name
        fila_cp["items_filtrados"] = top3        # ← viajan los 3 elegidos
        publicaciones.append(fila_cp)

    # DEBUG opcional (mantén si lo necesitas)
    # --------------------------------------
    df = pd.DataFrame(publicaciones)
    print("\n=== PREVIEW FILAS ARMADAS ===")
    with pd.option_context('display.max_columns', None,
                           'display.max_colwidth', 70):
        print(df.head())

    return publicaciones

# ──────────────────────────────────────────────────────────────
# (c) Reduce las publicaciones a la forma que entiende el frontend
# ──────────────────────────────────────────────────────────────
def preparar_respuesta_ui(publicaciones):
    """
    Reduce las 'publicaciones' a la forma que usa tu frontend AJAX:
    [
      { producto, pais, items:[{titulo, imagen, precio, url, ...}, …] },
      { producto, pais, error:"sin datos" }
    ]
    """
    datos_ui = []
    for pub in publicaciones:
        if pub["items_filtrados"]:
            datos_ui.append({
                "producto": pub["Producto"],
                "pais":     pub["pais_scrapeado"],
                "items": [
                    {
                        "titulo" : it["titulo"],
                        "imagen" : it["imagen"],
                        "precio" : it["precio"],
                        "url"    : it["url"],
                        "rating" : it.get("rating"),
                        "reviews": it.get("reviews"),
                        "prime"  : it.get("prime"),
                        "entrega": it.get("entrega")
                    }
                    for it in pub["items_filtrados"]
                ]
            })
        else:
            datos_ui.append({
                "producto": pub["Producto"],
                "pais":     pub["pais_scrapeado"],
                "error":    "Sin artículos que cumplan los criterios"
            })
    return datos_ui