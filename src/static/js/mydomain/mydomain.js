document.addEventListener('DOMContentLoaded', () => {
  const btnMyDomain  = document.getElementById('btnMyDomain');
  const mainGrid     = document.querySelector('.app-grid');
  const myDomainView = document.getElementById('myDomainView');
  const btnBackMain  = document.getElementById('btnBackToMain');
  const btnMdBack    = document.getElementById('btnMdBack');
  const mdLeft       = document.getElementById('myDomainLeft');

  // abrir vista my-domain
  btnMyDomain?.addEventListener('click', () => {
    if (mainGrid) mainGrid.style.display = 'none';
    if (myDomainView) {
      myDomainView.classList.add('show');     // por si lo usás en desktop
      myDomainView.setAttribute('data-view', 'left'); // arrancar en lista
    }
  });

  // volver a vista normal (solo PC)
  btnBackMain?.addEventListener('click', () => {
    if (mainGrid) mainGrid.style.display = '';
    if (myDomainView) myDomainView.classList.remove('show');
  });

  // volver a lista en mobile
  btnMdBack?.addEventListener('click', () => {
    if (myDomainView) {
      myDomainView.setAttribute('data-view', 'left');
    }
  });

  // cuando toco una categoría de la IZQUIERDA -> mostrar detalle (y en mobile deslizar)
  mdLeft?.addEventListener('click', (e) => {
    const btn = e.target.closest('.md-cat, [data-categoria]');
    if (!btn) return;

    const ambito = btn.dataset.ambito;
    const categoria = btn.dataset.categoria;

    // 1) cargar datos en el panel derecho
    loadUsersInMyDomain(ambito, categoria);

    // 2) si estamos en mobile -> deslizar
    if (window.matchMedia('(max-width: 767px)').matches) {
      myDomainView.setAttribute('data-view', 'right');
    }
  });

  async function loadUsersInMyDomain(ambito, categoria){
    const cont = document.getElementById('mdContent');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando…</p>';
    try{
      const r = await fetch(`/api/ambitos/mios/${ambito}?categoria=${categoria||''}`);
      const data = await r.json();
      cont.innerHTML = renderUsers(data.usuarios || []);
    }catch(err){
      cont.innerHTML = '<p>Error al cargar.</p>';
    }
  }

  function renderUsers(list){
    if (!list.length) return '<p>No hay otros usuarios en esta categoría.</p>';
    return `
      <ul class="md-user-list">
        ${list.map(u => `
          <li class="md-user">
            <span>${u.alias || u.nombre}</span>
            ${u.verificado ? '<span class="md-tag">verificado</span>' : ''}
            <button class="btn btn-sm" data-goto="chat" data-user="${u.id}">Chatear</button>
          </li>
        `).join('')}
      </ul>
    `;
  }
});



document.addEventListener('DOMContentLoaded', () => {
  const btnMyDomain  = document.getElementById('btnMyDomain');
  const mainGrid     = document.querySelector('.app-grid');
  const myDomainView = document.getElementById('myDomainView');
  const btnBackMain  = document.getElementById('btnBackToMain');
  const btnMdBack    = document.getElementById('btnMdBack');
  const mdLeft       = document.getElementById('myDomainLeft');

  // abrir
  btnMyDomain?.addEventListener('click', () => {
    if (mainGrid) mainGrid.style.display = 'none';
    if (myDomainView) {
      myDomainView.classList.add('show');
      myDomainView.setAttribute('data-view', 'left');
    }
  });

  // volver a vista normal (desktop)
  btnBackMain?.addEventListener('click', () => {
    if (mainGrid) mainGrid.style.display = '';
    if (myDomainView) myDomainView.classList.remove('show');
  });

  // volver a lista en mobile
  btnMdBack?.addEventListener('click', () => {
    if (myDomainView) {
      myDomainView.setAttribute('data-view', 'left');
    }
  });

  // CLICK DENTRO DE LA VISTA MY DOMAIN
  myDomainView?.addEventListener('click', (e) => {
    const tabUser   = e.target.closest('[data-mode="user"]');
    const tabDomain = e.target.closest('[data-mode="domain"]');

    // 1) si tocó "User" dentro de My Domain → volver al index
    if (tabUser){
      if (mainGrid) mainGrid.style.display = '';
      myDomainView.classList.remove('show');
      return;
    }

    // 2) si tocó "Domain" dentro de My Domain → solo cambiamos al panel derecho (mobile)
    if (tabDomain){
      // si querés, podés ir directo al right en mobile
      if (window.matchMedia('(max-width: 767px)').matches){
        myDomainView.setAttribute('data-view', 'right');
      }
      // y si querés cargar algo especial para dominios, lo hacés acá
      return;
    }
  });

  // cuando toco una categoría de la IZQUIERDA -> cargar y (en mobile) deslizar
  mdLeft?.addEventListener('click', (e) => {
    const btn = e.target.closest('.md-cat, [data-categoria]');
    if (!btn) return;

    const ambito = btn.dataset.ambito;
    const categoria = btn.dataset.categoria;

    loadUsersInMyDomain(ambito, categoria);

    if (window.matchMedia('(max-width: 767px)').matches) {
      myDomainView.setAttribute('data-view', 'right');
    }
  });

  async function loadUsersInMyDomain(ambito, categoria){
    const cont = document.getElementById('mdContent');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando…</p>';
    try{
      const r = await fetch(`/api/ambitos/mios/${ambito}?categoria=${categoria||''}`);
      const data = await r.json();
      cont.innerHTML = renderUsers(data.usuarios || []);
    }catch(err){
      cont.innerHTML = '<p>Error al cargar.</p>';
    }
  }

  function renderUsers(list){
    if (!list.length) return '<p>No hay otros usuarios en esta categoría.</p>';
    return `
      <ul class="md-user-list">
        ${list.map(u => `
          <li class="md-user">
            <span>${u.alias || u.nombre}</span>
            ${u.verificado ? '<span class="md-tag">verificado</span>' : ''}
            <button class="btn btn-sm" data-goto="chat" data-user="${u.id}">Chatear</button>
          </li>
        `).join('')}
      </ul>
    `;
  }
});




document.addEventListener('DOMContentLoaded', () => {
  const mainGrid     = document.querySelector('.app-grid');      // vista 3 columnas
  const myDomainView = document.getElementById('myDomainView');  // vista 2 columnas
  const btnMyDomain  = document.getElementById('btnMyDomain');   // botón de la navbar
  const btnBackMain  = document.getElementById('btnBackToMain'); // botón dentro de MyDomain
  const btnMdBack    = document.getElementById('btnMdBack');     // boton mobile dentro de MyDomain
  const mdLeft       = document.getElementById('myDomainLeft');

  // --- 1) abrir desde la navbar (My domain)
  btnMyDomain?.addEventListener('click', openMyDomain);

  // --- 2) abrir desde cualquier botón "Domain" del index
  document.addEventListener('click', (e) => {
    // si ya estoy dentro de MyDomain, no hago nada acá
    if (myDomainView?.classList.contains('show')) return;

    const domainBtn =
      e.target.closest('[data-mode="domain"]') ||
      e.target.closest('[data-goto="my-domain"]');
    if (!domainBtn) return;

    // este "Domain" viene del index → abrir MyDomain
    openMyDomain();
  });

  // --- 3) volver a la vista normal (desktop)
  btnBackMain?.addEventListener('click', closeMyDomain);

  // --- 4) volver a la lista dentro de MyDomain (mobile)
  btnMdBack?.addEventListener('click', () => {
    if (myDomainView) {
      myDomainView.setAttribute('data-view', 'left');
    }
  });

  // --- 5) click en una categoría de la izquierda dentro de MyDomain
  mdLeft?.addEventListener('click', (e) => {
    const btn = e.target.closest('.md-cat, [data-categoria]');
    if (!btn) return;

    const ambito = btn.dataset.ambito;
    const categoria = btn.dataset.categoria;
    loadUsersInMyDomain(ambito, categoria);

    // en mobile → deslizar
    if (window.matchMedia('(max-width: 767px)').matches) {
      myDomainView.setAttribute('data-view', 'right');
    }
  });

  // ===== helpers =====
  function openMyDomain(){
    if (mainGrid) mainGrid.style.display = 'none';
    if (myDomainView){
      myDomainView.classList.add('show');
      myDomainView.setAttribute('data-view', 'left');
    }
  }

  function closeMyDomain(){
    if (mainGrid) mainGrid.style.display = '';
    if (myDomainView) myDomainView.classList.remove('show');
  }

  async function loadUsersInMyDomain(ambito, categoria){
    const cont = document.getElementById('mdContent');
    if (!cont) return;
    cont.innerHTML = '<p>Cargando…</p>';
    try{
      const r = await fetch(`/api/ambitos/mios/${ambito}?categoria=${categoria||''}`);
      const data = await r.json();
      cont.innerHTML = renderUsers(data.usuarios || []);
    }catch(err){
      cont.innerHTML = '<p>Error al cargar.</p>';
    }
  }

  function renderUsers(list){
    if (!list.length) return '<p>No hay otros usuarios en esta categoría.</p>';
    return `
      <ul class="md-user-list">
        ${list.map(u => `
          <li class="md-user">
            <span>${u.alias || u.nombre}</span>
            ${u.verificado ? '<span class="md-tag">verificado</span>' : ''}
            <button class="btn btn-sm" data-goto="chat" data-user="${u.id}">Chatear</button>
          </li>
        `).join('')}
      </ul>
    `;
  }
});
