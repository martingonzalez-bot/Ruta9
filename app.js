(() => {
  const rawProducts = window.RUTA9_PRODUCTS || [];
  const STORAGE = {
    products: 'ruta9_products_state_v3',
    cart: 'ruta9_cart_v3',
    points: 'ruta9_y7_points_v3',
    history: 'ruta9_y7_history_v3',
    context: 'ruta9_y7_context_v3',
    promos: 'ruta9_y7_promos_v3'
  };

  const defaultPromos = [
    {id:'ruta9-y7-demo', title:'⭐ RUTA 9 — SIMPLEMENTE ESPECTACULAR', message:'Descubre RUTA 9 en Y7', points:10, restaurant:'RUTA 9', productId:'', active:true, destination:'RUTA 9 en Y7'},
    {id:'ruta9-puntos', title:'🎁 VISITA RUTA 9 EN Y7 Y SUMA PUNTOS', message:'Entra a Y7 desde RUTA 9 y recibe puntos por la visita.', points:10, restaurant:'RUTA 9', productId:'', active:true, destination:'RUTA 9 en Y7'}
  ];

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const loadJSON = (key, fallback) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : clone(fallback); } catch (_) { return clone(fallback); }
  };
  const saveJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  let storedProducts = loadJSON(STORAGE.products, rawProducts);
  let products = rawProducts.map((base) => ({...base, available:true, arEnabled:true, ...((storedProducts||[]).find(x => x.code === base.code) || {})}));
  let cart = loadJSON(STORAGE.cart, []);
  let points = Number(localStorage.getItem(STORAGE.points) || '1240');
  let pointsHistory = loadJSON(STORAGE.history, []);
  let promos = loadJSON(STORAGE.promos, defaultPromos);
  let currentRoute = location.hash || '#home';
  let activeCategory = 'Todo';
  let search = '';
  let selectedProduct = null;
  let arProduct = null;
  let arState = {scale:1, rx:0, ry:0, rz:0, x:0, y:0, exploded:false, camera:false};
  let adminCategory = 'Todo';
  let adminQuery = '';
  let adminArOnly = 'Todo';
  let adminAvailable = 'Todo';
  let y7Message = '';

  const CATEGORIES = ['Todo','Burgers','Snacks','Papas','Burger Factory','Extras'];
  const emojiFor = (p) => p.category === 'Burgers' || p.category === 'Burger Factory' ? '🍔' : p.category === 'Snacks' ? '🍗' : p.category === 'Papas' ? '🍟' : '✨';
  const formatPrice = (n) => '$' + Number(n || 0).toLocaleString('es-CL');
  const esc = (s='') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const productIngredients = (p) => {
    const text = String(p.description || '');
    const clean = text.replace(/\.$/,'').split(/,| y /i).map(x => x.trim()).filter(Boolean);
    return clean.length ? clean.slice(0,7) : [p.category,'Preparación Ruta 9'];
  };
  const categoryCount = (cat) => products.filter(p => p.category === cat).length;

  function productVisual(p, compact=false) {
    const e = emojiFor(p);
    const kind = p.category.toLowerCase().replace(/\s+/g,'-');
    return '<div class="food-visual '+kind+(compact?' compact':'')+'" aria-hidden="true">' +
      (p.category === 'Burgers' || p.category === 'Burger Factory'
        ? '<div class="fv-bun top"></div><div class="fv-lettuce"></div><div class="fv-cheese"></div><div class="fv-patty one"></div><div class="fv-cheese two"></div><div class="fv-patty two"></div><div class="fv-bun bottom"></div>'
        : p.category === 'Papas'
        ? '<div class="fv-fries f1"></div><div class="fv-fries f2"></div><div class="fv-fries f3"></div><div class="fv-fries f4"></div><div class="fv-fries f5"></div><div class="fv-cup"></div>'
        : p.category === 'Bebidas'
        ? '<div class="fv-cup drink"></div><div class="fv-straw"></div>'
        : '<div class="fv-snack one"></div><div class="fv-snack two"></div><div class="fv-snack three"></div><div class="fv-dip"></div>') +
      '<span class="visual-emoji">'+e+'</span></div>';
  }

  function toast(message, tone='normal') {
    const el = document.createElement('div');
    el.className = 'toast '+tone;
    el.textContent = message;
    document.getElementById('toast-root').appendChild(el);
    setTimeout(() => el.classList.add('show'), 20);
    setTimeout(() => { el.classList.remove('show'); setTimeout(()=>el.remove(),220); }, 2600);
  }

  function setRoute(hash) {
    currentRoute = hash;
    if (location.hash !== hash) history.pushState({}, '', hash);
    render();
    window.scrollTo({top:0, behavior:'instant'});
  }

  function readY7Context() {
    try { return JSON.parse(localStorage.getItem(STORAGE.context) || 'null') || {}; } catch(_) { return {}; }
  }

  function saveProducts() {
    saveJSON(STORAGE.products, products);
  }

  function addToCart(code) {
    const p = products.find(x => x.code === code);
    if (!p) return;
    const existing = cart.find(x => x.code === code);
    if (existing) existing.qty += 1;
    else cart.push({code:p.code,name:p.name,price:p.price,qty:1});
    saveJSON(STORAGE.cart, cart);
    toast(p.name+' agregado al carrito','success');
    render();
  }

  function cartTotal() {
    return cart.reduce((sum, x) => sum + Number(x.price)*Number(x.qty), 0);
  }

  function cartCount() { return cart.reduce((sum,x)=>sum+Number(x.qty),0); }

  function removeCart(code) {
    cart = cart.filter(x => x.code !== code);
    saveJSON(STORAGE.cart, cart);
    render();
  }

  function updateQty(code, delta) {
    const line = cart.find(x=>x.code===code);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) cart = cart.filter(x=>x.code !== code);
    saveJSON(STORAGE.cart, cart);
    render();
  }

  function filteredClientProducts() {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      const catOk = activeCategory === 'Todo' || p.category === activeCategory;
      const qOk = !q || (p.code+' '+p.name+' '+p.description+' '+p.category).toLowerCase().includes(q);
      return catOk && qOk && p.available !== false;
    });
  }

  function clientShell(active='menu') {
    return '<header class="topbar">'+
      '<button class="icon-btn" data-route="#home" aria-label="Inicio">←</button>'+
      '<button class="brand-button" data-route="#menu"><span class="brand-mark mini">R9</span><span><strong>RUTA 9</strong><small>Sandwich · Bar · Cocina</small></span></button>'+
      '<div class="top-actions">'+
        '<button class="icon-btn" data-route="#y7" title="Y7">⭐</button>'+
        '<button class="cart-btn" data-cart="open">🛒 <b>'+cartCount()+'</b></button>'+
      '</div></header>';
  }

  function renderHome() {
    return '<section class="screen home-screen">'+
      '<div class="road-strip"></div>'+
      '<div class="home-grid">'+
        '<div class="home-copy">'+
          '<div class="brand-lockup"><div class="brand-mark">R9</div><div><div class="brand-name">RUTA 9</div><div class="brand-sub">Sandwich · Bar · Cocina</div></div></div>'+
          '<p class="eyebrow">MENÚ DIGITAL · REALIDAD AUMENTADA · Y7</p>'+
          '<h1>UNA PARADA.<br><span>MUCHO SABOR.</span></h1>'+
          '<p class="lead">Explora los 57 productos de Ruta 9, visualízalos en una experiencia AR y descubre cómo Y7 puede convertir una visita en puntos y fidelidad.</p>'+
          '<div class="home-actions"><button class="btn btn-primary" data-route="#menu">Ver menú</button><button class="btn btn-ghost" data-route="#y7">Explorar Y7 ⭐</button><button class="btn btn-light" data-route="#admin">Ver demo admin</button></div>'+
          '<div class="home-kpis"><div><strong>57</strong><span>productos</span></div><div><strong>57</strong><span>AR demo</span></div><div><strong>Y7</strong><span>integrado</span></div></div>'+
        '</div>'+
        '<div class="hero-3d-wrap"><div class="hero-shadow"></div><div class="hero-card"><div class="card-face"><span class="card-tag">R9</span><div class="card-route">MENÚ<br><b>3D / AR</b></div><div class="card-line"></div><div class="card-mini">RUTA 9 · EXPERIENCIA DIGITAL</div></div></div><div class="hero-float hero-float-a">57 productos</div><div class="hero-float hero-float-b">+10 puntos en Y7</div></div>'+
      '</div>'+
      '<div class="home-bottom"><span>Demo completa para reunión</span><span>Cliente · Admin · Y7</span></div>'+
    '</section>';
  }

  function categoryButtons() {
    return CATEGORIES.map(c => '<button class="cat-btn '+(activeCategory===c?'active':'')+'" data-category="'+esc(c)+'">'+esc(c)+(c==='Todo'?'':' · '+categoryCount(c))+'</button>').join('');
  }

  function productCard(p) {
    return '<article class="product-card">'+
      '<div class="product-art">'+productVisual(p,true)+'<div class="art-badge">AR</div></div>'+
      '<div class="product-top"><span class="product-code">'+esc(p.code)+'</span>'+(p.favorite?'<span class="favorite">FAVORITO</span>':'')+'</div>'+
      '<span class="product-category">'+esc(p.category)+'</span>'+
      '<h3>'+esc(p.name)+'</h3>'+
      '<p>'+esc(p.description)+'</p>'+
      '<div class="product-bottom"><strong>'+formatPrice(p.price)+'</strong><span class="availability">● '+(p.available!==false?'Disponible':'No disponible')+'</span></div>'+
      '<div class="card-actions"><button class="btn btn-small btn-light" data-product="'+esc(p.code)+'">Ver</button><button class="btn btn-small btn-primary" data-ar="'+esc(p.code)+'">Ver en AR</button></div>'+
    '</article>';
  }

  function renderMenu() {
    const list = filteredClientProducts();
    return '<section class="screen menu-screen">'+clientShell('menu')+
      '<div class="menu-intro"><div><p class="eyebrow">CARTA RUTA 9</p><h2>¿Qué vas a <span>probar?</span></h2><p>Los 57 productos del proyecto, organizados con el mismo catálogo.</p></div><button class="ar-cta" data-ar="B1">Ver una experiencia AR ↗</button></div>'+
      '<div class="y7-banner" data-route="#y7"><div><span class="y7-kicker">Y7 · EXPERIENCIA INTEGRADA</span><strong>'+esc(promos[0]?.title || defaultPromos[0].title)+'</strong><small>'+esc(promos[0]?.message || defaultPromos[0].message)+'</small></div><span class="y7-arrow">ABRIR EN Y7 →</span></div>'+
      '<div class="category-row">'+categoryButtons()+'</div>'+
      '<div class="search-panel"><label>Buscar por código, nombre o ingrediente</label><div class="search-line"><input id="client-search" value="'+esc(search)+'" placeholder="Ej. B12, queso azul, BBQ…"><button id="clear-search" class="clear-btn">×</button></div></div>'+
      '<div class="status-row"><span><b>'+list.length+'</b> de '+products.length+' productos visibles</span><span>● 57/57 con acceso AR demo</span></div>'+
      '<main class="product-grid">'+(list.length?list.map(productCard).join(''):'<div class="empty-state"><strong>No encontramos ese producto.</strong><span>Prueba otro nombre, código o ingrediente.</span></div>')+'</main>'+
      '<div id="client-detail"></div><div id="client-ar"></div><div id="cart-layer"></div></section>';
  }

  function renderDetailModal() {
    if (!selectedProduct) return '';
    const p = selectedProduct;
    const ingredients = productIngredients(p);
    return '<div class="overlay" data-close="detail"><div class="modal-card detail-card">'+
      '<button class="modal-close" data-close="detail">×</button>'+
      '<div class="detail-layout"><div class="detail-visual">'+productVisual(p)+'</div><div class="detail-copy"><span class="product-code big">'+esc(p.code)+'</span><span class="product-category">'+esc(p.category)+'</span><h2>'+esc(p.name)+'</h2><div class="detail-price">'+formatPrice(p.price)+'</div><p>'+esc(p.description)+'</p><div class="ingredient-list">'+ingredients.map(i=>'<span>• '+esc(i)+'</span>').join('')+'</div><div class="detail-meta"><span>● Disponible</span><span>◈ AR listo</span><span>▣ Menú Ruta 9</span></div><div class="detail-actions"><button class="btn btn-primary" data-ar="'+esc(p.code)+'">VER EN AR</button><button class="btn btn-light" data-add="'+esc(p.code)+'">AGREGAR AL CARRITO</button></div></div></div>'+
    '</div></div>';
  }

  function renderARModal() {
    if (!arProduct) return '';
    const p = arProduct;
    const s = arState;
    const contextLabel = p.code + ' · '+p.category;
    return '<div class="overlay"><div class="modal-card ar-card-full">'+
      '<button class="modal-close" data-close="ar">×</button>'+
      '<div class="ar-head"><div><p class="eyebrow">RUTA 9 · REALIDAD AUMENTADA</p><h2>'+esc(p.name)+'</h2><span>'+esc(contextLabel)+'</span></div><div class="ar-live"><i></i> AR DEMO</div></div>'+
      '<div class="ar-stage '+(s.camera?'camera-on':'')+'">'+
        '<div class="ar-grid"></div><div class="scan-corners"></div>'+
        '<div class="ar-label label-a">RUTA 9 · '+esc(p.code)+'</div><div class="ar-label label-b">'+formatPrice(p.price)+'</div>'+
        '<div id="ar-object" class="ar-object" style="transform:translate3d('+s.x+'px,'+s.y+'px,0) scale('+s.scale+') rotateX('+s.rx+'deg) rotateY('+s.ry+'deg) rotateZ('+s.rz+'deg)">'+productVisual(p)+'</div>'+
        '<div class="ar-dim dim-a">Largo · DEMO</div><div class="ar-dim dim-b">Alto · DEMO</div>'+
        (s.camera?'<div class="fake-camera"><span>VISTA DE CÁMARA</span></div>':'')+
      '</div>'+
      '<div class="ar-info"><div><strong>Coloca el producto en tu espacio y míralo antes de pedirlo.</strong><span>Representación visual preparada para reemplazarse por el modelo 3D final de cada producto.</span></div><div class="ar-price">'+formatPrice(p.price)+'</div></div>'+
      '<div class="ar-controls">'+
        '<button data-ar-control="rotate">↻ Rotar</button><button data-ar-control="zoomIn">＋ Aumentar</button><button data-ar-control="zoomOut">− Reducir</button><button data-ar-control="move">↕ Mover</button><button data-ar-control="explode">'+(s.exploded?'▣ Recomponer':'✦ Explorar capas')+'</button><button data-ar-control="camera">'+(s.camera?'▣ Ocultar cámara':'◉ Cámara')+'</button><button class="btn btn-primary" data-add="'+esc(p.code)+'">Agregar al carrito</button></div>'+
      '<p class="ar-note">DEMO PRESENTACIÓN · Las escalas son aproximadas y el asset 3D real puede sustituirse posteriormente sin cambiar la experiencia.</p>'+
    '</div></div>';
  }

  function renderCart() {
    if (!document.getElementById('cart-layer') || window.__cartOpen !== true) return '';
    return '<div class="overlay soft"><div class="modal-card cart-card"><button class="modal-close" data-close="cart">×</button><p class="eyebrow">TU PEDIDO</p><h2>Carrito</h2>'+
      (cart.length?cart.map(line=>'<div class="cart-line"><div><strong>'+esc(line.name)+'</strong><small>'+formatPrice(line.price)+'</small></div><div class="qty"><button data-qty="'+esc(line.code)+'" data-delta="-1">−</button><span>'+line.qty+'</span><button data-qty="'+esc(line.code)+'" data-delta="1">+</button><button class="remove" data-remove="'+esc(line.code)+'">×</button></div></div>').join(''):'<div class="empty-state inline"><strong>Tu carrito está vacío.</strong><span>Agrega un producto para continuar.</span></div>')+
      '<div class="cart-summary"><span>Total</span><strong>'+formatPrice(cartTotal())+'</strong></div>'+
      '<button class="btn btn-primary full">'+(cart.length?'Continuar pedido (demo)':'Seguir explorando')+'</button>'+
    '</div></div>';
  }

  function renderClient() {
    document.getElementById('app').innerHTML =
      currentRoute==='#home' ? renderHome() :
      currentRoute==='#menu' ? renderMenu() :
      currentRoute==='#admin' ? renderAdmin() :
      currentRoute.startsWith('#y7') ? renderY7() :
      renderMenu();

    if (currentRoute==='#menu') {
      if (selectedProduct) document.getElementById('client-detail').innerHTML = renderDetailModal();
      if (arProduct) document.getElementById('client-ar').innerHTML = renderARModal();
      if (window.__cartOpen) document.getElementById('cart-layer').innerHTML = renderCart();
    }
  }

  function renderDashboardStats() {
    return '<div class="stat-grid"><div class="stat-card"><span>PRODUCTOS</span><strong>57</strong><small>Catálogo completo</small></div><div class="stat-card"><span>PRODUCTOS AR</span><strong>57</strong><small>Experiencia preparada</small></div><div class="stat-card"><span>ACTIVOS</span><strong>'+products.filter(p=>p.available!==false).length+'</strong><small>Disponibles hoy</small></div><div class="stat-card"><span>CATEGORÍAS</span><strong>5</strong><small>Sin categorías artificiales</small></div><div class="stat-card accent"><span>PROMOCIONES Y7</span><strong>'+promos.length+'</strong><small>Campañas demo</small></div></div>';
  }

  function adminFiltered() {
    const q=adminQuery.toLowerCase().trim();
    return products.filter(p =>
      (adminCategory==='Todo'||p.category===adminCategory) &&
      (adminArOnly==='Todo'||(adminArOnly==='Sí'&&p.arEnabled!==false)||(adminArOnly==='No'&&p.arEnabled===false)) &&
      (adminAvailable==='Todo'||(adminAvailable==='Activos'&&p.available!==false)||(adminAvailable==='Inactivos'&&p.available===false)) &&
      (!q || (p.code+' '+p.name+' '+p.category).toLowerCase().includes(q))
    );
  }

  function renderAdminTable() {
    const list=adminFiltered();
    return '<div class="table-wrap"><table><thead><tr><th>Imagen</th><th>Producto</th><th>Categoría</th><th>Precio</th><th>AR</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>'+
      list.map(p=>'<tr><td><div class="table-thumb">'+emojiFor(p)+'</div></td><td><strong>'+esc(p.code)+' · '+esc(p.name)+'</strong><small>'+esc(p.description)+'</small></td><td>'+esc(p.category)+'</td><td>'+formatPrice(p.price)+'</td><td><span class="pill '+(p.arEnabled!==false?'ok':'off')+'">'+(p.arEnabled!==false?'ACTIVO':'OFF')+'</span></td><td><span class="pill '+(p.available!==false?'ok':'off')+'">'+(p.available!==false?'ACTIVO':'PAUSADO')+'</span></td><td><button class="mini-action" data-product="'+esc(p.code)+'">Editar</button><button class="mini-action" data-ar="'+esc(p.code)+'">AR</button><button class="mini-action" data-toggle="'+esc(p.code)+'">'+(p.available!==false?'Pausar':'Activar')+'</button></td></tr>').join('')+
      '</tbody></table></div><div class="table-footer"><span>'+list.length+' productos coinciden con los filtros.</span><span>Edición persistida en este navegador.</span></div>';
  }

  function adminEditor() {
    if (!selectedProduct) return '<div class="empty-state">Selecciona un producto para editar.</div>';
    const p=selectedProduct;
    return '<div class="editor-panel"><div class="editor-preview">'+productVisual(p)+'</div><div class="editor-fields">'+
      '<div class="field-grid"><label>ID<input data-edit="code" value="'+esc(p.code)+'" disabled></label><label>Nombre<input data-edit="name" value="'+esc(p.name)+'"></label></div>'+
      '<div class="field-grid"><label>Categoría<select data-edit="category">'+CATEGORIES.filter(x=>x!=='Todo').map(c=>'<option '+(c===p.category?'selected':'')+'>'+c+'</option>').join('')+'</select></label><label>Precio<input type="number" data-edit="price" value="'+Number(p.price||0)+'"></label></div>'+
      '<label>Descripción<textarea data-edit="description">'+esc(p.description||'')+'</textarea></label>'+
      '<div class="field-row"><label class="switch"><input type="checkbox" data-edit="available" '+(p.available!==false?'checked':'')+'> Disponible</label><label class="switch"><input type="checkbox" data-edit="arEnabled" '+(p.arEnabled!==false?'checked':'')+'> AR activo</label></div>'+
      '<div class="editor-actions"><button class="btn btn-primary" id="save-product">GUARDAR</button><button class="btn btn-light" data-ar="'+esc(p.code)+'">PREVISUALIZAR AR</button></div>'+
      '</div></div>';
  }

  function renderPromosAdmin() {
    return '<div class="promo-admin-grid"><div class="promo-list">'+promos.map(pr=>'<div class="promo-row"><div><span class="y7-kicker">'+esc(pr.id)+'</span><strong>'+esc(pr.title)+'</strong><small>'+esc(pr.message)+'</small></div><div class="promo-meta"><span>+'+pr.points+' pts</span><button class="mini-action" data-promo="'+esc(pr.id)+'">Editar</button></div></div>').join('')+
      '<button class="btn btn-light full" id="new-promo">+ Nueva promoción</button></div>'+
      '<div class="y7-admin-preview"><div class="y7-phone"><div class="y7-phone-head"><span>Y7</span><b>1.240 pts</b></div><div class="y7-phone-card"><span>RUTA 9</span><strong>'+esc(promos[0]?.title||'Ruta 9')+'</strong><p>'+esc(promos[0]?.message||'Descubre RUTA 9 en Y7')+'</p><button>ABRIR →</button></div></div></div></div>';
  }

  function renderAdmin() {
    return '<section class="admin-app"><header class="admin-top"><div><span class="admin-kicker">RUTA 9 · ADMIN</span><h1>Centro de control</h1><p>Demo pública de administración. Sin inicio de sesión para la presentación.</p></div><div class="admin-top-actions"><button class="btn btn-light" data-route="#menu">Ver menú</button><button class="btn btn-dark" data-route="#y7">Ver Y7</button></div></header>'+
      '<div class="admin-tabs"><button class="admin-tab active">Dashboard</button><button class="admin-tab" data-admin-section="products">Productos</button><button class="admin-tab" data-admin-section="ar">AR</button><button class="admin-tab" data-admin-section="promos">Y7 / Promociones</button></div>'+
      '<div class="admin-main">'+
        '<div class="admin-section" id="admin-dashboard">'+renderDashboardStats()+'<div class="admin-grid2"><div class="admin-panel"><div class="panel-head"><div><span class="eyebrow">ACTIVIDAD</span><h2>Últimos cambios</h2></div><span class="live-dot">● DEMO</span></div><div class="activity-list"><div>🟠 <div><strong>Producto actualizado</strong><small>El catálogo conserva los datos reales del proyecto.</small></div><time>ahora</time></div><div>🟠 <div><strong>57 productos AR preparados</strong><small>Todos tienen representación visual de demo.</small></div><time>ahora</time></div><div>⭐ <div><strong>Campaña Y7 activa</strong><small>RUTA 9 · puntos por interacción.</small></div><time>ahora</time></div></div></div><div class="admin-panel"><div class="panel-head"><div><span class="eyebrow">DEMO</span><h2>Flujo recomendado</h2></div></div><div class="flow-steps"><span>1 · Menú</span><span>2 · AR</span><span>3 · Carrito</span><span>4 · Y7</span><span>5 · Puntos</span><span>6 · Admin</span></div></div></div></div>'+
        '<div class="admin-section hidden" id="admin-products"><div class="panel-head"><div><span class="eyebrow">CATÁLOGO</span><h2>Productos</h2></div><span class="table-count">57 productos</span></div><div class="filters"><input id="admin-search" value="'+esc(adminQuery)+'" placeholder="Buscar producto…"><select id="admin-cat">'+CATEGORIES.map(c=>'<option '+(c===adminCategory?'selected':'')+'>'+c+'</option>').join('')+'</select><select id="admin-ar"><option>Todo</option><option '+(adminArOnly==='Sí'?'selected':'')+'>Sí</option><option '+(adminArOnly==='No'?'selected':'')+'>No</option></select><select id="admin-av"><option>Todo</option><option '+(adminAvailable==='Activos'?'selected':'')+'>Activos</option><option '+(adminAvailable==='Inactivos'?'selected':'')+'>Inactivos</option></select></div>'+renderAdminTable()+'</div>'+
        '<div class="admin-section hidden" id="admin-ar"><div class="panel-head"><div><span class="eyebrow">EXPERIENCIA</span><h2>Previsualización AR</h2></div><span class="table-count">57 / 57 preparados</span></div>'+adminEditor()+'</div>'+
        '<div class="admin-section hidden" id="admin-promos"><div class="panel-head"><div><span class="eyebrow">Y7</span><h2>Promociones</h2></div><span class="table-count">'+promos.length+' activas</span></div>'+renderPromosAdmin()+'</div>'+
      '</div></section>';
  }

  function renderY7() {
    const ctx=readY7Context();
    const currentPoints=points;
    const history=pointsHistory.slice().reverse().slice(0,8);
    const promo=promos.find(x=>x.id===(ctx.promotionId||promos[0]?.id)) || promos[0];
    return '<section class="y7-app"><header class="y7-top"><button class="icon-btn y7-back" data-route="#menu">←</button><div class="y7-brand"><span>Y7</span><strong>Y7</strong><small>experiencias que suman</small></div><div class="y7-points"><span>Puntos</span><strong>'+currentPoints.toLocaleString('es-CL')+'</strong></div></header>'+
      '<main class="y7-main"><section class="y7-hero"><div><span class="y7-kicker">CONTEXTO DESDE RUTA 9</span><h1>Hola, vienes desde <b>RUTA 9</b>.</h1><p>'+esc(ctx.source?'Y7 recibió el contexto de la campaña '+(ctx.campaignId||'ruta9-y7-demo')+'.':'Explora una demostración de cómo Y7 reconoce la visita y premia la interacción.')+'</p><button class="btn y7-primary" id="y7-back-ruta">↩ VOLVER A RUTA 9</button></div><div class="y7-emblem">Y7<br><span>+</span> PUNTOS</div></section>'+
      '<section class="y7-grid"><div class="y7-panel featured"><div class="panel-head"><div><span class="y7-kicker">RESTAURANTE DETECTADO</span><h2>RUTA 9</h2></div><span class="context-pill">📍 CONTEXTO ACTIVO</span></div><div class="ruta9-context-card"><div class="r9-avatar">R9</div><div><strong>RUTA 9 · Sandwich · Bar · Cocina</strong><span>Estás explorando RUTA 9 desde Y7.</span><small>Campaña: '+esc(ctx.campaignId||promo.id||'ruta9-y7-demo')+'</small></div></div><div class="points-reward"><div><span>Interacción registrada</span><strong>+'+promo.points+' puntos</strong><small>Cada apertura suma en esta demo.</small></div><button class="btn y7-primary" id="claim-points">ABRIR PROMOCIÓN</button></div></div>'+
      '<div class="y7-panel"><div class="panel-head"><div><span class="y7-kicker">HISTORIAL</span><h2>Tus últimos puntos</h2></div></div><div class="history-list">'+(history.length?history.map(h=>'<div><span>+'+h.points+'</span><div><strong>'+esc(h.label)+'</strong><small>'+esc(h.date)+'</small></div></div>').join(''):'<div class="empty-state inline">Aún no hay interacciones.</div>')+'</div></div></section>'+
      '<section class="y7-bottom-grid"><div class="y7-panel"><span class="y7-kicker">EXPLORA</span><h2>Restaurantes</h2><div class="restaurant-mini"><b>R9</b><span>RUTA 9<small>1 campaña activa</small></span><i>›</i></div></div><div class="y7-panel"><span class="y7-kicker">PERFIL</span><h2>Mi actividad</h2><div class="profile-row"><span class="profile-avatar">MG</span><div><strong>Usuario demo</strong><small>'+points.toLocaleString('es-CL')+' puntos acumulados</small></div></div></div></section></main></section>';
  }

  function awardPoints() {
    const ctx=readY7Context();
    const promo=promos.find(x=>x.id===(ctx.promotionId||promos[0]?.id)) || promos[0];
    const amount=Number(promo?.points||10);
    points += amount;
    const record={points:amount,label:'Visitaste RUTA 9 desde Y7',date:new Date().toLocaleString('es-CL',{hour:'2-digit',minute:'2-digit'})};
    pointsHistory.push(record);
    saveJSON(STORAGE.history,pointsHistory);
    localStorage.setItem(STORAGE.points,String(points));
    y7Message='+'+amount+' puntos';
    toast('⭐ '+y7Message+' · Interacción registrada','success');
    render();
  }

  function openY7(promotionId='', productId='') {
    saveJSON(STORAGE.context,{restaurantId:'ruta9',restaurantName:'RUTA 9',promotionId:promotionId||promos[0]?.id||'ruta9-y7-demo',productId,source:'ruta9',campaignId:'ruta9-y7-demo',timestamp:Date.now()});
    setRoute('#y7');
  }

  function bindGlobal() {
    document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>setRoute(b.dataset.route));
    document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{selectedProduct=products.find(p=>p.code===b.dataset.product);render();});
    document.querySelectorAll('[data-ar]').forEach(b=>b.onclick=()=>{arProduct=products.find(p=>p.code===b.dataset.ar);selectedProduct=null;arState={scale:1,rx:0,ry:0,rz:0,x:0,y:0,exploded:false,camera:false};render();});
    document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(b.dataset.close==='detail')selectedProduct=null;if(b.dataset.close==='ar')arProduct=null;if(b.dataset.close==='cart')window.__cartOpen=false;render();});
    document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;render();});
    document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeCart(b.dataset.remove));
    document.querySelectorAll('[data-qty]').forEach(b=>b.onclick=()=>updateQty(b.dataset.qty,Number(b.dataset.delta)));
    document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const p=products.find(x=>x.code===b.dataset.toggle);if(p){p.available=p.available===false;saveProducts();render();toast((p.available?'Activado ':'Pausado ')+p.name);}});
    document.querySelectorAll('[data-admin-section]').forEach(b=>b.onclick=()=>showAdminSection(b.dataset.adminSection));
    const cs=document.getElementById('client-search'); if(cs){cs.oninput=e=>{search=e.target.value;render();document.getElementById('client-search')?.focus();};}
    const cl=document.getElementById('clear-search'); if(cl) cl.onclick=()=>{search='';render();};
    const as=document.getElementById('admin-search'); if(as) as.oninput=e=>{adminQuery=e.target.value; const y=e.target.selectionStart; render(); const n=document.getElementById('admin-search'); n?.focus(); if(n&&y!==null)n.setSelectionRange(y,y);};
    const ac=document.getElementById('admin-cat'); if(ac) ac.onchange=e=>{adminCategory=e.target.value;render();showAdminSection('products');};
    const aa=document.getElementById('admin-ar'); if(aa) aa.onchange=e=>{adminArOnly=e.target.value;render();showAdminSection('products');};
    const av=document.getElementById('admin-av'); if(av) av.onchange=e=>{adminAvailable=e.target.value;render();showAdminSection('products');};
    const save=document.getElementById('save-product'); if(save) save.onclick=saveAdminProduct;
    document.querySelectorAll('[data-promo]').forEach(b=>b.onclick=()=>editPromo(b.dataset.promo));
    const np=document.getElementById('new-promo'); if(np) np.onclick=()=>{promos.push({id:'promo-'+Date.now(),title:'Nueva campaña RUTA 9',message:'Descubre RUTA 9 en Y7',points:10,restaurant:'RUTA 9',productId:'',active:true,destination:'RUTA 9 en Y7'});saveJSON(STORAGE.promos,promos);render();showAdminSection('promos');toast('Nueva promoción creada');};
    const cr=document.getElementById('claim-points'); if(cr) cr.onclick=awardPoints;
    const br=document.getElementById('y7-back-ruta'); if(br) br.onclick=()=>setRoute('#menu');
    const cartBtn=document.querySelector('[data-cart="open"]'); if(cartBtn) cartBtn.onclick=()=>{window.__cartOpen=true;render();};
    document.querySelectorAll('[data-ar-control]').forEach(b=>b.onclick=()=>arControl(b.dataset.arControl));
  }

  function showAdminSection(name) {
    const ids={products:'admin-products',ar:'admin-ar',promos:'admin-promos',dashboard:'admin-dashboard'};
    document.querySelectorAll('.admin-section').forEach(s=>s.classList.add('hidden'));
    document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
    const id=ids[name]||'admin-dashboard'; document.getElementById(id)?.classList.remove('hidden');
    const idx={products:1,ar:2,promos:3,dashboard:0}[name]||0; document.querySelectorAll('.admin-tab')[idx]?.classList.add('active');
  }

  function saveAdminProduct() {
    if(!selectedProduct) return;
    document.querySelectorAll('[data-edit]').forEach(el=>{
      const k=el.dataset.edit;
      selectedProduct[k]=el.type==='checkbox'?el.checked:(k==='price'?Number(el.value):el.value);
    });
    products=products.map(p=>p.code===selectedProduct.code?selectedProduct:p);
    saveProducts(); toast('Producto actualizado','success'); render();showAdminSection('products');
  }

  function editPromo(id) {
    const p=promos.find(x=>x.id===id); if(!p)return;
    const nextTitle=prompt('Título de la promoción:',p.title); if(nextTitle===null)return;
    const nextMessage=prompt('Mensaje:',p.message); if(nextMessage===null)return;
    const nextPoints=prompt('Puntos por apertura:',String(p.points)); if(nextPoints===null)return;
    p.title=nextTitle;p.message=nextMessage;p.points=Number(nextPoints)||10;saveJSON(STORAGE.promos,promos);render();showAdminSection('promos');toast('Promoción actualizada','success');
  }

  function arControl(type) {
    if(type==='rotate') arState.ry=(arState.ry+35)%360;
    if(type==='zoomIn') arState.scale=Math.min(1.55,arState.scale+.15);
    if(type==='zoomOut') arState.scale=Math.max(.65,arState.scale-.15);
    if(type==='move') arState.y=arState.y===0?34:arState.y===34? -28:0;
    if(type==='explode') arState.exploded=!arState.exploded;
    if(type==='camera') arState.camera=!arState.camera;
    const o=document.getElementById('ar-object'); if(o){o.style.transform='translate3d('+arState.x+'px,'+arState.y+'px,0) scale('+arState.scale+') rotateX('+arState.rx+'deg) rotateY('+arState.ry+'deg) rotateZ('+arState.rz+'deg)'; o.classList.toggle('exploded',arState.exploded); }
    if(type==='explode') {document.querySelector('.ar-object')?.classList.toggle('exploded',arState.exploded);}
    render(); if(currentRoute==='#admin') showAdminSection('ar');
  }

  function render() {
    selectedProduct = selectedProduct && products.find(p=>p.code===selectedProduct.code) || selectedProduct;
    arProduct = arProduct && products.find(p=>p.code===arProduct.code) || arProduct;
    renderClient();
    bindGlobal();
    if(currentRoute==='#admin') showAdminSection(window.__adminSection||'dashboard');
  }

  window.addEventListener('hashchange',()=>{currentRoute=location.hash||'#home';selectedProduct=null;arProduct=null;window.__cartOpen=false;render();});
  window.addEventListener('popstate',()=>{currentRoute=location.hash||'#home';render();});
  window.__cartOpen=false;
  render();
})();