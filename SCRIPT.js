/* script.js for GroceryGo demo */
/* CONFIG */
const SURVEY_DELAY_MS = 30 * 1000; // demo: 30 seconds. Set to 30*60*1000 for 30 minutes in production
const FREE_DELIVERY_THRESHOLD = 50.00;

/* PRODUCTS (Nepali/South Asian style) */
const PRODUCTS = [
  {id:1,category:'Rice & Grains',name:'Tilda Basmati',brand:'Tilda',options:[{size:'1 kg',price:6.50},{size:'5 kg',price:25.99},{size:'10 kg',price:48.99}],img:'https://images.unsplash.com/photo-1604908177520-4df2d1bb43f1?q=80&w=800&auto=format&fit=crop'},
  {id:2,category:'Rice & Grains',name:"SunRice Jasmine",brand:'SunRice',options:[{size:'1 kg',price:5.50},{size:'5 kg',price:24.49}],img:'https://images.unsplash.com/photo-1617196032031-9c2e9394eb1c?q=80&w=800&auto=format&fit=crop'},
  {id:3,category:'Rice & Grains',name:"Patanjali Raw Rice",brand:'Patanjali',options:[{size:'2 kg',price:12.99},{size:'5 kg',price:29.99}],img:'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=800&auto=format&fit=crop'},
  {id:4,category:'Rice & Grains',name:"Uncle Ben's Brown Rice",brand:"Uncle Ben's",options:[{size:'1 kg',price:7.99},{size:'2 kg',price:14.99}],img:'https://images.unsplash.com/photo-1617196032101-3a6b1c3f1c2e?q=80&w=800&auto=format&fit=crop'},
  {id:5,category:'Rice & Grains',name:'Quinoa',brand:"Bob's Red Mill",options:[{size:'500 g',price:8.99},{size:'1 kg',price:14.99}],img:'https://images.unsplash.com/photo-1593777823550-c58f4b2d3f3b?q=80&w=800&auto=format&fit=crop'},

  {id:6,category:'Flour & Baking',name:'Patanjali Atta (Whole Wheat)',brand:'Patanjali',options:[{size:'1 kg',price:3.29},{size:'5 kg',price:14.99}],img:'https://images.unsplash.com/photo-1621998233650-0b8b73c8f1b0?q=80&w=800&auto=format&fit=crop'},
  {id:7,category:'Flour & Baking',name:"White Wings All-Purpose",brand:'White Wings',options:[{size:'1 kg',price:3.99},{size:'2 kg',price:6.49}],img:'https://images.unsplash.com/photo-1621998233650-0b8b73c8f1b0?q=80&w=800&auto=format&fit=crop'},
  {id:8,category:'Flour & Baking',name:'Maida (Refined Flour)',brand:'Annapurna',options:[{size:'1 kg',price:3.99}],img:'https://images.unsplash.com/photo-1601494185125-c5b5d7b7c5f4?q=80&w=800&auto=format&fit=crop'},
  {id:9,category:'Flour & Baking',name:'Cornflour',brand:"Nature's Best",options:[{size:'500 g',price:5.49}],img:'https://images.unsplash.com/photo-1602526213889-7b2f1d5a1b1a?q=80&w=800&auto=format&fit=crop'},

  {id:10,category:'Pulses & Legumes',name:'Red Lentils',brand:'Annapurna',options:[{size:'500 g',price:3.99},{size:'1 kg',price:7.49}],img:'https://images.unsplash.com/photo-1621998233558-93a0f3f2c0f1?q=80&w=800&auto=format&fit=crop'},
  {id:11,category:'Pulses & Legumes',name:'Chickpeas',brand:'Annapurna',options:[{size:'500 g',price:3.49},{size:'1 kg',price:6.99}],img:'https://images.unsplash.com/photo-1621998233540-5a5b7d1f3b0c?q=80&w=800&auto=format&fit=crop'},
  {id:12,category:'Pulses & Legumes',name:'Kidney Beans',brand:'Fortune',options:[{size:'500 g',price:4.99},{size:'1 kg',price:8.99}],img:'https://images.unsplash.com/photo-1602526213870-8a1b7d2b3c4d?q=80&w=800&auto=format&fit=crop'},
  {id:13,category:'Pulses & Legumes',name:'Mung Beans',brand:'Fortune',options:[{size:'500 g',price:4.49},{size:'1 kg',price:9.49}],img:'https://images.unsplash.com/photo-1617196032120-3e1f1c2d4f1b?q=80&w=800&auto=format&fit=crop'},

  {id:14,category:'Oils & Fats',name:'Fortune Mustard Oil',brand:'Fortune',options:[{size:'500 ml',price:5.99},{size:'1 L',price:9.99}],img:'https://images.unsplash.com/photo-1602526213868-9ec06ec5441f?q=80&w=800&auto=format&fit=crop'},
  {id:15,category:'Oils & Fats',name:'Bertolli Olive Oil',brand:'Bertolli',options:[{size:'500 ml',price:15.99},{size:'1 L',price:29.99}],img:'https://images.unsplash.com/photo-1602526213950-9a8d8e5a3c2f?q=80&w=800&auto=format&fit=crop'},
  {id:16,category:'Oils & Fats',name:'Coconut Oil',brand:'CocoPure',options:[{size:'500 ml',price:12.99}],img:'https://images.unsplash.com/photo-1602526213925-9a8d8e5a3c2f?q=80&w=800&auto=format&fit=crop'},
  {id:17,category:'Oils & Fats',name:'Sunflower Oil',brand:'Mazola',options:[{size:'1 L',price:10.49}],img:'https://images.unsplash.com/photo-1602526213899-9d5e8d2f3b2e?q=80&w=800&auto=format&fit=crop'},

  {id:18,category:'Snacks & Biscuits',name:"Haldiram's Aloo Bhujia",brand:"Haldiram's",options:[{size:'150 g',price:3.99},{size:'400 g',price:8.50}],img:'https://images.unsplash.com/photo-1542444459-db0c7f5d30a9?q=80&w=800&auto=format&fit=crop'},
  {id:19,category:'Snacks & Biscuits',name:'Tim Tam Chocolate Biscuits',brand:'Tim Tam',options:[{size:'200 g',price:4.49}],img:'https://images.unsplash.com/photo-1602497905280-c6e0f0b7a17b?q=80&w=800&auto=format&fit=crop'},
  {id:20,category:'Snacks & Biscuits',name:"Lays Potato Chips",brand:"Lays",options:[{size:'100 g',price:2.49}],img:'https://images.unsplash.com/photo-1606828887650-356ddbb7c0d7?q=80&w=800&auto=format&fit=crop'},
  {id:21,category:'Snacks & Biscuits',name:'Oat Cookies',brand:'Healthy Bites',options:[{size:'200 g',price:4.49}],img:'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800&auto=format&fit=crop'},

  {id:22,category:'Beverages',name:'Tata Tea Premium',brand:'Tata',options:[{size:'250 g',price:6.99},{size:'1 kg',price:24.99}],img:'https://images.unsplash.com/photo-1562158070-5b2f6e3a6f86?q=80&w=800&auto=format&fit=crop'},
  {id:23,category:'Beverages',name:'Nescafé Classic',brand:'Nescafe',options:[{size:'100 g',price:5.99},{size:'200 g',price:10.99}],img:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop'},
  {id:24,category:'Beverages',name:'Ceres Orange Juice',brand:'Ceres',options:[{size:'1 L',price:5.99}],img:'https://images.unsplash.com/photo-1617196032093-9b7f2e0d0f3e?q=80&w=800&auto=format&fit=crop'},
  {id:25,category:'Beverages',name:'Mount Franklin Water',brand:'Mount Franklin',options:[{size:'600 ml',price:1.50},{size:'1.5 L',price:2.50}],img:'https://images.unsplash.com/photo-1582719478250-3f6c2a5aa5a0?q=80&w=800&auto=format&fit=crop'},

  {id:26,category:'Dairy & Eggs',name:'Amul Milk Full Cream',brand:'Amul',options:[{size:'1 L',price:2.49},{size:'2 L',price:4.49}],img:'https://images.unsplash.com/photo-1602526213990-9c8d8e5a3c2f?q=80&w=800&auto=format&fit=crop'},
  {id:27,category:'Dairy & Eggs',name:'Amul Butter',brand:'Amul',options:[{size:'200 g',price:5.99}],img:'https://images.unsplash.com/photo-1526178612131-c8e2f8b0c9f4?q=80&w=800&auto=format&fit=crop'},
  {id:28,category:'Dairy & Eggs',name:'Farm Fresh Eggs',brand:'Farm Fresh',options:[{size:'6 pcs',price:3.99},{size:'12 pcs',price:6.99}],img:'https://images.unsplash.com/photo-1602526214020-9c8d8e5a3b5c?q=80&w=800&auto=format&fit=crop'},

  {id:29,category:'Condiments & Spices',name:'MDH Turmeric Powder',brand:'MDH',options:[{size:'100 g',price:4.49}],img:'https://images.unsplash.com/photo-1602526214050-9c8d8e5a3b8f?q=80&w=800&auto=format&fit=crop'},
  {id:30,category:'Condiments & Spices',name:'Everest Black Pepper',brand:'Everest',options:[{size:'50 g',price:5.49}],img:'https://images.unsplash.com/photo-1602526214060-9c8d8e5a3b9a?q=80&w=800&auto=format&fit=crop'},
  {id:31,category:'Condiments & Spices',name:'Heinz Tomato Ketchup',brand:'Heinz',options:[{size:'500 ml',price:3.99}],img:'https://images.unsplash.com/photo-1602526214070-9c8d8e5a3b9b?q=80&w=800&auto=format&fit=crop'},
  {id:32,category:'Condiments & Spices',name:'Kikkoman Soy Sauce',brand:'Kikkoman',options:[{size:'250 ml',price:4.99}],img:'https://images.unsplash.com/photo-1602526214080-9c8d8e5a3b9c?q=80&w=800&auto=format&fit=crop'},
  {id:33,category:'Condiments & Spices',name:'Haldiram’s Chutney',brand:'Haldiram’s',options:[{size:'200 g',price:4.49}],img:'https://images.unsplash.com/photo-1541534401786-55e3f6d0be4a?q=80&w=800&auto=format&fit=crop'},

  {id:34,category:'Household',name:'Tide Detergent',brand:'Tide',options:[{size:'1 kg',price:6.99}],img:'https://images.unsplash.com/photo-1581579182242-28e3a0b62b49?q=80&w=800&auto=format&fit=crop'},
  {id:35,category:'Household',name:'Dawn Dishwash Liquid',brand:'Dawn',options:[{size:'500 ml',price:3.99}],img:'https://images.unsplash.com/photo-1581579182242-28e3a0b62b49?q=80&w=800&auto=format&fit=crop'},

  {id:36,category:'Baby Care',name:'Pampers Baby Wipes',brand:'Pampers',options:[{size:'72 pcs',price:4.99}],img:'https://images.unsplash.com/photo-1583947582888-5a9b1d3a6d6b?q=80&w=800&auto=format&fit=crop'},

  {id:37,category:'Snacks & Biscuits',name:"Haldiram's Bhujia 2",brand:"Haldiram's",options:[{size:'200 g',price:5.99}],img:'https://images.unsplash.com/photo-1542444459-db0c7f5d30a9?q=80&w=800&auto=format&fit=crop'},
  {id:38,category:'Beverages',name:'Masala Chai (loose)',brand:'Local',options:[{size:'250 g',price:4.99}],img:'https://images.unsplash.com/photo-1562158070-5b2f6e3a6f86?q=80&w=800&auto=format&fit=crop'},
  {id:39,category:'Rice & Grains',name:'Millet (Bajra)',brand:'Local',options:[{size:'500 g',price:4.99}],img:'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=800&auto=format&fit=crop'},
  {id:40,category:'Flour & Baking',name:'Baking Powder',brand:'Royal',options:[{size:'200 g',price:3.49}],img:'https://images.unsplash.com/photo-1512446819494-3b69b6f0b3d8?q=80&w=800&auto=format&fit=crop'},
  {id:41,category:'Pulses & Legumes',name:'Black Eyed Beans',brand:'Local',options:[{size:'500 g',price:4.29}],img:'https://images.unsplash.com/photo-1547394765-6f7a2cc2d1a7?q=80&w=800&auto=format&fit=crop'},
  {id:42,category:'Oils & Fats',name:'Avocado Oil',brand:'Chosen Foods',options:[{size:'250 ml',price:9.99}],img:'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop'},
  {id:43,category:'Snacks & Biscuits',name:'Rice Crackers',brand:'Kameda',options:[{size:'120 g',price:3.99}],img:'https://images.unsplash.com/photo-1541542684-2ff8b5f1d0f8?q=80&w=800&auto=format&fit=crop'},
  {id:44,category:'Beverages',name:'Nespresso Capsules',brand:'Nespresso',options:[{size:'10 pcs',price:6.99}],img:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop'},
  {id:45,category:'Dairy & Eggs',name:'Philadelphia Cream Cheese',brand:'Philadelphia',options:[{size:'200 g',price:4.99}],img:'https://images.unsplash.com/photo-1526178612131-c8e2f8b0c9f4?q=80&w=800&auto=format&fit=crop'},
  {id:46,category:'Rice & Grains',name:'Organic Oats',brand:'Quaker',options:[{size:'500 g',price:4.99},{size:'1 kg',price:8.99}],img:'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800&auto=format&fit=crop'},
  {id:47,category:'Household',name:'Kitchen Towels',brand:'Bounty',options:[{size:'Roll',price:2.99}],img:'https://images.unsplash.com/photo-1581579182242-28e3a0b62b49?q=80&w=800&auto=format&fit=crop'},
  {id:48,category:'Condiments & Spices',name:'Sriracha Sauce',brand:'Huy Fong',options:[{size:'200 ml',price:4.99}],img:'https://images.unsplash.com/photo-1542444459-db0c7f5d30a9?q=80&w=800&auto=format&fit=crop'},
  {id:49,category:'Pulses & Legumes',name:'Split Peas',brand:'Local',options:[{size:'1 kg',price:7.49}],img:'https://images.unsplash.com/photo-1511689660979-3e3b7b5c5f4b?q=80&w=800&auto=format&fit=crop'},
  {id:50,category:'Snacks & Biscuits',name:'Oat Energy Bars',brand:'Nature',options:[{size:'4 pack',price:6.49}],img:'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop'},
  {id:51,category:'Beverages',name:'Sparkling Mineral Water',brand:'Perrier',options:[{size:'330 ml',price:2.00}],img:'https://images.unsplash.com/photo-1532634896-26909d0d67d7?q=80&w=800&auto=format&fit=crop'},
  {id:52,category:'Baby Care',name:'Johnson Baby Oil',brand:'Johnson',options:[{size:'200 ml',price:5.49}],img:'https://images.unsplash.com/photo-1583947582888-5a9b1d3a6d6b?q=80&w=800&auto=format&fit=crop'}
];

/* APP STATE */
let cart = []; // {prodId, optIndex, qty}
let currentOrder = null;
let selectedRating = 5;

/* UTIL */
const money = (n) => n.toFixed(2);
const findProduct = (id) => PRODUCTS.find(p => p.id === id);
const calcItemsTotal = () => cart.reduce((s, it) => s + findProduct(it.prodId).options[it.optIndex].price * it.qty, 0);

/* RENDER */
function renderProducts(){
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const cat = (document.getElementById('categoryFilter')?.value || '');
  const grid = document.getElementById('productsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  const filtered = PRODUCTS.filter(p => {
    if(cat && p.category !== cat) return false;
    if(!q) return true;
    return (p.name + ' ' + p.brand + ' ' + p.category).toLowerCase().includes(q);
  });
  filtered.forEach(p => {
    const card = document.createElement('div'); card.className = 'product-card';
    const opts = p.options.map((o,ix) => `<option value="${ix}">${o.size} — $${money(o.price)}</option>`).join('');
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div style="font-weight:700">${p.name}</div>
      <div class="product-meta">${p.brand} • <span class="small">${p.category}</span></div>
      <select id="opt-${p.id}">${opts}</select>
      <div class="product-actions">
        <button onclick="addToCart(${p.id})">Add to Cart</button>
        <button onclick="quickView(${p.id})" style="background:#eee;color:#222;border:none;padding:8px;border-radius:6px">View</button>
      </div>
    `;
    grid.appendChild(card);
  });
  updateCartUI();
}

/* QUICK VIEW */
function quickView(id){
  const p = findProduct(id);
  const body = document.getElementById('receiptBody');
  if(!body) return;
  document.getElementById('receiptOrderId').innerText = `${p.name} — ${p.brand}`;
  body.innerHTML = `
    <div style="display:flex;gap:12px">
      <img src="${p.img}" style="width:140px;height:120px;object-fit:cover;border-radius:8px">
      <div>
        <div style="font-weight:700">${p.name}</div>
        <div class="small muted">${p.brand} • ${p.category}</div>
        <div style="margin-top:8px">${p.options.map(o=>`<div class="small">${o.size} — $${money(o.price)}</div>`).join('')}</div>
        <div style="margin-top:8px"><button class="btn-primary" onclick="addToCart(${p.id});closeReceipt()">Add to cart</button></div>
      </div>
    </div>
  `;
  openReceiptModal();
}

/* CART */
function addToCart(prodId){
  const sel = document.getElementById(`opt-${prodId}`);
  const optIndex = sel ? parseInt(sel.value,10) : 0;
  const existing = cart.find(c => c.prodId === prodId && c.optIndex === optIndex);
  if(existing) existing.qty++;
  else cart.push({prodId, optIndex, qty:1});
  showToast('Added to cart');
  renderProducts(); updateCartUI();
}
function changeQty(prodId,optIndex,delta){
  const item = cart.find(c => c.prodId===prodId && c.optIndex===optIndex);
  if(!item) return;
  item.qty += delta;
  if(item.qty < 1) cart = cart.filter(c=>!(c.prodId===prodId && c.optIndex===optIndex));
  updateCartUI();
}
function clearCart(){ cart=[]; updateCartUI(); showToast('Cart cleared'); }
function updateCartUI(){
  const list = document.getElementById('cartList'); if(!list) return;
  list.innerHTML = '';
  cart.forEach(it=>{
    const p = findProduct(it.prodId); const opt = p.options[it.optIndex];
    const div = document.createElement('div'); div.className = 'cart-item';
    div.innerHTML = `<div><strong>${p.name}</strong><div class="small">${opt.size} • ${p.brand}</div></div>
      <div style="text-align:right"><div><button onclick="changeQty(${it.prodId},${it.optIndex},-1)">-</button> ${it.qty} <button onclick="changeQty(${it.prodId},${it.optIndex},1)">+</button></div><div style="margin-top:6px">$${money(opt.price*it.qty)}</div></div>`;
    list.appendChild(div);
  });
  document.getElementById('itemsTotal').innerText = '$' + money(calcItemsTotal());
  recalculateDelivery();
  document.getElementById('checkoutBtn').disabled = cart.length===0;
}

/* DELIVERY */
function recalculateDelivery(){
  const pc = (document.getElementById('custPostcode')?.value || '').trim();
  let fee = 0; const itemsTotal = calcItemsTotal();
  if(itemsTotal >= FREE_DELIVERY_THRESHOLD) fee = 0;
  else if(!pc) fee = 0;
  else {
    const firstDigit = parseInt(pc[0]||'0',10);
    if(firstDigit <= 3) fee = 5;
    else if(firstDigit <= 6) fee = 10;
    else fee = 15;
  }
  document.getElementById('deliveryFee').innerText = '$' + money(fee);
  document.getElementById('grandTotal').innerText = '$' + money(itemsTotal + fee);
  return fee;
}

/* CHECKOUT */
function beginCheckout(){
  document.getElementById('checkoutPanel').classList.remove('hidden');
  document.getElementById('modalOverlay')?.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
function closeCheckout(){
  document.getElementById('checkoutPanel').classList.add('hidden');
  document.getElementById('modalOverlay')?.classList.add('hidden');
}

/* PAYMENT */
function validateCard(num, expiry, cvv){
  const digits = num.replace(/\s+/g,'');
  if(!/^\d{16}$/.test(digits)) return 'Card must be 16 digits';
  if(!/^\d{2}\/\d{2}$/.test(expiry)) return 'Expiry must be MM/YY';
  const [m] = expiry.split('/').map(Number);
  if(m < 1 || m > 12) return 'Expiry month invalid';
  if(!/^\d{3}$/.test(cvv)) return 'CVV must be 3 digits';
  return null;
}
function maskCard(num){ const d = num.replace(/\s+/g,''); return '**** **** **** ' + d.slice(-4); }

function processPayment(){
  const contact = (document.getElementById('custContact').value||'').trim();
  const address = (document.getElementById('custAddress').value||'').trim();
  const suburb = (document.getElementById('custSuburb').value||'').trim();
  const postcode = (document.getElementById('custPostcode').value||'').trim();
  if(!contact || !address || !suburb || !postcode){ showModalNotice('Please complete delivery fields'); return; }

  const cardNum = (document.getElementById('cardNumber').value||'').trim();
  const expiry = (document.getElementById('cardExpiry').value||'').trim();
  const cvv = (document.getElementById('cardCvv').value||'').trim();
  const err = validateCard(cardNum, expiry, cvv);
  if(err){ showModalNotice(err); return; }

  showModalNotice('Processing payment...');
  disableUI(true);

  setTimeout(()=>{
    disableUI(false); showModalNotice('');
    const itemsTotal = calcItemsTotal(); const deliveryFee = recalculateDelivery(); const grand = itemsTotal + deliveryFee;
    const orderId = 'GG' + Date.now().toString().slice(-8);
    currentOrder = {
      id: orderId, date: new Date().toLocaleString(),
      contact, address, suburb, postcode,
      receiptPref: document.getElementById('receiptPref').value,
      items: cart.map(c=>{
        const prod = findProduct(c.prodId); const opt = prod.options[c.optIndex];
        return {name: prod.name, brand: prod.brand, size: opt.size, unitPrice: opt.price, qty: c.qty, subtotal: opt.price * c.qty};
      }),
      itemsTotal, deliveryFee, grand,
      payment: {method:'Card', masked: maskCard(cardNum), expiry}
    };
    cart = []; updateCartUI(); closeCheckout(); showReceipt(currentOrder);
    notifySequence(currentOrder.id);
    simulateDeliveryAndSurvey(currentOrder.id);
  }, 1200);
}

function disableUI(flag){
  document.querySelectorAll('button,input,select').forEach(el=>el.disabled = flag);
}
function showModalNotice(txt){ document.getElementById('modalNotice').innerText = txt; }

/* RECEIPT */
function openReceiptModal(){ document.getElementById('modalOverlay').classList.remove('hidden'); document.getElementById('receiptModal').classList.remove('hidden'); }
function closeReceipt(){ document.getElementById('modalOverlay').classList.add('hidden'); document.getElementById('receiptModal').classList.add('hidden'); }

function showReceipt(order){
  document.getElementById('receiptOrderId').innerText = `Order: ${order.id} • ${order.date}`;
  const body = document.getElementById('receiptBody');
  body.innerHTML = `
    <div class="row"><div><strong>Customer:</strong> ${order.contact}</div><div class="small muted">${order.receiptPref.toUpperCase()}</div></div>
    <div class="small muted">${order.address}, ${order.suburb} ${order.postcode}</div><hr>
    <div><strong>Items</strong></div>
    ${order.items.map(it=>`<div style="display:flex;justify-content:space-between;padding:6px 0"><div>${it.name} • ${it.size} (${it.brand}) x${it.qty}</div><div>$${money(it.subtotal)}</div></div>`).join('')}
    <hr>
    <div style="display:flex;justify-content:space-between"><div>Items total</div><div>$${money(order.itemsTotal)}</div></div>
    <div style="display:flex;justify-content:space-between"><div>Delivery fee</div><div>$${money(order.deliveryFee)}</div></div>
    <div style="display:flex;justify-content:space-between;font-weight:800"><div>Grand total</div><div>$${money(order.grand)}</div></div>
    <div style="margin-top:8px" class="small">Payment: ${order.payment.method} (${order.payment.masked})</div>
  `;
  openReceiptModal();
}

/* Simulated send (client-demo). Swap with fetch to your serverless/sendReceipt endpoint in production. */
function simulateSend(mode){
  if(!currentOrder) { alert('No order to send'); return; }
  const dest = currentOrder.contact;
  alert(`Simulated: sending receipt to ${dest} via ${mode.toUpperCase()}. Preview is shown on-screen.`);
  console.log('Simulated send', {mode,dest,order:currentOrder});
}

/* DOWNLOAD */
function downloadReceipt(){
  if(!currentOrder) return alert('No order');
  let txt = `GroceryGo Receipt\nOrder: ${currentOrder.id}\nDate: ${currentOrder.date}\n\nItems:\n`;
  currentOrder.items.forEach(it => txt += `${it.name} ${it.size} x${it.qty} — $${money(it.subtotal)}\n`);
  txt += `\nItems total: $${money(currentOrder.itemsTotal)}\nDelivery: $${money(currentOrder.deliveryFee)}\nGrand total: $${money(currentOrder.grand)}\nPayment: ${currentOrder.payment.masked}\n`;
  const blob = new Blob([txt],{type:'text/plain'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `receipt_${currentOrder.id}.txt`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* NOTIFICATIONS */
function showToast(msg){
  const t = document.createElement('div'); t.className='toast'; t.style= 'position:fixed;left:20px;bottom:20px;background:var(--primary);color:#fff;padding:10px;border-radius:8px;opacity:0;transition:opacity 300ms';
  t.innerText = msg; document.body.appendChild(t);
  requestAnimationFrame(()=> t.style.opacity = '1');
  setTimeout(()=>{ t.style.opacity = '0'; setTimeout(()=>t.remove(),300); },3000);
}

/* Notification lifecycle */
function notifySequence(orderId){
  showToast('Order placed — ' + orderId);
  console.log(`Order ${orderId} placed`);
  setTimeout(()=>{ showToast('Order packed'); console.log(`Order ${orderId} packed`); }, 2000);
  setTimeout(()=>{ showToast('Out for delivery'); console.log(`Order ${orderId} out for delivery`); }, 4000);
  setTimeout(()=>{ showToast('Arriving in ~30 minutes'); console.log(`Order ${orderId} 30 mins away`); }, 6000);
  setTimeout(()=>{ showToast('Order delivered'); console.log(`Order ${orderId} delivered`); }, 9000);
}

/* Delivery & survey scheduling */
function simulateDeliveryAndSurvey(orderId){
  console.log('Scheduling survey for', orderId);
  setTimeout(()=>{ openSurvey(); }, SURVEY_DELAY_MS);
}

/* SURVEY */
function openSurvey(){ document.getElementById('surveyOverlay').classList.remove('hidden'); document.getElementById('surveyBox').classList.remove('hidden'); updateStars(selectedRating); }
function hideSurvey(){ document.getElementById('surveyOverlay').classList.add('hidden'); document.getElementById('surveyBox').classList.add('hidden'); }
function setRating(n){ selectedRating = n; updateStars(n); }
function updateStars(n){ document.querySelectorAll('#starRow .star').forEach((el,ix)=> el.innerText = ix < n ? '★' : '☆'); }
document.addEventListener('change', (e)=>{ if(e.target && e.target.id === 'surveyReason'){ document.getElementById('surveyCustom').style.display = e.target.value === 'Other' ? 'block' : 'none'; }});
function submitSurvey(){
  const reason = document.getElementById('surveyReason').value;
  const custom = document.getElementById('surveyCustom').value || '';
  const payload = {orderId: currentOrder?.id || null, rating:selectedRating, reason: reason==='Other'?custom:reason, date: new Date().toISOString()};
  const stored = JSON.parse(localStorage.getItem('grocerygo_feedback') || '[]'); stored.push(payload); localStorage.setItem('grocerygo_feedback', JSON.stringify(stored));
  console.log('Survey submitted', payload); alert('Thanks for your feedback!'); hideSurvey();
}

/* HELPERS */
function init(){
  renderProducts(); updateCartUI(); updateStarsUI();
}
function updateStarsUI(){ updateStars(selectedRating); }
function updateStars(n){ document.querySelectorAll('#starRow .star').forEach((el,ix)=> el.innerText = ix < n ? '★' : '☆'); }

init();
