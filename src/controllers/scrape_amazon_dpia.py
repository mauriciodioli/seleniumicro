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
        data = request.get_json()
        pais = data.get("sheet_name")  # ⚠️ el front lo llama así
        keyword = pais.capitalize()


        sheetId = '1munTyxoLc5px45cz4cO_lLRrqyFsOwjTUh8xDPOiHOg'
        sheet_name = data.get("sheet_name")  # recibe del AJAX
        sheet = autenticar_y_abrir_sheet(sheetId, sheet_name)

        resultados = []
        if sheet:
            data = sheet.get_all_records()    # ← data ahora es la lista de filas

            for fila in data:
                producto = fila.get("Producto")
                pais_fila = fila.get("País", pais)

                if not producto:
                    continue  # fila mal formada

                try:
                    items = lanzar_scraping_amazon(producto, pais_fila)
                    resultados.append({
                        "producto": producto,
                        "pais": pais_fila,
                        "items": items
                    })
                except Exception as err:
                    # guardamos el error y seguimos con las demás filas
                    resultados.append({
                        "producto": producto,
                        "pais": pais_fila,
                        "error": str(err)
                    })

        return jsonify(success=True, datos=resultados)

    except Exception as e:
        return jsonify(success=False, error=str(e))

    
def lanzar_scraping_amazon(registros: list, pais_defecto: str) -> list:
    """
    • registros: list[dict] proveniente de sheet.get_all_records()
    • pais_defecto: el nombre de la pestaña (Polonia, Italia, etc.)
    Devuelve list[dict] con items scrapeados o error por fila.
    """
    dominio_por_pais = {
        "argentina": "com", "canada": "ca", "francia": "fr", "italia": "it",
        "estados_unidos": "com", "alemania": "de", "espana": "es", "polonia": "pl"
    }
    ACTOR_ID = "axesso_data~amazon-search-scraper"
    base_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={APIFY_TOKEN}"

    resultados_globales = []

    for fila in registros:
        producto = fila.get("Producto") or fila.get("keyword")
        if not producto:
            continue  # fila vacía o mal formada

        pais = fila.get("País", pais_defecto).lower()
        domain_code = dominio_por_pais.get(pais, "com")

        print(f"[🔍] Iniciando scraping de Amazon para '{producto}' en '{pais}'...")

        payload = {
                "input": [       # 👈  DEBE ser lista, no dict
                    {
                        "keyword":    producto,
                        "domainCode": domain_code,
                        "sortBy":     "recent",
                        "maxPages":   1,
                        "category":   "aps"
                    }
                ]
            }


        try:
            resp = requests.post(base_url, json=payload, timeout=90)
            resp.raise_for_status()
            datos = resp.json()

            if not isinstance(datos, list) or not datos:
                raise ValueError("Respuesta vacía o inválida.")

            items = [{
                "titulo":  d.get("productDescription", "Sin título"),
                "precio":  d.get("price", "N/A"),
                "imagen":  d.get("imgUrl", ""),
                "url":     f"https://www.amazon.{domain_code}{d.get('dpUrl', '')}"
            } for d in datos if d.get("productDescription")]

            if not items:
                raise ValueError("Sin productos relevantes.")

            resultados_globales.append({
                "producto": producto,
                "pais": pais,
                "items": items
            })

        except Exception as err:
            resultados_globales.append({
                "producto": producto,
                "pais": pais,
                "error": str(err)
            })

    return resultados_globales