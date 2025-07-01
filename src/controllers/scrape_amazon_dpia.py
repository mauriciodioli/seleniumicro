import os
import requests
from flask import Blueprint, request, jsonify
import json,pathlib
from collections import defaultdict
from controllers.conexionesSheet.datosSheet import login, autenticar_y_abrir_sheet

# 📌 Token y Task ID de Apify
APIFY_TOKEN = os.getenv("APIFY_TOKEN")

TASK_ID = "ruly_economy/dpia-amazon"

ACTOR_ID = "axesso_data~amazon-search-scraper"


# Configuración de cada marketplace
MARKETS = {
    "amazon": {
        "actor": "axesso_data~amazon-search-scraper",
        "domains": {
            "argentina": "com.ar", "canada": "ca", "francia": "fr", "italia": "it",
            "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
        }
    },
    "ebay": {
        "actor": "axesso_data~ebay-search-scraper",
        "domains": {
            "argentina": "com.ar", "canada": "ca", "francia": "fr", "italia": "it",
            "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
        }
    },
    "aliexpress": {
        "actor": "axesso_data~aliexpress-search-scraper",
        "domains": {
            # AliExpress no cambia mucho de dominio, pero podrías mapear países a idiomas
            "argentina": "com", "canada": "com", "francia": "fr", "italia": "it",
            "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
        }
    },
    "mercadolibre": {
        "actor": "apify/mercadolibre-scraper",
        "domains": {
            "argentina": "com.ar", "mexico": "com.mx", "colombia": "com.co",
            "chile": "cl", "brasil": "com.br", "venezuela": "com.ve"
            # añade los que necesites
        }
    }
}

# 📍 Blueprint
scrape_amazon_dpia = Blueprint('scrape_amazon_dpia', __name__)





# —————— Orquestador en tu endpoint ——————



# 📍 Endpoint que se invoca desde el botón
@scrape_amazon_dpia.route('/scrape_amazon', methods=['POST'])
def scrape_amazon():
    try:
        # Recibo sheet_name (p.ej. "Polonia") del front
        sheet_name = request.get_json().get("sheet_name")
        sheetId = '1munTyxoLc5px45cz4cO_lLRrqyFsOwjTUh8xDPOiHOg'
        sheet = autenticar_y_abrir_sheet(sheetId, sheet_name)

        resultados = []
        if not sheet:
            return jsonify(success=False, error="No pude abrir la hoja")

        # 1) Traigo todas las filas
        filas = sheet.get_all_records()  

        # 2) Filtro sólo las que necesito
        #    Ajusta las condiciones al gusto:
        filas_validas = [
            f for f in filas 
            if f.get("Producto")
            and f.get("estado", "").upper() == "ACTIVO"
            and str(f.get("validado", "")).upper() == "FALSE"
        ]

        if not filas_validas:
            return jsonify(success=True, datos=[])

        # 3) Llamo al scraper **una sola vez** con la lista entera
        resultados_globales = lanzar_scraping_amazon(filas_validas, sheet_name)
       
        print("=== DEBUG Scrape Amazon ===")
        print(f"Filas válidas: {len(filas_validas)}")
        print(f"Resultados Globales: {len(resultados_globales)} entradas")
        print(json.dumps(resultados_globales, indent=2, ensure_ascii=False))
        return jsonify(success=True, datos=resultados_globales)

    except Exception as e:
        return jsonify(success=False, error=str(e))


def lanzar_scraping_amazon(registros: list, pais_defecto: str) -> list:
    import json, pathlib
    dominio_por_pais = {
        "argentina": "com", "canada": "ca", "francia": "fr", "italia": "it",
        "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
    }
    ACTOR_ID = "axesso_data~amazon-search-scraper"
    base_url = (
        f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items"
        f"?token={APIFY_TOKEN}"
    )

    # 1) Payload sin searchId
    payload = {
        "input": [
            {
                "keyword":    fila["Producto"],
                "domainCode": dominio_por_pais.get(fila.get("País","").lower(), "com"),
                "sortBy":     "recent",
                "maxPages":   1,
                "category":   "aps"
            }
            for fila in registros
        ]
    }

    # 2) Petición y JSON crudo
    resp = requests.post(base_url, json=payload, timeout=90)
    resp.raise_for_status()
    datos = resp.json()

    # DEBUG: vuelca primeros 10 para inspección
    pathlib.Path("apify_debug.json").write_text(json.dumps(datos[:10], indent=2, ensure_ascii=False))
    print(">>> DEBUG primeros 10 items de Apify:", json.dumps(datos[:10], indent=2, ensure_ascii=False))

    if not isinstance(datos, list) or not datos:
        raise ValueError("Respuesta vacía o inválida.")

    # 3) Agrupo POR keyword
    agrupado_por_keyword = defaultdict(list)
    for item in datos:
        kw = item.get("keyword")
        if kw:
            agrupado_por_keyword[kw].append(item)

    # 4) Reconstruyo resultados
    resultados = []
    for fila in registros:
        prod = fila["Producto"]
        raw_items = agrupado_por_keyword.get(prod, [])
        print(f">>> DEBUG '{prod}' encontró {len(raw_items)} registros crudos")

        items = []
        for d in raw_items:
            desc = d.get("productDescription")
            if desc:
                items.append({
                    "titulo": desc,
                    "precio": d.get("price", "N/A"),
                    "imagen": d.get("imgUrl", ""),
                    "url":     f"https://www.amazon.{dominio_por_pais.get(fila.get('País','').lower(), 'com')}{d.get('dpUrl','')}"
                })

        if items:
            resultados.append({
                "producto": prod,
                "pais":     fila["País"],
                "items":    items
            })
        else:
            resultados.append({
                "producto": prod,
                "pais":     fila["País"],
                "error":    "Sin productos relevantes."
            })

    return resultados

def lanzar_scraping_aliexpress(registros: list, pais_defecto: str) -> list:
    import json, pathlib, requests
    # actor y dominio para AliExpress
    ACTOR_ID = "axesso_data~aliexpress-search-scraper"
    dominio_por_pais = {
        "argentina":"com","canada":"com","francia":"fr","italia":"it",
        "estados_unidos":"com","alemania":"de","espana":"es","polonia":"pl"
    }
    base_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={APIFY_TOKEN}"

    # payload idéntico al de Amazon
    payload = {"input":[
        {
            "keyword": fila["Producto"],
            "domainCode": dominio_por_pais.get(fila.get("País","").lower(),"com"),
            "sortBy": "recent",
            "maxPages": 1,
            "category": "aps"
        }
        for fila in registros
    ]}

    resp = requests.post(base_url, json=payload, timeout=90)
    resp.raise_for_status()
    datos = resp.json()

    # agrupo por keyword
    agrupado = defaultdict(list)
    for item in datos:
        kw = item.get("keyword")
        agrupado[kw].append(item)

    # construyo resultados
    resultados = []
    for fila in registros:
        prod = fila["Producto"]
        raw = agrupado.get(prod, [])
        items = []
        for d in raw:
            if d.get("productDescription"):
                items.append({
                    "titulo": d["productDescription"],
                    "precio": d.get("price","N/A"),
                    "imagen": d.get("imgUrl",""),
                    "url":     f"https://www.aliexpress.{dominio_por_pais.get(fila.get('País','').lower(),'com')}{d.get('dpUrl','')}"
                })
        resultados.append({
            "producto": prod,
            "pais":     fila["País"],
            "items":    items or [],
            "error":    None if items else "Sin productos relevantes"
        })
    return resultados

def lanzar_scraping_ebay(registros: list, pais_defecto: str) -> list:
    ACTOR_ID = "dtrungtin/ebay-items-scraper"  # tu Actor ID exacto
    dominio_por_pais = {
        "argentina": "com.ar","canada": "ca","francia": "fr",
        "italia": "it","estados_unidos": "com","alemania": "de",
        "espana": "es","polonia": "pl"
    }

    # 1) Construyo la lista de startUrls, una por fila
    start_urls = [
        {
          "url": (
             f"https://www.ebay.{ dominio_por_pais.get(fila['País'].lower(), 'com') }"
             f"/sch/i.html?_nkw={fila['Producto'].replace(' ', '+')}"
          )
        }
        for fila in registros
    ]
    payload = {
        "proxyConfig": {"useApifyProxy": True},
        "maxItems":    5,       # ajusta cuántos items por búsqueda
        "startUrls":   start_urls
    }

    # 2) Lanzar la petición
    resp = requests.post(
      f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={APIFY_TOKEN}",
      json=payload,
      timeout=90
    )
    resp.raise_for_status()
    datos = resp.json()

    # 3) Agrupo los items por la URL original
    agrupado = defaultdict(list)
    for d in datos:
        req = d.get("request", {})  # este actor incluye request.url
        url = req.get("url")
        if url:
            agrupado[url].append(d)

    # 4) Construyo el output paralelo a tus registros
    resultados = []
    for fila in registros:
        code       = dominio_por_pais.get(fila['País'].lower(), 'com')
        search_url = (
          f"https://www.ebay.{code}/sch/i.html?_nkw={fila['Producto'].replace(' ', '+')}"
        )
        raw_items = agrupado.get(search_url, [])
        items = []
        for d in raw_items:
            # ajusta estos campos si tu actor los devuelve con otro nombre
            titulo = d.get("title") or d.get("productDescription")
            precio = d.get("price")
            img    = d.get("image") or d.get("imgUrl")
            link   = d.get("url") or d.get("itemUrl")
            if titulo and precio:
                items.append({
                    "titulo": titulo,
                    "precio": precio,
                    "imagen": img,
                    "url":     link
                })

        resultados.append({
            "producto": fila["Producto"],
            "pais":     fila["País"],
            "items":    items,
            "error":    None if items else "Sin resultados en eBay"
        })

    return resultados
def lanzar_scraping_ml(registros: list, pais_defecto: str) -> list:
    # equivalente para MercadoLibre
    ACTOR_ID = "apify/mercadolibre-scraper"
    dominio_por_pais = {
        "argentina":"com.ar","mexico":"com.mx","colombia":"com.co",
        "chile":"cl","brasil":"com.br","venezuela":"com.ve"
    }
    base_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={APIFY_TOKEN}"
       # payload idéntico al de Amazon
    payload = {"input":[
        {
            "keyword": fila["Producto"],
            "domainCode": dominio_por_pais.get(fila.get("País","").lower(),"com"),
            "sortBy": "recent",
            "maxPages": 1,
            "category": "aps"
        }
        for fila in registros
    ]}

    resp = requests.post(base_url, json=payload, timeout=90)
    resp.raise_for_status()
    datos = resp.json()

    # agrupo por keyword
    agrupado = defaultdict(list)
    for item in datos:
        kw = item.get("keyword")
        agrupado[kw].append(item)

    # construyo resultados
    resultados = []
    for fila in registros:
        prod = fila["Producto"]
        raw = agrupado.get(prod, [])
        items = []
        for d in raw:
            if d.get("productDescription"):
                items.append({
                    "titulo": d["productDescription"],
                    "precio": d.get("price","N/A"),
                    "imagen": d.get("imgUrl",""),
                    "url":     f"https://www.aliexpress.{dominio_por_pais.get(fila.get('País','').lower(),'com')}{d.get('dpUrl','')}"
                })
        resultados.append({
            "producto": prod,
            "pais":     fila["País"],
            "items":    items or [],
            "error":    None if items else "Sin productos relevantes"
        })
    return resultados

