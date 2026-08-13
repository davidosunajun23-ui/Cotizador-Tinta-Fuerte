(() => {
  const $ = s => document.querySelector(s);
  const fmt = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

  let items = [], kind = 'garment';
  const modal = $('#modal');
  const client = { id: 'client', name: 'Prenda del cliente' };

  const product = id => TF_PRODUCTS.garments.find(p => p.id === id) || TF_PRODUCTS.caps.find(p => p.id === id) || client;
  const qty = i => i.sizes ? Object.values(i.sizes).reduce((a, n) => a + (+n || 0), 0) : +i.quantity;
  const at = (rs, n) => (rs.find(r => n >= r[0] && n <= r[1]) || rs.at(-1))[2];

  function products() {
    let xs = kind === 'garment' ? TF_PRODUCTS.garments : kind === 'cap' ? TF_PRODUCTS.caps : [client];
    $('#product').innerHTML = xs.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  }

  function updateServices() {
    let p = product($('#product').value);
    if (kind === 'dtf' || p.premium) $('#service').innerHTML = '<option value="dtf">DTF</option>';
    else if (kind === 'client-embroidery' || kind === 'punch') $('#service').innerHTML = '<option value="embroidery">Bordado</option>';
    else if (kind === 'cap') $('#service').innerHTML = '<option value="embroidery">Bordado frontal</option><option value="dtf">DTF</option>';
    else $('#service').innerHTML = '<option value="dtf">DTF</option><option value="embroidery">Bordado</option>';
  }

  function fields() {
    let p = product($('#product').value);
    let s = $('#service').value || 'dtf';

    let modalOptions = s === 'dtf' ? Object.keys(TF_PRICING.dtf) : ['Bordado frontal'];
    $('#modality').innerHTML = modalOptions.map(x => `<option value="${x}">${x}</option>`).join('');

    let onlyPunch = kind === 'punch';
    let normal = kind === 'garment' && !p.premium;

    $('#product').parentElement.hidden = onlyPunch;
    $('#quantity').parentElement.hidden = onlyPunch;
    $('#sizeSwitch').hidden = !normal;
    $('#sizes').hidden = !normal || !$('#sizesOn').checked;
    $('#serviceLabel').hidden = kind === 'dtf' || kind === 'client-embroidery' || onlyPunch;
    $('#modality').parentElement.hidden = onlyPunch;
    $('#extraLabel').hidden = s !== 'embroidery' || onlyPunch;
    $('#punchLabel').hidden = s !== 'embroidery' && !onlyPunch;
  }

  function open(k) {
    kind = k;
    $('#modalTitle').textContent = k === 'punch' ? 'Agregar solo ponchado' : k === 'dtf' ? 'Agregar solo DTF' : k === 'client-embroidery' ? 'Agregar solo bordado' : k === 'cap' ? 'Agregar gorra' : 'Agregar prenda / camisa';
    $('#quantity').value = 1;
    $('#sizesOn').checked = false;
    $('#regular').value = $('#two').value = $('#three').value = 0;
    $('#extra').value = 0;
    $('#punches').value = k === 'punch' ? 1 : 0;
    products();
    updateServices();
    fields();
    modal.showModal();
  }

  function groups() {
    let g = {};
    items.filter(i => i.kind !== 'punch').forEach(i => {
      let p = product(i.productId), key, table, label;
      if (i.kind === 'cap') {
        key = 'cap-' + i.service;
        table = TF_PRICING.capService;
        label = i.service === 'dtf' ? 'Gorras DTF' : 'Gorras bordado';
      } else if (i.kind === 'garment' && p.premium) {
        key = 'premium-' + i.modality;
        table = TF_PRICING.premium[i.modality];
        label = 'Premium ' + i.modality;
      } else if (i.service === 'dtf') {
        key = 'dtf-' + i.modality;
        table = TF_PRICING.dtf[i.modality];
        label = 'DTF ' + i.modality;
      } else {
        key = 'embroidery';
        table = TF_PRICING.embroidery;
        label = 'Bordado';
      }
      i.key = key;
      if (!g[key]) g[key] = { qty: 0, table, label };
      g[key].qty += qty(i);
    });
    Object.values(g).forEach(x => x.unit = at(x.table, x.qty));
    return g;
  }

  function calc(i, g) {
    if (i.kind === 'punch') {
      let total = i.punches * TF_PRICING.general.punchFee;
      return { b: 0, total, punch: total, unit: 0, serviceUnit: 0, garmentUnit: 0, extraUnit: 0, extraTotal: 0 };
    }
    let n = qty(i), p = product(i.productId);
    let serviceUnit = g[i.key].unit + (p.premium ? p.adjust || 0 : 0);
    let b = i.kind === 'dtf' || i.kind === 'client-embroidery' ? 0 : (i.kind === 'cap' ? n * (n >= TF_PRICING.general.capWholesaleFrom ? p.wholesale : p.retail) : (p.premium ? 0 : (i.sizes ? Object.entries(i.sizes).reduce((s, [z, c]) => s + (p.prices[z] || 0) * c, 0) : (p.prices['S–XL'] || 0) * n)));
    let extra = i.extra * n, punch = i.punches * TF_PRICING.general.punchFee;
    let total = b + serviceUnit * n + extra + punch;
    let garmentUnit = n > 0 ? b / n : 0;
    
    return { b, total, punch, unit: (b + serviceUnit * n + extra) / n, serviceUnit, garmentUnit, extraUnit: i.extra, extraTotal: extra };
  }

  function render() {
    let g = groups(), total = 0, pieces = 0, bases = 0;
    $('#items').innerHTML = items.map((i, index) => {
      let c = calc(i, g), n = qty(i);
      total += c.total;
      pieces += i.kind === 'punch' ? 0 : n;
      bases += c.b;

      if (i.kind === 'punch') {
        return `<article class="item" style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0">Solo Ponchado / Digitalización</h3>
            <strong style="font-size:1.2rem; color:var(--red);">${fmt(c.total)}</strong>
          </div>
          <div style="background:#f5f6f7; padding:12px; border-radius:8px; font-size:0.85rem;">
             <strong>🧵 Ponchados nuevos:</strong> ${i.punches} pieza(s) a ${fmt(TF_PRICING.general.punchFee)} c/u
          </div>
          <div style="text-align:right;"><button data-delete="${index}" class="delete" style="margin:0;">Eliminar</button></div>
        </article>`;
      }

      let isClient = (i.kind === 'dtf' || i.kind === 'client-embroidery');
      let serviceName = i.service === 'dtf' ? 'DTF' : 'Bordado';

      return `<article class="item" style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:start;">
          <h3 style="margin:0; font-size:1.1rem;">${product(i.productId).name} <span style="font-weight:normal; color:#687681; font-size:0.9rem;">(${n} pzas)</span></h3>
          <div style="text-align:right;">
            <strong style="font-size:1.3rem; color:var(--red);">${fmt(c.total)}</strong>
          </div>
        </div>

        <div style="background:#f5f6f7; padding:12px; border-radius:8px; display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem;">
          ${isClient ? '' : `<div>
            <strong style="color:var(--ink);">👕 Prenda:</strong> ${fmt(c.garmentUnit)} c/u
            <br><small style="color:#687681">Subtotal: ${fmt(c.b)}</small>
          </div>`}
          
          <div>
            <strong style="color:var(--ink);">🎨 ${serviceName} (${i.modality}):</strong> ${fmt(c.serviceUnit)} c/u
            <br><small style="color:#687681">Tarifa por volumen: rango de ${g[i.key].qty} pzas</small>
          </div>

          ${i.extra ? `<div>
            <strong style="color:var(--ink);">➕ Servicio Extra:</strong> ${fmt(c.extraUnit)} c/u
            <br><small style="color:#687681">Subtotal: ${fmt(c.extraTotal)}</small>
          </div>` : ''}

          ${i.punches ? `<div>
            <strong style="color:var(--ink);">🧵 Ponchado Nuevo:</strong> ${i.punches}x ${fmt(TF_PRICING.general.punchFee)}
            <br><small style="color:#687681">Cargo único extra: ${fmt(c.punch)}</small>
          </div>` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
           <span style="font-size:0.9rem; font-weight:600; color:#17212b;">Promedio: ${fmt(c.unit)} c/u <small style="font-weight:normal; color:#687681;">${c.punch ? '(no incluye cargo fijo de ponchado)' : ''}</small></span>
           <button data-delete="${index}" class="delete" style="margin:0; padding:6px 12px; font-weight:600;">Eliminar</button>
        </div>
      </article>`;
    }).join('');

    $('#empty').hidden = !!items.length;
    $('#total').textContent = $('#sideTotal').textContent = fmt(total);
    $('#pieces').textContent = pieces;
    $('#groups').textContent = Object.keys(g).length;
    $('#garmentTotal').textContent = fmt(bases);
    
    $('#groupList').innerHTML = Object.values(g).map(x => `
      <div style="background:#fff; border:1px solid #e3e7ea; margin:8px 0; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:500; font-size:0.85rem;">${x.label}</span> 
        <b style="color:var(--red); font-size:1rem;">${x.qty} <small style="color:#687681; font-size:0.75rem;">x</small> ${fmt(x.unit)}</b>
      </div>
    `).join('');
  }

  document.querySelectorAll('.actions button').forEach(b => b.onclick = () => open(b.dataset.kind));
  $('#add').onclick = () => open('garment');
  $('#product').onchange = () => { updateServices(); fields(); };
  $('#service').onchange = fields;
  $('#sizesOn').onchange = fields;

  $('#form').onsubmit = e => {
    e.preventDefault();
    let i = { kind, productId: $('#product').value, quantity: +$('#quantity').value || 1, sizes: $('#sizesOn').checked ? { 'S–XL': +$('#regular').value || 0, '2XL': +$('#two').value || 0, '3XL': +$('#three').value || 0 } : null, service: $('#service').value, modality: $('#modality').value, extra: +$('#extra').value || 0, punches: +$('#punches').value || 0 };
    if (kind === 'punch') {
      if (!i.punches) return alert('Captura al menos un ponchado.');
    } else if (!qty(i)) return alert('Captura al menos una pieza.');
    items.push(i);
    modal.close();
    render();
  };

  $('#items').onclick = e => {
    if (e.target.dataset.delete !== undefined) {
      items.splice(+e.target.dataset.delete, 1);
      render();
    }
  };

  render();
})();
