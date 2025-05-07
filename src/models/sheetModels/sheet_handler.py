import time
import gspread

class SheetHandler:
    def __init__(self, sheet_manager, sheetId, sheet_name):
        self.sheet_manager = sheet_manager
        self.sheetId = sheetId
        self.sheet_name = sheet_name

    def leerSheet(self):
        try:
            sheet = self.sheet_manager.abrir_sheet(self.sheetId, self.sheet_name)
            if sheet:
                # Definimos los rangos correctos para tu hoja de productos
                ranges = [
                    'A:A',    # producto
                    'B:B',    # categoría
                    'C:C',    # país
                    'D:D',    # fuente
                    'E:E',    # motivo_tendencia
                    'F:F',    # precio_amazon
                    'G:G',    # precio_ebay
                    'H:H',    # precio_aliexpress
                    'I:I',    # proveedor_mas_barato
                    'J:J',    # link_proveedor
                    'K:K',    # precio_venta_sugerido
                    'L:L',    # margen_estimado
                    'M:M',    # imagen
                    'N:N',    # fecha
                ]

                for _ in range(3):  # Intentar hasta 3 veces
                    try:
                        data = sheet.batch_get(ranges)
                        if data:
                            # Asumiendo que cada lista dentro de data representa una columna de datos
                            producto = [str(item[0]).strip("['").strip("']") for item in data[0][1:]] if len(data) > 0 and len(data[0]) > 1 else []
                            categoria = [str(item).strip("['").strip("']") for item in data[1][1:]] if len(data) > 1 and len(data[1]) > 1 else []
                            pais = [str(item).strip("['").strip("']") for item in data[2][1:]] if len(data) > 2 and len(data[2]) > 1 else []
                            fuente = [str(item).strip("['").strip("']") for item in data[3][1:]] if len(data) > 3 and len(data[3]) > 1 else []
                            motivo_tendencia = [str(item).strip("['").strip("']") for item in data[4][1:]] if len(data) > 4 and len(data[4]) > 1 else []
                            precio_amazon = [str(item).strip("['").strip("']") for item in data[5][1:]] if len(data) > 5 and len(data[5]) > 1 else []
                            precio_ebay = [str(item).strip("['").strip("']") for item in data[6][1:]] if len(data) > 6 and len(data[6]) > 1 else []
                            precio_aliexpress = [str(item).strip("['").strip("']") for item in data[7][1:]] if len(data) > 7 and len(data[7]) > 1 else []
                            proveedor_mas_barato = [str(item).strip("['").strip("']") for item in data[8][1:]] if len(data) > 8 and len(data[8]) > 1 else []
                            link_proveedor = [str(item).strip("['").strip("']") for item in data[9][1:]] if len(data) > 9 and len(data[9]) > 1 else []
                            precio_venta_sugerido = [str(item).strip("['").strip("']") for item in data[10][1:]] if len(data) > 10 and len(data[10]) > 1 else []
                            margen_estimado = [str(item).strip("['").strip("']") for item in data[11][1:]] if len(data) > 11 and len(data[11]) > 1 else []
                            imagen = [str(item).strip("['").strip("']") for item in data[12][1:]] if len(data) > 12 and len(data[12]) > 1 else []
                            fecha = [str(item).strip("['").strip("']") for item in data[13][1:]] if len(data) > 13 and len(data[13]) > 1 else []

                            # Eliminar los encabezados si están presentes y combinar las columnas
                            producto = producto[1:] if len(producto) > 1 else []
                            categoria = categoria[1:] if len(categoria) > 1 else []
                            pais = pais[1:] if len(pais) > 1 else []
                            fuente = fuente[1:] if len(fuente) > 1 else []
                            motivo_tendencia = motivo_tendencia[1:] if len(motivo_tendencia) > 1 else []
                            precio_amazon = precio_amazon[1:] if len(precio_amazon) > 1 else []
                            precio_ebay = precio_ebay[1:] if len(precio_ebay) > 1 else []
                            precio_aliexpress = precio_aliexpress[1:] if len(precio_aliexpress) > 1 else []
                            proveedor_mas_barato = proveedor_mas_barato[1:] if len(proveedor_mas_barato) > 1 else []
                            link_proveedor = link_proveedor[1:] if len(link_proveedor) > 1 else []
                            precio_venta_sugerido = precio_venta_sugerido[1:] if len(precio_venta_sugerido) > 1 else []
                            margen_estimado = margen_estimado[1:] if len(margen_estimado) > 1 else []
                            imagen = imagen[1:] if len(imagen) > 1 else []
                            fecha = fecha[1:] if len(fecha) > 1 else []

                            # Combina los datos en un formato adecuado (puedes cambiar el formato según lo necesites)
                            productos_data = zip(producto, categoria, pais, fuente, motivo_tendencia, precio_amazon, precio_ebay, precio_aliexpress, proveedor_mas_barato, link_proveedor, precio_venta_sugerido, margen_estimado, imagen, fecha)
                            return productos_data
                    except gspread.exceptions.APIError as e:
                        print(f"Error al leer la hoja: {e}")
                        if e.response.status_code == 500:
                            time.sleep(2)  # Esperar 2 segundos antes de reintentar
                        else:
                            break
                return None
            else:
                print("No se pudo abrir la hoja")
                return None
        except Exception as e:
            print(f"Error en el proceso de lectura: {e}")
            return None
