  // 🔁 Cargar datos del Sheet
    $('#btn-cargar-sheet').click(function () {
      const selectedCountry = $('#pais').val();
      debugger;
      if (!selectedCountry) {
        Swal.fire("Error", "Por favor, selecciona un país.", "error");
        return;
      }

      Swal.fire({
        title: 'Enviando...',
        text: 'Estamos cargando los datos del país: ' + selectedCountry,
        didOpen: () => Swal.showLoading()
      });

      $.ajax({
        url: "/resultado_carga",
        method: "POST",
        data: { sheet_name: selectedCountry },
        success: function (response) {
          Swal.fire("¡Éxito!", "Los datos se cargaron correctamente.", "success");
        },
        error: function () {
          Swal.fire("Error", "No se pudo cargar el sheet.", "error");
        }
      });
    });