/* ================== MOCK ================== */
const MOCK_PUBLICACIONES = [
  {id:736, titulo:'stacja-ładująca-usb-c-gan-65w', ambito:'Supermarket', categoria_id:152, idioma:'pl', codigo_postal:'60-001', estado:'activo', fecha_creacion:'2025-08-13'},
  {id:739, titulo:'organizer-kabli-z-magnetycznym-zapięciem-2', ambito:'Supermarket', categoria_id:154, idioma:'pl', codigo_postal:'60-001', estado:'ACTIVO', fecha_creacion:'2025-08-13'},
  {id:748, titulo:'smart-band-fitness-xiaomihonor', ambito:'Technologia', categoria_id:155, idioma:'pl', codigo_postal:'60-001', estado:'ACTIVO', fecha_creacion:'2025-08-25'},
  {id:760, titulo:'mini-drukarka-termiczna-bt-57-mm', ambito:'Technologia', categoria_id:158, idioma:'pl', codigo_postal:'60-001', estado:'ACTIVO', fecha_creacion:'2025-08-25'},
  {id:726, titulo:'t-shirt-z-nadrukiem-vintage', ambito:'Fashion', categoria_id:148, idioma:'pl', codigo_postal:'60-001', estado:'ACTIVO', fecha_creacion:'2025-08-02'},
  {id:839, titulo:'kurtka-przeciwdeszczowa-miejska', ambito:'Moda', categoria_id:281, idioma:'pl', codigo_postal:'60-001', estado:'ACTIVO', fecha_creacion:'2025-08-01'},
  {id:972, titulo:'pompa-di-sentina-12v-rule-8001100-gph', ambito:'Nautica', categoria_id:295, idioma:'it', codigo_postal:'08020', estado:'ACTIVO', fecha_creacion:'2025-09-05'},
  {id:990, titulo:'maschera-snorkeling-integrale-subea-easybreath', ambito:'Nautica', categoria_id:304, idioma:'it', codigo_postal:'08020', estado:'ACTIVO', fecha_creacion:'2025-09-05'},
  {id:705, titulo:'decorazione-dinterni-idee-moderne', ambito:'Lettura', categoria_id:144, idioma:'it', codigo_postal:'06049', estado:'ACTIVO', fecha_creacion:'2025-07-31'},
  {id:714, titulo:'arte-e-design-del-rinascimento', ambito:'Lettura', categoria_id:147, idioma:'it', codigo_postal:'06049', estado:'ACTIVO', fecha_creacion:'2025-07-31'},
  {id:1026, titulo:'Automatic Trading Robot for S&P 500', ambito:'Publicity', categoria_id:28, idioma:'in', codigo_postal:'1', estado:'activo', fecha_creacion:'2025-10-10'},
  {id:1024, titulo:'Gervasi Automation System', ambito:'Publicity', categoria_id:28, idioma:'in', codigo_postal:'1', estado:'activo', fecha_creacion:'2025-10-10'},
];

/* === CP -> Ciudad (labels amigables) === */
const CP_CITY = {
  "60-001": "Poznań",
  "08020":  "Sardegna (NU)",
  "06049":  "Spoleto",
  "1":      "Global"
};
const cpLabel = (cp) => (CP_CITY[cp] ? `${CP_CITY[cp]} — ${cp}` : cp);

/* ============== Helpers panel derecho ============== */
function _ensurePanel(){
  const right = document.getElementById('mdContent');
  if (right) return right;
  const mock = document.getElementById('mockResults');
  if (mock) mock.style.display='block';
  return mock || document.body;
}
function pintarLista(pubs){
  const box = _ensurePanel();
  if (!pubs?.length){ box.innerHTML = `<p class="hint">Sin resultados.</p>`; return; }
  box.innerHTML = pubs.map(p => `
    <article class="mock-card">
      <div class="mock-meta">${p.ambito} · Cat ${p.categoria_id} · ${cpLabel(p.codigo_postal)}</div>
      <h4>${p.titulo}</h4>
      <div class="mock-meta">${p.idioma || ''} · ${p.estado || ''} · ${p.fecha_creacion || ''}</div>
    </article>
  `).join('');
}
const pintarUna = (p) => pintarLista([p]);

/* ============== Cascada (5 selectores) ============== */
(() => {
  const $ = s => document.querySelector(s);
  const btn   = $('#btnAbrirCascada');
  const box   = $('#boxCascada');
  const selLoc= $('#selLoc');  // CP/Ciudad
  const selDom= $('#selDom');  // Dominio
  const selCat= $('#selCat');  // Categoría
  const selPub= $('#selPub');  // Publicación
  const selUsr= $('#selUsr');  // Usuario (mock)

  const PUBS = MOCK_PUBLICACIONES;

  const fillSelect = (sel, items, getVal, getTxt, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>` +
      items.map(it => `<option value="${getVal(it)}">${getTxt(it)}</option>`).join('');
  };

  // ÚNICO listener para abrir/cargar CPs con etiqueta ciudad
  btn.addEventListener('click', () => {
    box.hidden = !box.hidden;
    if (box.hidden) return;

    [selLoc, selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.value=''; });

    const cpsSet = [...new Set(PUBS.map(p => p.codigo_postal).filter(Boolean))];
    const cps = cpsSet.sort().map(cp => ({ cp, label: cpLabel(cp) }));
    selLoc.innerHTML =
      `<option value="">— Elegí CP/Ciudad —</option>` +
      cps.map(it => `<option value="${it.cp}">${it.label}</option>`).join('');
    selLoc.hidden = false;

    _ensurePanel().innerHTML = `<p class="hint">Elegí CP/Ciudad…</p>`;
  });

  // Loc -> Dominios
  selLoc.addEventListener('change', () => {
    [selDom, selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.value=''; });
    const cp = selLoc.value; if (!cp) return;
    const dominios = [...new Set(PUBS.filter(p=>p.codigo_postal===cp).map(p=>p.ambito))].sort();
    fillSelect(selDom, dominios, d=>d, d=>d, '— Elegí dominio —');
    selDom.hidden = false;
    _ensurePanel().innerHTML = `<p class="hint">Elegí dominio…</p>`;
  });

  // Dominio -> Categorías
  selDom.addEventListener('change', () => {
    [selCat, selPub, selUsr].forEach(s => { s.hidden=true; s.value=''; });
    const cp = selLoc.value, dom = selDom.value; if (!dom) return;
    const categorias = [...new Set(PUBS.filter(p=>p.codigo_postal===cp && p.ambito===dom).map(p=>p.categoria_id))]
      .sort((a,b)=>a-b);
    fillSelect(selCat, categorias, c=>c, c=>`Cat ${c}`, '— Elegí categoría —');
    selCat.hidden = false;
    _ensurePanel().innerHTML = `<p class="hint">Elegí categoría…</p>`;
  });

  // Categoría -> Publicaciones (grilla + dropdown opcional)
  selCat.addEventListener('change', () => {
    [selPub, selUsr].forEach(s => { s.hidden=true; s.value=''; });
    const cp = selLoc.value, dom = selDom.value, cat = +selCat.value; if (!cat) return;
    const pubs = PUBS.filter(p=>p.codigo_postal===cp && p.ambito===dom && p.categoria_id===cat);
    pintarLista(pubs);
    fillSelect(selPub, pubs, p=>p.id, p=>p.titulo, '— Opcional: una publicación —');
    selPub.hidden = false;
  });

  // Publicación -> Usuario (mock) y mostrar solo esa
  selPub.addEventListener('change', () => {
    selUsr.hidden = true; selUsr.value='';
    const id = +selPub.value; if (!id) return;
    const p = PUBS.find(x=>x.id===id); if (!p) return;
    pintarUna(p);
    const usuarios = [`Usuario-${p.categoria_id}-A`, `Usuario-${p.categoria_id}-B`, `Usuario-${p.categoria_id}-C`];
    fillSelect(selUsr, usuarios, u=>u, u=>u, '— Opcional: un usuario —');
    selUsr.hidden = false;
  });

  // Usuario (mock) -> aquí podrías abrir chat/detalle
  selUsr.addEventListener('change', () => {/* noop demo */});
})();
