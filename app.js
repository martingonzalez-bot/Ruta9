(() => {
  const products = window.RUTA9_PRODUCTS || [];
  const categories = ['Todo','Burgers','Snacks','Papas','Burger Factory','Extras'];
  let activeCategory = 'Todo';
  let search = '';
  let motionEnabled = true;
  let selectedProduct = null;
  let exploded = false;
  let cameraStream = null;

  const $ = (s) => document.querySelector(s);
  const menu = $('#menu');
  const home = $('#home');
  const productGrid = $('#product-grid');
  const categoryRow = $('#category-row');
  const resultCount = $('#result-count');
  const emptyState = $('#empty-state');
  const searchPanel = $('#search-panel');
  const searchInput = $('#search-input');
  const motionStatus = $('#motion-status');

  const formatPrice = (n) => '$' + Number(n).toLocaleString('es-CL');

  function openMenu() {
    home.classList.add('hidden');
    menu.classList.remove('hidden');
    window.scrollTo({top:0, behavior:'instant'});
    renderCategories();
    renderProducts();
  }

  function renderCategories() {
    categoryRow.innerHTML = categories.map(c => `<button role="tab" aria-selected="${c===activeCategory}" class="cat-btn ${c===activeCategory?'active':''}" data-category="${c}">${c}</button>`).join('');
    categoryRow.querySelectorAll('.cat-btn').forEach(btn => btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category;
      renderCategories();
      renderProducts();
    }));
  }

  function filteredProducts() {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const catOk = activeCategory === 'Todo' || p.category === activeCategory;
      const qOk = !q || `${p.code} ${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }

  function renderProducts() {
    const list = filteredProducts();
    resultCount.textContent = `${list.length} ${list.length===1?'plato':'platos'} disponibles`;
    emptyState.classList.toggle('hidden', list.length !== 0);
    productGrid.innerHTML = list.map(p => `
      <article class="product-card" tabindex="0" data-code="${p.code}">
        <div class="product-top"><span class="product-code">${p.code}</span>${p.favorite?'<span class="favorite">FAVORITO</span>':''}</div>
        <div class="product-category">${p.category}</div>
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <div class="product-bottom"><strong>${formatPrice(p.price)}</strong><span>Ver detalle →</span></div>
      </article>`).join('');
    productGrid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => showProduct(card.dataset.code));
      card.addEventListener('keydown', (e) => { if(e.key==='Enter' || e.key===' ') { e.preventDefault(); showProduct(card.dataset.code); } });
    });
  }

  function showProduct(code) {
    selectedProduct = products.find(p => p.code === code);
    if(!selectedProduct) return;
    $('#modal-code').textContent = selectedProduct.code;
    $('#modal-category').textContent = selectedProduct.category;
    $('#modal-title').textContent = selectedProduct.name;
    $('#modal-price').textContent = formatPrice(selectedProduct.price);
    $('#modal-description').textContent = selectedProduct.description;
    $('#product-modal').classList.remove('hidden');
    document.body.classList.add('no-scroll');
  }

  function closeProductModal() {
    $('#product-modal').classList.add('hidden');
    document.body.classList.remove('no-scroll');
  }

  function openAr() {
    $('#ar-modal').classList.remove('hidden');
    document.body.classList.add('no-scroll');
    stopCamera();
    resetBurger();
  }

  function closeAr() {
    $('#ar-modal').classList.add('hidden');
    document.body.classList.remove('no-scroll');
    stopCamera();
  }

  async function startCamera() {
    const video = $('#camera-video');
    const placeholder = document.querySelector('.camera-placeholder');
    if(!navigator.mediaDevices?.getUserMedia) {
      placeholder.innerHTML = '<p>Este navegador no permite acceder a la cámara desde esta previsualización.</p>';
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}, audio:false});
      video.srcObject = cameraStream;
      video.classList.add('active');
      placeholder.classList.add('hidden');
    } catch (err) {
      placeholder.innerHTML = '<p>No se concedió permiso para la cámara. Puedes seguir usando la demostración 3D sin cámara.</p>';
    }
  }

  function stopCamera() {
    if(cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    const video = $('#camera-video');
    if(video) { video.pause(); video.srcObject = null; video.classList.remove('active'); }
    const placeholder = document.querySelector('.camera-placeholder');
    if(placeholder) {
      placeholder.classList.remove('hidden');
      placeholder.innerHTML = '<div class="lens-icon">◉</div><p>La cámara se activa solo cuando tú lo pides.</p><button id="start-camera" class="btn btn-primary">Abrir cámara</button>';
      $('#start-camera').addEventListener('click', startCamera);
    }
  }

  function resetBurger() {
    exploded = false;
    $('#burger-model').classList.remove('exploded');
  }

  $('#open-menu').addEventListener('click', openMenu);
  $('#open-ar-home').addEventListener('click', openAr);
  $('#open-ar-menu').addEventListener('click', openAr);
  $('#back-home').addEventListener('click', () => { menu.classList.add('hidden'); home.classList.remove('hidden'); window.scrollTo({top:0,behavior:'instant'}); });
  $('#open-search').addEventListener('click', () => { searchPanel.classList.toggle('hidden'); if(!searchPanel.classList.contains('hidden')) searchInput.focus(); });
  $('#clear-search').addEventListener('click', () => { search=''; searchInput.value=''; renderProducts(); searchInput.focus(); });
  searchInput.addEventListener('input', e => { search=e.target.value; renderProducts(); });
  $('#toggle-motion').addEventListener('click', () => { motionEnabled=!motionEnabled; motionStatus.textContent=`Movimiento: ${motionEnabled?'activado':'desactivado'}`; document.body.classList.toggle('motion-off', !motionEnabled); });
  $('#reset-view').addEventListener('click', reset3D);
  document.querySelectorAll('[data-close-modal]').forEach(el=>el.addEventListener('click', closeProductModal));
  document.querySelectorAll('[data-close-ar]').forEach(el=>el.addEventListener('click', closeAr));
  $('#start-camera').addEventListener('click', startCamera);
  $('#explode-burger').addEventListener('click', () => { exploded=!exploded; $('#burger-model').classList.toggle('exploded', exploded); });
  $('#reset-burger').addEventListener('click', resetBurger);

  function reset3D() {
    $('#hero-card').style.transform = 'rotateX(0deg) rotateY(0deg) rotateZ(-4deg)';
  }

  const hero = $('#hero-card');
  let dragging=false, startX=0, startY=0;
  function move3d(x,y) {
    if(!motionEnabled) return;
    const rx = Math.max(-10, Math.min(10, (y-window.innerHeight*0.55)*-0.02));
    const ry = Math.max(-14, Math.min(14, (x-window.innerWidth*0.55)*0.025));
    hero.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(-4deg)`;
  }
  window.addEventListener('pointermove', e => { if(e.pointerType==='mouse' || dragging) move3d(e.clientX,e.clientY); }, {passive:true});
  hero.addEventListener('pointerdown', e => { dragging=true; startX=e.clientX; startY=e.clientY; hero.setPointerCapture?.(e.pointerId); });
  hero.addEventListener('pointerup', e => { dragging=false; hero.releasePointerCapture?.(e.pointerId); });
  hero.addEventListener('pointercancel', () => dragging=false);
  hero.addEventListener('pointermove', e => { if(dragging) move3d(e.clientX,e.clientY); }, {passive:true});

  window.addEventListener('deviceorientation', e => {
    if(!motionEnabled || home.classList.contains('hidden')) return;
    const rx = Math.max(-9, Math.min(9, (e.beta || 0) / 6));
    const ry = Math.max(-11, Math.min(11, (e.gamma || 0) / 3));
    hero.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(-4deg)`;
  }, {passive:true});

  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    motionEnabled=false;
    document.body.classList.add('motion-off');
    motionStatus.textContent='Movimiento: reducido';
  }

  renderCategories();
  renderProducts();
})();
