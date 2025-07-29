from flask import Blueprint, render_template, request, current_app, redirect, url_for, flash, jsonify
from extensions import db

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
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
BASE_STATIC_DOWNLOADS = os.path.join(BASE_DIR, "src", "static", "downloads")
SIZE_TAG = re.compile(r'_[A-Z]{2}_[A-Z0-9]+_\.(jpg|png)$', re.IGNORECASE)
# 1. Calcula la ruta al directorio raíz de tu proyecto (dos niveles arriba de este archivo)




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
        row_index = fila.get("row_index")
       
        top3 = filtro_publicaciones(raw_items, 3)

        for it in top3:
            dominio = (
                it.get("url", "").split("amazon.")[1][:2]
                if "amazon." in it.get("url", "")
                else "com"
            )
            galeria = []
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
    Reduce las 'publicaciones' a los 3 mejores items por producto, 
    basados en reviews > rating > precio válido.
    """
    datos_ui = []

    for pub in publicaciones:
        items = pub.get("items", [])

        # Filtrar con precio > 0
        items_filtrados = [it for it in items if it.get("precio", 0) > 0]

        # Ordenar por reviews (desc), luego rating (desc), luego precio (asc)
        def criterio(it):
            try:
                revs = int(it.get("reviews", 0))
                rating_txt = it.get("rating", "0 su 5 stelle")
                rating = float(rating_txt.replace(",", ".").split(" ")[0])
            except:
                revs, rating = 0, 0
            return (-revs, -rating)

        mejores = sorted(items_filtrados, key=criterio)[:3]

        if mejores:
            datos_ui.append({
                "producto": pub["producto"],
                "pais": pub["pais"],
                "items": [
                    {
                        "titulo": it["titulo"],
                        "imagen": it["imagen"],
                        "precio": it["precio"],
                        "url": it["url"],
                        "rating": it.get("rating"),
                        "reviews": it.get("reviews"),
                        "prime": it.get("prime"),
                        "asin": it.get("asin"),
                        "entrega": it.get("entrega")
                    }
                    for it in mejores
                ]
            })
        else:
            datos_ui.append({
                "producto": pub.get("producto"),
                "pais": pub.get("pais"),
                "error": "Sin artículos válidos con precio"
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








def obtener_galeria_en_batches(asins: List[str], apify_token: str, dominio: str = "com", batch_size: int = 5) -> Dict[str, List[str]]:
    from time import sleep

    resultados = {}

    for i in range(0, len(asins), batch_size):
        batch = asins[i:i + batch_size]
        print(f"🎞️  Procesando batch de galería {i // batch_size + 1}...")

        for asin in batch:
            try:
                galeria = obtener_galeria(asin, apify_token, dominio)
                resultados[asin] = galeria
            except Exception as e:
                print(f"❌ Error obteniendo galería para ASIN {asin}: {e}")
                resultados[asin] = [""] * 6

        sleep(1)  # pausa corta entre batches

    return resultados







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



def guardar_respuesta_json(publicaciones: List[Dict], nombre_archivo: str = None) -> str:
    """
    Guarda la lista 'publicaciones' en un archivo JSON dentro de 'src/static/downloads/'.
    Retorna el nombre del archivo guardado (no la ruta completa).
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    if not nombre_archivo:
        nombre_archivo = f"resultados_scraping_{timestamp}.json"
    else:
        # Asegura nombre sin caracteres inválidos
        nombre_archivo = f"{nombre_archivo}_{timestamp}.json".replace(" ", "_")

    # Crear carpeta si no existe
    os.makedirs(BASE_STATIC_DOWNLOADS, exist_ok=True)

    ruta_guardado = os.path.join(BASE_STATIC_DOWNLOADS, nombre_archivo)

    try:
        with open(ruta_guardado, "w", encoding="utf-8") as f:
            json.dump(publicaciones, f, indent=2, ensure_ascii=False)
        print(f">>> Publicaciones guardadas en: {os.path.abspath(ruta_guardado)}", flush=True)
    except Exception as e:
        print(f"❌ Error al guardar el JSON: {e}", flush=True)
        raise  # Opcional: lanzar el error para que el caller lo maneje

    return nombre_archivo