const accordion = document.querySelector('.id-accordion');

accordion?.addEventListener('click', (e) => {
  const chev = e.target.closest('.id-chev-btn');
  const sum  = e.target.closest('.id-summary');

  // 1) Solo la flecha abre/cierra el <details>
  if (chev) {
    e.stopPropagation();
    const det = chev.closest('details');
    det.open = !det.open;
    return;
  }

  // 2) Clic en la tarjeta (summary) => chatear
  if (sum) {
    e.preventDefault();            // evita toggle del <details>
    e.stopPropagation();

    const scopeStr = sum.getAttribute('data-scope') || '{}';
    const tmp = document.createElement('button');
    tmp.dataset.scope = scopeStr;

    if (typeof chatHere === 'function') chatHere(tmp);
  }
});

// (opcional) teclado para la flecha
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('id-chev-btn')) {
    e.preventDefault();
    e.target.click();
  }
});

