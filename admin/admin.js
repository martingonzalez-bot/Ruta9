(() => {
  const cfg = window.RUTA9_ADMIN_CONFIG || {accessKey:''};
  let products = JSON.parse(localStorage.getItem('ruta9_products_admin') || 'null') || structuredClone(window.RUTA9_PRODUCTS || []);
  const $=s=>document.querySelector(s);
  const gate=$('#gate'), editor=$('#editor'), list=$('#products');
  $('#unlock').onclick=()=>{ if((cfg.accessKey||'')==='' || $('#key').value===cfg.accessKey){ gate.classList.add('hidden'); editor.classList.remove('hidden'); render(); } else alert('Llave incorrecta'); };
  $('#logout').onclick=()=>{editor.classList.add('hidden');gate.classList.remove('hidden');$('#key').value='';};
  $('#saveLocal').onclick=()=>{localStorage.setItem('ruta9_products_admin',JSON.stringify(products));alert('Guardado en este navegador.');};
  $('#add').onclick=()=>{products.push({code:'NUEVO',name:'Nuevo producto',category:'Burgers',price:0,description:'Descripción'});render();};
  function render(){ $('#count').textContent=`${products.length} productos`; list.innerHTML=''; products.forEach((p,i)=>{const d=document.createElement('div');d.className='product';d.innerHTML=`<div class="grid"><input value="${esc(p.code)}" data-k="code"><input value="${esc(p.name)}" data-k="name"><input type="number" value="${Number(p.price)||0}" data-k="price"><select data-k="category"><option>Burgers</option><option>Snacks</option><option>Papas</option><option>Burger Factory</option><option>Extras</option></select><textarea class="desc" data-k="description">${esc(p.description||'')}</textarea><button class="danger" data-del="${i}">Eliminar</button></div>`; d.querySelector('[data-k=category]').value=p.category; d.querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{p[el.dataset.k]=el.dataset.k==='price'?Number(el.value):el.value;}); d.querySelector('[data-del]').onclick=()=>{products.splice(i,1);render();}; list.appendChild(d);});}
  $('#download').onclick=()=>{const code='window.RUTA9_PRODUCTS = '+JSON.stringify(products,null,2)+';\n'; const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));a.download='data.js';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
  function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
})();