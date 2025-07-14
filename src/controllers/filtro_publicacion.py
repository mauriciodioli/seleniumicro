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
import os
import re
import json
import math
from datetime import datetime
from werkzeug.utils import secure_filename


filtro_publicacion = Blueprint('filtro_publicacion', __name__)

BASE_STATIC_DOWNLOADS = os.path.join("src", "static", "downloads")
SIZE_TAG = re.compile(r'_[A-Z]{2}_[A-Z0-9]+_\.(jpg|png)$', re.IGNORECASE)

# Completar la publicación con datos del sheet y base de datos
def filtro_publicaciones(items, k=3):
 
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
    Copia cada fila del Sheet y modifica:
      · pais_scrapeado
      · items_filtrados (con campos imagen1 … imagen6 completos)
    """
    
    por_kw = {r["producto"]: {"items": r["items"], "row_index": r.get("row_index")} for r in resultados_globales}

    publicaciones: List[Dict] = []

    for fila in filas_validas:
        kw = fila["Producto"]
        datos = por_kw.get(kw, {})
        raw_items = datos.get("items", [])
        row_index = datos.get("row_index")
       
        top3 = filtro_publicaciones(raw_items, 3)

        for it in top3:
            dominio = (
                it.get("url", "").split("amazon.")[1][:2]
                if "amazon." in it.get("url", "")
                else "com"
            )
            galeria = obtener_galeria(it.get("asin", ""), token, dominio)

            def _url(v):
                return v.get("imageUrl", "") if isinstance(v, dict) else (v or "")

            fotos_raw = [it.get("imagen", "")] + galeria
            fotos = [_url(u) for u in fotos_raw]           # normaliza todo
            fotos = (fotos + [""] * 6)[:6]
            for i in range(6):
                it[f"imagen{i+1}"] = fotos[i]


        # Copia la fila de la hoja y agrega info extra
        fila_cp = fila.copy()
        fila_cp["pais_scrapeado"] = sheet_name
        fila_cp["items_filtrados"] = top3
        fila_cp["row_index"] = row_index
        publicaciones.append(fila_cp)

    # ---------- DEBUG opcional ----------
    if publicaciones:
        import pandas as pd

        # Aplanamos las listas para ver una fila ↔ un ítem (más cómodo de inspeccionar)
        debug_rows = []
        for pub in publicaciones:
            for it in pub["items_filtrados"]:
                row = {
                    "kw": pub["Producto"],
                    "asin": it.get("asin"),
                    "titulo": it.get("titulo", "")[:50] + "…",
                    **{f"img{i+1}": it.get(f"imagen{i+1}") for i in range(6)},
                }
                debug_rows.append(row)

        df = pd.DataFrame(debug_rows)
        with pd.option_context(
            "display.max_columns", None,
            "display.max_colwidth", 80,
            "display.width", 0,            # ajuste automático de ancho
        ):
            print("\n=== PREVIEW ÍTEMS ARMADOS (con 6 fotos) ===")
            print(df.head(10))  # muestra las primeras 10 filas

    return publicaciones


# ─────────────── helpers ───────────────

# helpers.py
def preparar_tabla_b(publicaciones: list[dict], header_row: list[str]) -> list[dict]:
    """
    • `header_row` es la primera fila del Sheet (lista con los nombres de columna).
    • Devuelve filas completas con la misma estructura, actualizando precio/imágenes
      con el ítem ganador (items_filtrados[0]).
    """
    def _url(v):
        return v.get("imageUrl", "") if isinstance(v, dict) else (v or "")

    filas_out = []

    for pub in publicaciones:
        row_index = pub.get("row_index")          
        pais_scrapeado = pub.get("pais_scrapeado")
        for item in pub["items_filtrados"]:      # ← recorre los 3
            fila = {c: pub.get(c, "") for c in header_row}

            fila.update({
                "precio_amazon": item.get("precio", ""),
                "imagen":  _url(item.get("imagen1", item.get("imagen"))),
                "imagen2": _url(item.get("imagen2")),
                "imagen3": _url(item.get("imagen3")),
                "imagen4": _url(item.get("imagen4")),
                "imagen5": _url(item.get("imagen5")),
                "imagen6": _url(item.get("imagen6")),
                "row_index" : row_index,          
                "pais_scrapeado" : pais_scrapeado
            })
            filas_out.append(fila)

    # preview opcional
    if filas_out:
        import pandas as pd
        print("\n=== PREVIEW ===")
        print(pd.DataFrame(filas_out).head())

    return filas_out
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













def _as_url(v):
    """Extrae la URL si viene como dict, si no deja el string tal cual."""
    if isinstance(v, dict):
        return v.get("imageUrl", "")
    return v or ""

def _base(url: str) -> str:
    """Quita el sufijo de tamaño Amazon (_AC_UL320_, _SX522_, …)."""
    return SIZE_TAG.sub(r'.\1', url) if url else url

def obtener_galeria(asin: str, apify_token: str, dominio: str = "com") -> List[str]:
    if not asin:
        return [""] * 6

    actor_id = "7KgyOHHEiPEcilZXM"
    endpoint = (
        f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items"
        f"?token={apify_token}&format=json"
    )

    url_producto = f"https://www.amazon.{dominio}/dp/{asin}"
    payload = {"urls": [url_producto]}

    try:
        items = requests.post(endpoint, json=payload, timeout=90).json() or []
        item  = items[0] if items else {}
        mini  = _as_url(item.get("mainImage"))
        gal   = [_as_url(u) for u in item.get("imageUrlList", [])]
    except Exception as e:
        print("⚠️  Error obteniendo galería:", e)
        mini, gal = "", []

    # Normaliza y deduplica por “base” (sin sufijo de tamaño)
    vistas, fotos = set(), []
    for url in [mini] + gal:
        if not url:
            continue
        key = _base(url)
        if key not in vistas:
            vistas.add(key)
            fotos.append(url)

    fotos = (fotos + [""] * 6)[:6]          # rellena a 6
    return fotos




def guardar_publicaciones_json(publicaciones: List[Dict], nombre_archivo: str = None) -> str:
    """
    Guarda la lista 'publicaciones' en un archivo JSON dentro de 'src/static/downloads/'.
    Retorna la ruta absoluta donde se guardó el archivo.
    """
    if not nombre_archivo:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nombre_archivo = f"publicaciones_{timestamp}.json"

    carpeta = BASE_STATIC_DOWNLOADS
    os.makedirs(carpeta, exist_ok=True)

    ruta_guardado = os.path.join(carpeta, nombre_archivo)

    with open(ruta_guardado, "w", encoding="utf-8") as f:
        json.dump(publicaciones, f, indent=2, ensure_ascii=False)

    print(f">>> Publicaciones guardadas en: {os.path.abspath(ruta_guardado)}")

    return os.path.abspath(ruta_guardado)