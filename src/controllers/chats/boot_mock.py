# controllers/chats/boot_mock.py
import json, base64
from flask import Blueprint, request, jsonify, make_response

boot_bp = Blueprint("chat_boot", __name__, url_prefix="/api")

COOKIE_NAME = "chat_boot"
COOKIE_AGE  = 60*60*24*180  # 180 días

# === TUS DATOS (exactos) ===
MOCK_BOOT_DATA = {
    "user": {
        "id": 22,
        "email": "mauriciodioli@gmail.com",
        "alias": "@Mauri",
        "tel": "+393445977100",
        "idioma": "es",
        "cp": "4139"
    },
    "identidades": [
        {"alias": "@Mauri", "tel": "+393445977100", "estado": "verificado"}
    ],
    "ambitos": [
        {
            "ambito": "tecnologia",
            "categoria": "informatica",
            "idioma": "es",
            "cp": "4139",
            "permisos": ["leer", "escribir"]
        }
    ],
    "scope": {"ambito": "tecnologia", "categoria": "informatica"}
}

# --- helpers cookie (guarda JSON como base64-url para no romper la cookie) ---
def _to_b64(d: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(d, separators=(",",":")).encode()).decode()

def _from_b64(s: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(s.encode()))

def _get_cookie_dict() -> dict | None:
    raw = request.cookies.get(COOKIE_NAME)
    if not raw: return None
    try: return _from_b64(raw)
    except Exception: return None

def _set_cookie_dict(resp, d: dict):
    resp.set_cookie(
        COOKIE_NAME, _to_b64(d),
        max_age=COOKIE_AGE, path="/",
        samesite="Lax", secure=False  # en prod: True con HTTPS
    )
    return resp

@boot_bp.get("/boot")
def boot():
    """Devuelve SIEMPRE el objeto MOCK_BOOT_DATA (si hay cookie, la usa; si no, la crea)."""
    data = _get_cookie_dict()
    if data is None:
        # Inicializa cookie con TUS DATOS y devuelve ese mismo objeto
        data = MOCK_BOOT_DATA
        resp = make_response(jsonify(data))
        return _set_cookie_dict(resp, data)
    # Hay cookie → devuelve exactamente lo que está guardado (mismo formato)
    return jsonify(data)

@boot_bp.post("/mock/reset")
def mock_reset():
    """Borra la cookie para re-inicializar en el próximo /boot."""
    resp = make_response(jsonify({"ok": True}))
    resp.delete_cookie(COOKIE_NAME, path="/")
    return resp
