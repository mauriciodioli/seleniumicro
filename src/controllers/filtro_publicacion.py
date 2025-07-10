from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from app import db  # Importa db desde app.py
from models.usuario import Usuario
import requests
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
from typing import List, Dict
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
    filas_validas: List[Dict],
    resultados_globales: List[Dict],
    sheet_name: str,
    token: str,
) -> List[Dict]:
    """
    Copia cada fila del Sheet y agrega:
      · pais_scrapeado
      · items_filtrados (con campos imagen1 … imagen6 completos)
    """
    por_kw = {r["producto"]: r["items"] for r in resultados_globales}
    publicaciones: List[Dict] = []

    for fila in filas_validas:
        kw = fila["Producto"]
        raw_items = por_kw.get(kw, [])
        top3 = filtro_publicaciones(raw_items, 3)

        for it in top3:
            dominio = (
                it.get("url", "").split("amazon.")[1][:2]
                if "amazon." in it.get("url", "")
                else "com"
            )
            galeria = obtener_galeria(it.get("asin", ""), token, dominio)

            fotos = [it.get("imagen", "")] + galeria
            fotos = fotos[:6] + [""] * (6 - len(fotos))  # asegura 6

            for i in range(6):
                it[f"imagen{i+1}"] = fotos[i]

        fila_cp = fila.copy()
        fila_cp["pais_scrapeado"] = sheet_name
        fila_cp["items_filtrados"] = top3
        publicaciones.append(fila_cp)

    # --- DEBUG opcional ---
    if publicaciones:
        import pandas as pd
        df = pd.DataFrame(publicaciones)
        with pd.option_context('display.max_columns', None,
                               'display.max_colwidth', 60):
            print("\n=== PREVIEW FILAS ARMADAS ===")
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


# ─────────────── helpers ───────────────

# helpers.py
def preparar_tabla_b(publicaciones: list[dict]) -> list[dict]:
    """
    Devuelve SOLO los ítems ganadores, uno por fila, sin duplicados.
    Cada fila lleva:
      · columnas originales del Sheet   (Producto, Categoría, … validado)
      · + campos del ganador  (prefijo item_… incluidas imagen2…imagen6)
    """
    filas, vistos = [], set()

    for pub in publicaciones:
        for it in pub["items_filtrados"]:        # ← solo los ganadores
            asin = it.get("asin") or it["url"]   # llave para detectar duplicados
            if asin in vistos:
                continue                         # ya lo añadimos antes
            vistos.add(asin)

            base = {k: v for k, v in pub.items()
                    if k not in ("items_filtrados", "__score")}

            fila = base | {                     # “|” = merge dicts (Py 3.9+)
                "item_titulo" : it["titulo"],
                "item_precio" : it["precio"],
                "item_rating" : it.get("rating"),
                "item_reviews": it.get("reviews"),
                "item_prime"  : it.get("prime"),
                "item_entrega": it.get("entrega"),
                "item_url"    : it["url"],
                "item_imagen" : it["imagen"],
                "imagen2"     : it.get("imagen2", ""),
                "imagen3"     : it.get("imagen3", ""),
                "imagen4"     : it.get("imagen4", ""),
                "imagen5"     : it.get("imagen5", ""),
                "imagen6"     : it.get("imagen6", "")
            }
            filas.append(fila)

    return filas






def obtener_galeria(asin: str, apify_token: str, dominio: str = "com") -> List[str]:
    """
    Llama al actor de detalles (ID 7KgyOHHEiPEcilZXM) y devuelve
    una lista de hasta 6 URLs de imágenes del producto.
    """
    if not asin:
        return [""] * 6                         # sin ASIN => 6 vacíos

    actor_id = "7KgyOHHEiPEcilZXM"
    endpoint = (
        f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
        f"?token={apify_token}&format=json"
    )

    url_producto = f"https://www.amazon.{dominio}/dp/{asin}"
    payload      = {"urls": [url_producto]}

    try:
        items = requests.post(endpoint, json=payload, timeout=90).json() or []
        imgs  = items[0].get("images", []) if items else []
    except Exception as e:
        print("⚠️  Error obteniendo galería:", e)
        imgs = []

    # Normaliza a exactamente 6 posiciones
    imgs = imgs[:6] + [""] * (6 - len(imgs))
    return imgs      # → lista con len == 6