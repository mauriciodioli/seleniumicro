(() => {
  const root = document.documentElement;
  const btn  = document.getElementById('toggleAmbitos');
  const isMobile = () => matchMedia('(max-width:768px)').matches;
  const setIcon = () => {
    const col = root.classList.contains('ambitos-collapsed');
    btn.textContent = isMobile() ? (col ? '▲' : '▼') : (col ? '⟶' : '⟵');
  };
  btn.addEventListener('click', () => { root.classList.toggle('ambitos-collapsed'); setIcon(); });
  addEventListener('resize', setIcon);
  setIcon();
})();
