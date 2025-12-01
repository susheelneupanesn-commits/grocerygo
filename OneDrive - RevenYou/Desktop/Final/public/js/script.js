<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script>
  // ------------------- GLOBAL -------------------
  const supabaseUrl = 'https://gikdqaxdqfmzdvolkxbn.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpa2RxYXhkcWZtemR2b2xreGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTQwNDIsImV4cCI6MjA3Nzg3MDA0Mn0.pJ-9KfCxV7YT5loiURW14xRmf72s1EZRFRh4iKGnQis';
  const supabase = supabase.createClient(supabaseUrl, supabaseKey);

  let trolley = JSON.parse(localStorage.getItem('trolley')) || [];

  // ------------------- DOM -------------------
  document.addEventListener('DOMContentLoaded', () => {
    const trolleyBody = document.getElementById('trolleyTable');
    const subtotalEl = document.getElementById('trolleySubtotal');
    const discountEl = document.getElementById('discountAmount');
    const clearBtn = document.getElementById('clearTrolleyBtn');
    const proceedBtn = document.getElementById('proceedCheckoutBtn');
    const continueBtn = document.getElementById('continueShoppingBtn');

    // ------------------- UTILS -------------------
    function saveTrolley() {
      localStorage.setItem('trolley', JSON.stringify(trolley));
    }

    function calculateSubtotal() {
      return trolley.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    }

    // ------------------- FETCH -------------------
    async function fetchTrolleyProducts() {
      if (!trolley.length) return renderTrolley([]);

      const ids = trolley.map(i => i.id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', ids);

      if (error) return console.error('Supabase fetch error:', error);

      const merged = trolley.map(item => {
        const product = data.find(p => p.id === item.id);
        if (!product) return item;

        const variantPrice = item.variantIndex != null && product.variants
          ? product.variants[item.variantIndex]?.price
          : product.price;

        const variantName = item.variantIndex != null && product.variants
          ? product.variants[item.variantIndex]?.name
          : '';

        return {
          ...item,
          name: product.name,
          brand: product.brand,
          image: product.image_url,
          link: `product.html?id=${product.id}`,
          price: variantPrice || product.price || 0,
          variant: variantName
        };
      });

      renderTrolley(merged);
    }
function renderProducts() {
  productGrid.innerHTML = '';
  products.forEach((p, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Variant/pack text
    let variantText = '';
    if (p.variant && p.pack_size) {
      variantText = `<div class="variant-selection">${p.variant} - ${p.pack_size}</div>`;
    } else if (p.variant) {
      variantText = `<div class="variant-selection">${p.variant}</div>`;
    } else if (p.pack_size) {
      variantText = `<div class="variant-selection">${p.pack_size}</div>`;
    }

    // Price fallback
    const price = p.price || 0;

    card.innerHTML = `
      <div class="product-image-container">
        <img src="${p.image_url || 'images/placeholder.png'}" alt="${p.Item}">
      </div>
      <div class="product-info">
        <span class="product-name">${p.Item || 'No Name'}</span>
        <span class="product-brand">${p.brand || 'No Brand'}</span>
        <span class="product-price">$${price.toFixed(2)}</span>
      </div>
      ${variantText}
      <button class="add-to-cart-btn" data-index="${index}">Add to Trolley</button>
    `;

    productGrid.appendChild(card);
  });

// Add to trolley
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.index);
    const product = products[idx];

    const card = btn.closest('.product-card');
    const selectedVariant = card.querySelector('.variant-btn.selected')?.textContent || null;

    // Build the cart item name
    const itemName = `${product.Item} ${selectedVariant ? `(${selectedVariant})` : ''}`;

    // Check if item exists
    const existing = trolley.find(item =>
      item.id === product.id && item.selectedVariant === selectedVariant
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      trolley.push({
        id: product.id,
        name: itemName,      // <-- IMPORTANT
        brand: product.brand, // optional but helpful
        quantity: 1,
        price: product.price,
        selectedVariant
      });
    }

    localStorage.setItem('trolley', JSON.stringify(trolley));
    showToast(`${itemName} added to trolley!`);
    updateTrolleyCount();
  });
});


    // ------------------- RENDER -------------------
    function renderTrolley(items) {
      trolleyBody.innerHTML = '';

      if (!items.length) {
        trolleyBody.innerHTML = `<tr><td colspan="5" class="empty-cart-message">Your cart is empty. <a href="store.html">Start shopping now!</a></td></tr>`;
        subtotalEl.textContent = '$0.00';
        discountEl.textContent = '-$0.00';
        localStorage.setItem('checkoutSubtotal', '0.00'); // ---- added line ----
        return;
      }

      items.forEach((item, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <img src="${item.image || '/images/placeholder.png'}" alt="${item.name}" style="width:50px;height:50px;border-radius:5px;">
            <a href="${item.link}">${item.name}</a>
            ${item.variant ? `<span class="variant-name">(${item.variant})</span>` : ''}
            <span>${item.brand || ''}</span>
          </td>
          <td>$${item.price.toFixed(2)}</td>
          <td>
            <button class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
            ${item.quantity}
            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          </td>
          <td>$${(item.price * item.quantity).toFixed(2)}</td>
          <td><button class="remove-btn" onclick="removeItem(${idx})">Remove</button></td>
        `;
        trolleyBody.appendChild(row);
      });

      subtotalEl.textContent = `$${calculateSubtotal().toFixed(2)}`;
      discountEl.textContent = '-$0.00';

      // ---- added line: save subtotal for checkout ----
      localStorage.setItem('checkoutSubtotal', calculateSubtotal().toFixed(2));
    }

    // ------------------- EVENTS -------------------
    window.changeQty = (idx, delta) => {
      trolley[idx].quantity = Math.max(1, trolley[idx].quantity + delta);
      saveTrolley();
      fetchTrolleyProducts();
    };

    window.removeItem = idx => {
      trolley.splice(idx, 1);
      saveTrolley();
      fetchTrolleyProducts();
    };

    clearBtn.onclick = () => {
      if(confirm('Empty your cart?')) {
        trolley = [];
        saveTrolley();
        fetchTrolleyProducts();
      }
    };

    proceedBtn.onclick = () => {
      if(!trolley.length) return alert('Cart is empty!');
      window.location.href = 'checkout.html';
    };

    continueBtn.onclick = () => {
      window.location.href = 'store.html';
    };
<script>
// supabaseClient is already initialized
async function placeOrder(orderData) {
  const { data, error } = await supabaseClient
    .from('orders')
    .insert([orderData]);

  if (error) {
    console.error("Order failed:", error);
    showToast("Order could not be saved!");
  } else {
    showToast("Order successfully placed!");
  }
}

// Example usage when user clicks “Place Order”
document.getElementById("placeOrderBtn").addEventListener("click", () => {
  const trolley = JSON.parse(localStorage.getItem("grocerygo_trolley")) || [];
  if (!trolley.length) { 
    showToast("Your trolley is empty!"); 
    return; 
  }

  const orderData = {
    items: trolley,
    total: trolley.reduce((sum, item) => sum + item.price*item.quantity, 0),
    created_at: new Date()
    // add customer info if needed: name, email, address
  };

  placeOrder(orderData);
  localStorage.removeItem("grocerygo_trolley"); // clear trolley
  updateTrolleyCount();
});
</script>

    // ------------------- INIT -------------------
    fetchTrolleyProducts();

    // ------------------- ADD TO TROLLEY BUTTONS -------------------
    document.querySelectorAll('.add-to-trolley').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        const variantIndex = btn.dataset.variantIndex ? parseInt(btn.dataset.variantIndex) : null;
        const quantity = btn.dataset.qty ? parseInt(btn.dataset.qty) : 1;

        const existingItem = trolley.find(item => item.id === id && item.variantIndex === variantIndex);
        if (existingItem) {
          existingItem.quantity += quantity;
        } else {
          trolley.push({ id, quantity, variantIndex });
        }

        saveTrolley();
        fetchTrolleyProducts();
        alert('Item added to trolley!');
      });
    });
  });
  <script>
document.addEventListener('DOMContentLoaded', () => {
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const subtotal = localStorage.getItem('checkoutSubtotal');
  subtotalEl.textContent = subtotal ? `$${subtotal}` : '$0.00';
});
  });
</script>
