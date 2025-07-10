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
                        if (response.success) {
                            const resultados = response.tablaA;
                            const filas = response.tablaB;

                            // ---------------- TABLA A (Scraping Apify) ----------------
                            let htmlA = `
                            <h3>Productos encontrados:</h3>
                            <table border="1" style="width:100%; border-collapse: collapse;">
                                <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Imagen</th>
                                    <th>Título</th>
                                    <th>Precio</th>
                                    <th>Enlace</th>
                                </tr>
                                </thead>
                                <tbody>`;

                            resultados.forEach((resultado, idx) => {
                            // Fila de encabezado del grupo
                            htmlA += `
                                <tr class="group-header" data-group="${idx}" style="cursor:pointer; background:#f0f0f0;">
                                <td colspan="5">
                                    <strong>${resultado.producto}</strong> (${resultado.pais})
                                    <span class="toggle-icon">▼</span>
                                </td>
                                </tr>`;

                            if (!resultado.error) {
                                resultado.items.forEach(item => {
                                htmlA += `
                                    <tr class="group-${idx}" style="display:none">
                                    <td></td>
                                    <td><img src="${item.imagen}" width="80"></td>
                                    <td>${item.titulo}</td>
                                    <td>${item.precio} €</td>
                                    <td><a href="${item.url}" target="_blank">Ver producto</a></td>
                                    </tr>`;
                                });
                            } else {
                                htmlA += `
                                <tr class="group-${idx}" style="display:none">
                                    <td colspan="5" style="color:red; text-align:center;">
                                    ${resultado.error}
                                    </td>
                                </tr>`;
                            }
                            });

                            htmlA += `</tbody></table>`;

                            // 1) armar cabecera dinámica
                            const todasLasColumnas = Object.keys(filas[0] || {});   // confía en la primera fila
                            let htmlB = `
                            <h3 style="margin-top:40px;">Selección final (Sheet + Top-3)</h3>
                            <table border="1" style="width:100%;border-collapse:collapse;font-size:13px;">
                                <thead><tr>`;
                            todasLasColumnas.forEach(col => { htmlB += `<th>${col}</th>`; });
                            htmlB += `</tr></thead><tbody>`;

                            // 2) cada fila
                            filas.forEach(f => {
                            htmlB += `<tr>`;
                            todasLasColumnas.forEach(col => {
                                // Si la columna es link lo volvemos clicable
                                if (col === "item_url") {
                                htmlB += `<td><a href="${f[col]}" target="_blank">Ver</a></td>`;
                                } else if (col === "item_imagen") {
                                htmlB += `<td><img src="${f[col]}" width="60"></td>`;
                                } else {
                                htmlB += `<td>${f[col] ?? ""}</td>`;
                                }
                            });
                            htmlB += `</tr>`;
                            });
                            htmlB += `</tbody></table>`;

                            // ---------------- Inyectar todo en el DOM ----------------
                            $('#resultado').html(htmlA + htmlB);

                            // Listeners para mostrar/ocultar items
                            $('.group-header').on('click', function () {
                            const g = $(this).data('group');
                            $(`.group-${g}`).toggle();
                            const ic = $(this).find('.toggle-icon');
                            ic.text(ic.text() == '▼' ? '▲' : '▼');
                            });

                            Swal.fire("¡Listo!", "Scraping completado con éxito.", "success");
                        } else {
                            Swal.fire("Error", response.error || "Algo salió mal.", "error");
                        }
                        }

                        ,
        error: function () {
          Swal.fire("Error", "No se pudo contactar al backend.", "error");
        }
      });
    });