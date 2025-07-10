// 🔍 Ejecutar scraping Apify
    $('#btn-scrapear').click(function () {
      const selectedCountry = $('#pais').val();

        if (!selectedCountry) {
          Swal.fire("Error", "Por favor, seleccioná un país primero.", "error");
          return;
        }

        Swal.fire({
          title: 'Scrapeando...',
          text: 'Ejecutando búsqueda con Apify para: ' + selectedCountry,
          didOpen: () => Swal.showLoading()
        });



        debugger;
      $.ajax({
          url: "/scrape_amazon",
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify({ sheet_name: selectedCountry }),


          success: function (response) {
                if (!response.success) {
                    Swal.fire("Error", response.error || "Algo salió mal", "error");
                    return;
                }

                //---------------- TABLA A  (scraping) ----------------//
                const resultados = response.tablaA;
                let htmlA = `
                    <h3>Productos encontrados (Scraping Apify):</h3>
                    <table border="1" style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr><th>Producto</th><th>Imagen</th><th>Título</th><th>Precio</th><th>Enlace</th></tr>
                    </thead><tbody>`;

                resultados.forEach((res, idx) => {
                    htmlA += `
                    <tr class="group-header" data-group="${idx}" style="cursor:pointer;background:#f0f0f0">
                        <td colspan="5"><strong>${res.producto}</strong> (${res.pais}) <span class="toggle-icon">▼</span></td>
                    </tr>`;

                    if (res.error) {
                    htmlA += `<tr class="group-${idx}" style="display:none"><td colspan="5" style="color:red;text-align:center">${res.error}</td></tr>`;
                    return;
                    }
                    res.items.forEach(item => {
                    htmlA += `
                        <tr class="group-${idx}" style="display:none">
                        <td></td>
                        <td><img src="${item.imagen}" width="80"></td>
                        <td>${item.titulo}</td>
                        <td>${item.precio} €</td>
                        <td><a href="${item.url}" target="_blank">Ver producto</a></td>
                        </tr>`;
                    });
                });
                htmlA += `</tbody></table>`;

                //---------------- TABLA B  (sheet + top-3) -----------//
    
                    const filas = response.tablaB;
                    if (filas.length === 0) {
                    $('#resultado').append('<p>No hay filas para la tabla B.</p>');
                    return;
                    }

                    /* 1️⃣  Obtenemos todas las claves de la PRIMERA fila  */
                    let columnas = Object.keys(filas[0]);

                    /* 2️⃣  (Opcional) mueve los item_ al final para que se vean después del Sheet  */
                    const itemCols   = columnas.filter(c => c.startsWith('item_'));
                    const sheetCols  = columnas.filter(c => !c.startsWith('item_'));
                    columnas = sheetCols.concat(itemCols);

                    /* 3️⃣  Cabecera dinámica */
                    let htmlB = `
                    <h3 style="margin-top:40px">Selección final (Sheet + Top-3)</h3>
                    <table border="1" style="width:100%;border-collapse:collapse">
                        <thead><tr>${columnas.map(c => `<th>${c}</th>`).join("")}</tr></thead>
                        <tbody>`;

                    /* 4️⃣  Filas */
                    filas.forEach(fila => {
                    htmlB += "<tr>";
                    columnas.forEach(col => {
                        const val = fila[col] ?? "";
                        if (col.match(/^imagen\d*$|^item_imagen$/)) {               // cualquier campo imagenX o item_imagen
                        htmlB += `<td>${val ? `<img src="${val}" width="60">` : ""}</td>`;
                        } else if (col === "item_url" || col.startsWith("búsqueda_")) {
                        htmlB += `<td>${val ? `<a href="${val}" target="_blank">link</a>` : ""}</td>`;
                        } else {
                        htmlB += `<td>${val}</td>`;
                        }
                    });
                    htmlB += "</tr>";
                    });

                    htmlB += "</tbody></table>";

                //---------------- Inyectar en el DOM ----------------//
                $('#resultado').html(htmlA + htmlB);

                // toggle filas de la tabla A
                $('.group-header').on('click', function () {
                    const g = $(this).data('group');
                    $(`.group-${g}`).toggle();
                    const ic = $(this).find('.toggle-icon');
                    ic.text(ic.text() === '▼' ? '▲' : '▼');
                });

                Swal.fire("¡Listo!", "Scraping completado con éxito.", "success");
                },
                error() { Swal.fire("Error", "No se pudo contactar al backend.", "error"); }

      });
    });