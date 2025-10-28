document.addEventListener('DOMContentLoaded', () => {
  const q = document.getElementById('amb-q');
  const btn = document.getElementById('amb-btnSearch');
  const panel = document.getElementById('ambQueryPanel');

  if (!panel) return;

  const open  = () => panel.classList.add('is-open');
  const close = () => panel.classList.remove('is-open');

  // Cerrar por defecto al cargar
  close();

  // Abrir sólo si hay texto o resultados (ajusta esta condición a tu lógica)
  btn?.addEventListener('click', () => {
    const hasQuery = (q?.value || '').trim().length > 0;
    hasQuery ? open() : close();
  });

  // Enter en el input
  q?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const hasQuery = (q.value || '').trim().length > 0;
      hasQuery ? open() : close();
    }
  });

  // Si se borra la query, cerramos
  q?.addEventListener('input', () => {
    if ((q.value || '').trim().length === 0) close();
  });

  // Escape también cierra
  q?.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
});