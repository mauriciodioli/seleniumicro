import os
import requests
from flask import Blueprint, request, jsonify
from controllers.conexionesSheet.datosSheet import login, autenticar_y_abrir_sheet

# 📌 Token y Task ID de Apify
APIFY_TOKEN = os.getenv("APIFY_TOKEN")

TASK_ID = "ruly_economy/dpia-amazon"

ACTOR_ID = "axesso_data~amazon-search-scraper"


# 📍 Blueprint
scrape_amazon_dpia = Blueprint('scrape_amazon_dpia', __name__)

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

        return jsonify(success=True, datos=resultados_globales)

    except Exception as e:
        return jsonify(success=False, error=str(e))


def lanzar_scraping_amazon(registros: list, pais_defecto: str) -> list:
    dominio_por_pais = {
        "argentina": "com", "canada": "ca", "francia": "fr", "italia": "it",
        "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
    }
    ACTOR_ID = "axesso_data~amazon-search-scraper"
    base_url = (
        f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items"
        f"?token={APIFY_TOKEN}"
    )

    # 4) Construyo el input array a partir de todas las filas válidas
    payload = {
        "input": [
            {
                "keyword": fila["Producto"],
                "domainCode": dominio_por_pais.get(fila.get("País","").lower(), "com"),
                "sortBy": "recent",
                "maxPages": 1,
                "category": "aps"
            }
            for fila in registros
        ]
    }

    # 5) Hago una sola request, Apify procesará todos los keywords de golpe
    resp = requests.post(base_url, json=payload, timeout=90)
    resp.raise_for_status()
    datos = resp.json()

    if not isinstance(datos, list) or not datos:
        raise ValueError("Respuesta vacía o inválida.")

    # 6) Mappeo la respuesta en función del input original
    #    (si tu actor devuelve en orden, sino tendrás que matchear con algún id)
    resultados = []
    for i, fila in enumerate(registros):
        batch = datos[i] if i < len(datos) else {}
        try:
            items = [
                {
                    "titulo":  d["productDescription"],
                    "precio":  d["price"],
                    "imagen":  d["imgUrl"],
                    "url":     f"https://www.amazon.{payload['input'][i]['domainCode']}{d.get('dpUrl','')}"
                }
                for d in batch.get("items", [])  # o ajusta según tu estructura real
                if d.get("productDescription")
            ]
            if not items:
                raise ValueError("Sin productos relevantes.")
            resultados.append({
                "producto": fila["Producto"],
                "pais":     fila["País"],
                "items":    items
            })
        except Exception as err:
            resultados.append({
                "producto": fila["Producto"],
                "pais":     fila["País"],
                "error":    str(err)
            })

    return resultados
