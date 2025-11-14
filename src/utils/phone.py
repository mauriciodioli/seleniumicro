# utils/phone.py
import re

def normalize_phone(raw: str, default_cc: str = "39") -> str:
    """
    Normaliza a algo tipo E.164.
    default_cc = '39' Italia, podés cambiar a '48' PL o lo que quieras.
    """
    if not raw:
        return ""

    s = re.sub(r"[^\d+]", "", str(raw))
    if not s:
        return ""

    if s.startswith("+"):
        return s

    s = re.sub(r"^0+", "", s)
    if re.fullmatch(r"\d+", s):
        return f"+{default_cc}{s}"

    return s