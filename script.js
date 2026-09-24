const API_URL = 'https://tgafurniture-backend.vercel.app/api';

function checkAuthAndOpenCart(event) {
  if (event) event.preventDefault();
  
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    alert("Please Log/Register first!");
    if (typeof openAuthModal === 'function') {
      openAuthModal();
    }
  } else {
    window.location.href = "cart.html"; 
  }
}

// Cart Buttons setup
document.addEventListener("DOMContentLoaded", () => {
  const cartButtons = document.querySelectorAll(".cart-btn");
  cartButtons.forEach(btn => {
    btn.addEventListener("click", checkAuthAndOpenCart);
  });
});

// HELPER FUNCTIONS FOR CART & LOCALSTORAGE
function getCart() {
  const cartData = localStorage.getItem("cartItems");
  try {
    const parsed = cartData ? JSON.parse(cartData) : [];
    return Array.isArray(parsed) ? parsed.filter(item => item !== null && item !== undefined) : [];
  } catch (e) {
    console.error("Error parsing cart data", e);
    return [];
  }
}

function saveCart(cartList) {
  localStorage.setItem("cartItems", JSON.stringify(cartList));
  localStorage.setItem("cart", JSON.stringify(cartList));
  updateCartBadge();
}

function updateCartBadge() {
  const cartList = getCart();
  const totalCount = cartList.reduce((total, item) => total + (Number(item.quantity || item.qty) || 0), 0);
  const cartBadges = document.querySelectorAll(".cart-badge");
  cartBadges.forEach(badge => {
    badge.textContent = totalCount;
  });
}

function addToCart(product) {
  let cart = getCart();
  const rawPrice = product.price !== undefined ? product.price : 0;
  const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice).replace(/[^0-9.]/g, "")) || 0;

  const itemTitle = (typeof product.name === 'string' && product.name.trim() !== "") ? product.name : "Furniture Item";
  const existingIndex = cart.findIndex(item => item.name === itemTitle || (product._id && item._id === product._id));

  if (existingIndex > -1) {
    cart[existingIndex].quantity = (Number(cart[existingIndex].quantity || cart[existingIndex].qty) || 1) + 1;
    cart[existingIndex].qty = cart[existingIndex].quantity;
  } else {
    cart.push({
      _id: product._id || Date.now().toString(),
      name: itemTitle,
      price: price,
      imageUrl: product.imageUrl || product.image || "https://via.placeholder.com/150",
      category: product.category || "Furniture",
      quantity: 1,
      qty: 1
    });
  }

  saveCart(cart);
}

window.addToCart = addToCart;

// DOM CONTENT LOADED
document.addEventListener("DOMContentLoaded", () => {
  updateUserUI();
  updateCartBadge();
  loadAnnouncements();
  fetchAndRenderProducts(); 

  const cartContainer = document.getElementById('cart-items-list');
  if (cartContainer) {
    renderCartPage();
  }

  const checkoutContainer = document.getElementById('checkout-items-list');
  if (checkoutContainer) {
    renderCheckoutSummary();
  }

  const menuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    });
  }
});

async function fetchAndRenderProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) return;

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) return;

    const sections = ['bedroom-sec', 'living-sec', 'dining-sec', 'office-sec', 'decor-sec'];
    sections.forEach(secId => {
      const secEl = document.getElementById(secId);
      if (secEl) {
        const grid = secEl.querySelector('.furniture-item-grid');
        if (grid) grid.innerHTML = '';
      }
    });

    products.forEach(product => {
      const category = (product.category || '').toLowerCase();
      let targetSecId = 'living-sec';

      if (category.includes('bed') || category.includes('room')) targetSecId = 'bedroom-sec';
      else if (category.includes('liv') || category.includes('sofa') || category.includes('chair')) targetSecId = 'living-sec';
      else if (category.includes('din') || category.includes('table')) targetSecId = 'dining-sec';
      else if (category.includes('off') || category.includes('desk')) targetSecId = 'office-sec';
      else if (category.includes('dec') || category.includes('decor')) targetSecId = 'decor-sec';

      const secElement = document.getElementById(targetSecId);
      if (secElement) {
        const grid = secElement.querySelector('.furniture-item-grid');
        if (grid) {
          const displayPrice = product.discountPrice ? product.discountPrice : product.price;
          const oldPriceHTML = product.discountPrice 
            ? `<span class="price-strike" style="text-decoration:line-through; color:#888; font-size:0.85rem; margin-right:5px;">LKR ${Number(product.price).toLocaleString()}</span>` 
            : '';

          let displayImage = 'https://via.placeholder.com/150';
          
          if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim() !== '') {
            displayImage = product.imageUrl.trim();
          } else if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
            displayImage = product.images[0].trim();
          }

          if (typeof displayImage === 'string') {
            displayImage = displayImage.replace(/\\/g, '/');
          }

          if (displayImage && !displayImage.startsWith('http://') && !displayImage.startsWith('https://') && !displayImage.startsWith('data:image')) {
            try {
              const baseUrl = API_URL.replace(/\/api\/?$/, '');
              displayImage = new URL(displayImage, baseUrl).href;
            } catch (err) {
              console.error("Error constructing image URL:", err);
              displayImage = 'https://via.placeholder.com/150';
            }
          }

          const card = document.createElement('div');
          card.className = 'furniture-card';
          card.setAttribute('data-category', category);

          card.innerHTML = `
            <img src="${displayImage}" alt="${product.name}" onerror="this.onerror=null;this.src='https://via.placeholder.com/150';">
            <div class="furniture-card-info">
              <h4>${product.name}</h4>
              <p>Category: ${product.category || 'General'}</p>
              <div class="price-container">
                ${oldPriceHTML}
                <span class="price">LKR ${Number(displayPrice).toLocaleString()}</span>
              </div>
              <button class="btn add-to-cart-btn" 
                      data-id="${product._id}" 
                      data-name="${product.name}" 
                      data-price="${displayPrice}" 
                      data-image="${displayImage}"
                      data-category="${product.category}">
                <i class="fa-solid fa-cart-shopping"></i> Add to Cart
              </button>
            </div>
          `;

          card.addEventListener('click', (e) => {
            if (!e.target.closest('.add-to-cart-btn')) {
              openProductModal(product);
            }
          });

          grid.appendChild(card);
        }
      }
    });
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function renderCartItems() {
  const drawerList = document.getElementById("cartItemsList");
  const subtotalEl = document.getElementById("cartSubtotal");
  const discountEl = document.getElementById("cartDiscount");
  const totalEl = document.getElementById("cartTotal");

  if (!drawerList) return;

  const cart = getCart();

  if (!cart || cart.length === 0) {
    drawerList.innerHTML = `
      <div style="text-align:center; padding: 2rem 1rem;">
        <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.5rem;"></i>
        <p style="color: #64748b; font-size: 0.95rem;">Your cart is empty.</p>
      </div>`;
    if (subtotalEl) subtotalEl.innerText = "LKR 0.00";
    if (discountEl) discountEl.innerText = "- LKR 0.00";
    if (totalEl) totalEl.innerText = "LKR 0.00";
    return;
  }

  let subtotal = 0;

  drawerList.innerHTML = cart.map((item, index) => {
    const qty = Number(item.quantity || item.qty || 1);
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' 
                  ? rawPrice 
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const itemTotal = price * qty;
    subtotal += itemTotal;

    const itemImg = item.imageUrl || item.image || "https://via.placeholder.com/60";
    const itemName = item.name || item.title || "Furniture Item";

    return `
      <div class="cart-drawer-item" style="display:flex; align-items:center; justify-content:space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
        <div style="display:flex; align-items:center; gap: 10px;">
          <img src="${itemImg}" alt="${itemName}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
          <div>
            <h5 style="margin:0; font-size: 0.9rem; color: #1e293b;">${itemName}</h5>
            <span style="font-size: 0.8rem; color: #64748b;">LKR ${price.toLocaleString('en-US', {minimumFractionDigits: 2})} x ${qty}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap: 8px;">
          <span style="font-weight: bold; font-size: 0.85rem; color: #0f172a;">
            LKR ${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}
          </span>
          <button type="button" onclick="window.removeCartItem(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size: 0.9rem;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  const discount = subtotal * 0.10;
  const total = subtotal - discount;

  if (subtotalEl) subtotalEl.innerText = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (discountEl) discountEl.innerText = `- LKR ${discount.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (totalEl) totalEl.innerText = `LKR ${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

window.renderCartItems = renderCartItems;

let currentProductImages = [];
let currentImageIndex = 0;
let currentSelectedProduct = null;

function openProductModal(product) {
  currentSelectedProduct = product;
  
  let rawImages = [];

  if (product.imageUrl && typeof product.imageUrl === 'string' && product.imageUrl.trim() !== '') {
    rawImages.push(product.imageUrl.trim());
  }

  if (Array.isArray(product.images) && product.images.length > 0) {
    product.images.forEach(img => {
      if (img && typeof img === 'string' && img.trim() !== '') {
        rawImages.push(img.trim());
      }
    });
  }

  if (Array.isArray(product.imageUrls) && product.imageUrls.length > 0) {
    product.imageUrls.forEach(url => {
      if (url && typeof url === 'string' && url.trim() !== '') {
        rawImages.push(url.trim());
      }
    });
  }

  rawImages = [...new Set(rawImages)];

  if (rawImages.length === 0) {
    rawImages = ['https://via.placeholder.com/300'];
  }

  currentProductImages = rawImages.map(img => {
    if (!img) return 'https://via.placeholder.com/300';
    
    let cleanImg = img.replace(/\\/g, '/');

    if (!cleanImg.startsWith('http://') && !cleanImg.startsWith('https://') && !cleanImg.startsWith('data:image')) {
      const baseUrl = API_URL.replace(/\/api\/?$/, '');
      const cleanPath = cleanImg.startsWith('/') ? cleanImg : `/${cleanImg}`;
      return `${baseUrl}${cleanPath}`;
    }
    return cleanImg;
  });
    
  currentImageIndex = 0;

  document.getElementById('modalTitle').textContent = product.name;
  document.getElementById('modalCategory').textContent = product.category || 'General';
  document.getElementById('modalDescription').textContent = product.description || 'No description available.';
  
  const mainPrice = product.discountPrice || product.price;
  document.getElementById('modalDiscountPrice').textContent = `LKR ${Number(mainPrice).toLocaleString()}`;
  
  const oldPriceEl = document.getElementById('modalOriginalPrice');
  if (product.discountPrice) {
    oldPriceEl.textContent = `LKR ${Number(product.price).toLocaleString()}`;
 OldPriceEl.style.display = 'inline';
  } else {
    oldPriceEl.style.display = 'none';
  }

  document.getElementById('modalQty').value = 1;

  updateGalleryImage();
  renderThumbnails();

  document.getElementById('productDetailModal').classList.remove('hidden');
}

function changeImage(direction) {
  currentImageIndex += direction;
  if (currentImageIndex < 0) {
    currentImageIndex = currentProductImages.length - 1;
  } else if (currentImageIndex >= currentProductImages.length) {
    currentImageIndex = 0;
  }
  updateGalleryImage();
}

function updateGalleryImage() {
  document.getElementById('modalMainImg').src = currentProductImages[currentImageIndex];
  
  const thumbs = document.querySelectorAll('.thumbnail-list img');
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle('active-thumb', index === currentImageIndex);
  });
}

function renderThumbnails() {
  const thumbContainer = document.getElementById('modalThumbnails');
  thumbContainer.innerHTML = '';

  currentProductImages.forEach((imgUrl, index) => {
    const img = document.createElement('img');
    img.src = imgUrl;
    if (index === currentImageIndex) img.classList.add('active-thumb');
    img.onclick = () => {
      currentImageIndex = index;
      updateGalleryImage();
    };
    thumbContainer.appendChild(img);
  });
}

function closeProductModal() {
  document.getElementById('productDetailModal').classList.add('hidden');
}

function updateQty(delta) {
  const qtyInput = document.getElementById('modalQty');
  let val = parseInt(qtyInput.value) + delta;
  if (val < 1) val = 1;
  qtyInput.value = val;
}

function addToCartFromModal() {
  try {
    const qtyInput = document.getElementById('modalQty');
    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
    
    if (typeof currentSelectedProduct !== 'undefined' && currentSelectedProduct) {
      const mainPrice = currentSelectedProduct.discountPrice || currentSelectedProduct.price || 0;
      const rawPrice = typeof mainPrice === 'number' ? mainPrice : parseFloat(String(mainPrice).replace(/[^0-9.]/g, "")) || 0;

      let cart = typeof getCart === 'function' ? getCart() : [];
      if (!Array.isArray(cart)) cart = [];

      const itemTitle = (typeof currentSelectedProduct.name === 'string' && currentSelectedProduct.name.trim() !== "") 
                        ? currentSelectedProduct.name 
                        : "Furniture Item";

      const existingIndex = cart.findIndex(item => item.name === itemTitle || (currentSelectedProduct._id && item._id === currentSelectedProduct._id));

      if (existingIndex > -1) {
        const currentQty = Number(cart[existingIndex].quantity || cart[existingIndex].qty) || 0;
        cart[existingIndex].quantity = currentQty + qty;
        cart[existingIndex].qty = cart[existingIndex].quantity;
      } else {
        cart.push({
          _id: currentSelectedProduct._id || Date.now().toString(),
          name: itemTitle,
          price: rawPrice,
          imageUrl: currentSelectedProduct.imageUrl || (currentSelectedProduct.images && currentSelectedProduct.images[0]) || "",
          category: currentSelectedProduct.category || "Furniture",
          quantity: qty,
          qty: qty
        });
      }

      if (typeof saveCart === 'function') {
        saveCart(cart);
      }
      if (typeof closeProductModal === 'function') {
        closeProductModal();
      }
    }
  } catch (error) {
    console.error("Cart error:", error);
  }
}

// USER ACCOUNT & MODAL HANDLERS
const userIcon = document.querySelector(".account-btn") || document.querySelector(".fa-user")?.closest("button, a");
if (userIcon) {
  userIcon.addEventListener("click", (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      if (confirm(`Logged in as ${user.name || 'User'}. Do you want to logout?`)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        location.reload();
      }
    } else {
      openAuthModal();
    }
  });
}

const cartIconBtn = document.querySelector(".header-actions .cart-btn");
if (cartIconBtn) {
  cartIconBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "cart.html";
  });
}

const drawerIconBtn = document.querySelector(".header-actions .drawer-cart-btn");
if (drawerIconBtn) {
  drawerIconBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openCartDrawer();
  });
}

const authModal = document.getElementById("authModal");
if (authModal) {
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) closeAuthModal();
  });
}

const forgotModal = document.getElementById("forgotPasswordModal");
if (forgotModal) {
  forgotModal.addEventListener("click", (e) => {
    if (e.target === forgotModal) closeForgotPasswordModal();
  });
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("active");
    modal.classList.remove("hidden");
    modal.style.display = "flex";
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("active");
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const otpForm = document.getElementById('otpForm');
  const loginTab = document.getElementById('loginTabBtn');
  const regTab = document.getElementById('registerTabBtn');

  if (otpForm) otpForm.style.display = 'none';

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (loginTab) loginTab.classList.add('active');
    if (regTab) regTab.classList.remove('active');
  } else {
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
    if (regTab) regTab.classList.add('active');
    if (loginTab) loginTab.classList.remove('active');
  }
}

function showForgotPasswordModal() {
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.classList.add('hidden');
    authModal.style.display = 'none';
  }
  
  const forgotModal = document.getElementById('forgotPasswordModal');
  if (forgotModal) {
    forgotModal.classList.remove('hidden');
    forgotModal.classList.add('active');
    forgotModal.style.display = 'flex';

    document.getElementById('stepSendOtp')?.classList.remove('hidden');
    document.getElementById('stepVerifyOtp')?.classList.add('hidden');
    
    if (document.getElementById('resetEmailInput')) document.getElementById('resetEmailInput').value = '';
    if (document.getElementById('otpCodeInput')) document.getElementById('otpCodeInput').value = '';
    if (document.getElementById('resetNewPasswordInput')) document.getElementById('resetNewPasswordInput').value = '';
  }
}

function closeForgotPasswordModal() {
  const forgotModal = document.getElementById('forgotPasswordModal');
  if (forgotModal) {
    forgotModal.classList.add('hidden');
    forgotModal.classList.remove('active');
    forgotModal.style.display = 'none';
  }
  const emailInput = document.getElementById('resetEmailInput');
  const otpInput = document.getElementById('otpCodeInput');
  const passInput = document.getElementById('resetNewPasswordInput');
  
  if (emailInput) emailInput.value = '';
  if (otpInput) otpInput.value = '';
  if (passInput) passInput.value = '';
}

async function sendResetOTP() {
  const emailInput = document.getElementById('resetEmailInput');
  const email = emailInput?.value.trim().toLowerCase();
  
  if (!email) {
    alert("Please enter your registered email address!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert(data.message || "OTP code sent to your email!");
      document.getElementById('stepSendOtp')?.classList.add('hidden');
      document.getElementById('stepVerifyOtp')?.classList.remove('hidden');
    } else {
      alert("Error: " + (data.message || "Failed to send OTP"));
    }
  } catch (err) {
    alert("Connection Error: " + err.message);
  }
}

async function verifyOTPAndResetPassword() {
  const email = document.getElementById('resetEmailInput')?.value.trim().toLowerCase();
  const otp = document.getElementById('otpCodeInput')?.value.trim();
  const newPassword = document.getElementById('resetNewPasswordInput')?.value.trim();

  if (!otp || !newPassword) {
    alert("Please enter both the OTP code and your new password!");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/users/reset-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || "Password updated successfully!");
      closeForgotPasswordModal();
      openAuthModal();
      switchAuthTab("login");
    } else {
      alert("Error: " + (data.message || "Invalid OTP code"));
    }
  } catch (err) {
    alert("Connection Error: " + err.message);
  }
}

async function handleLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim().toLowerCase();
  const password = document.getElementById("loginPassword")?.value.trim();

  if (!email || !password) {
    alert("Please enter both email and password!");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Login Successful!");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      closeAuthModal();
      location.reload();
    } else {
      alert(data.message || "Invalid credentials");
    }
  } catch (error) {
    console.error("Login failed:", error);
    alert("Connection Error. Please check if backend server is running.");
  }
}

async function handleRegister(event) {
  if (event) event.preventDefault();

  const name = document.getElementById("regName")?.value.trim();
  const email = document.getElementById("regEmail")?.value.trim().toLowerCase();
  const password = document.getElementById("regPassword")?.value.trim();

  try {
    const response = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Registration successful!");

      const regForm = document.getElementById("registerForm");
      const otpForm = document.getElementById("otpForm");
      const authTabs = document.getElementById("authTabs");

      if (regForm) regForm.style.display = "none";
      if (authTabs) authTabs.style.display = "none";
      if (otpForm) otpForm.style.display = "block";

      const otpEmailInput = document.getElementById("otpEmail");
      if (otpEmailInput) otpEmailInput.value = email;
    } else {
      alert("Error: " + (data.message || "Registration failed"));
    }
  } catch (error) {
    console.error("Registration failed:", error);
    alert("Connection Error. Please check if backend server is running.");
  }
}

async function handleVerifyOTP(event) {
  if (event) event.preventDefault();

  const email = document.getElementById("otpEmail")?.value.trim().toLowerCase();
  const otp = document.getElementById("otpInput")?.value.trim();

  try {
    const response = await fetch(`${API_URL}/users/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(data.message || "Verification successful!");
      switchAuthTab("login");
    } else {
      alert("Error: " + (data.message || "Verification failed"));
    }
  } catch (error) {
    console.error("OTP Verification failed:", error);
    alert("Connection Error. Please check if backend server is running.");
  }
}

function updateUserUI() {
  const user = JSON.parse(localStorage.getItem("user"));
  const accountBtn = document.querySelector(".account-btn") || document.querySelector(".fa-user")?.closest("button, a");

  if (user && accountBtn) {
    const firstName = user.name ? user.name.split(' ')[0] : "Account";
    accountBtn.innerHTML = `<i class="fa-solid fa-user-check" style="color: #10b981;"></i> <span style="font-size: 0.85rem; margin-left: 4px;">${firstName}</span>`;
    accountBtn.title = `Logged in as ${user.name || 'User'} (Click to Logout)`;
  }
}

function openCartDrawer() {
  if (typeof renderCartItems === 'function') renderCartItems();
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.style.display = "flex";
    setTimeout(() => drawer.classList.add("active"), 10);
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (drawer) {
    drawer.classList.remove("active");
    setTimeout(() => {
      drawer.style.display = "none";
    }, 300);
  }
}

// CART PAGE & ACTIONS
function renderCartPage() {
  const container = document.getElementById('cart-items-list');
  const cartCountEl = document.getElementById('cart-total-count');
  const cart = getCart();

  if (!container) return;

  if (!cart || cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem 1rem;">
        <i class="fa-solid fa-basket-shopping" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
        <p style="color: #64748b; font-size: 1.1rem; font-weight: 600;">Your cart is empty.</p>
      </div>`;
    if (cartCountEl) cartCountEl.innerText = '0';
    updateCartTotals();
    return;
  }

  let totalQty = 0;

  container.innerHTML = cart.map((item, index) => {
    const qty = Number(item.quantity || item.qty || 1);
    totalQty += qty;

    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' 
                  ? rawPrice 
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
                  
    const itemImg = item.imageUrl || item.image || item.img || "https://via.placeholder.com/60";
    const itemName = item.name || item.title || "Furniture Item";

    return `
      <div class="cart-item">
        <div style="display:flex; align-items:center; gap: 15px;">
          <img src="${itemImg}" alt="${itemName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
          <div>
            <h4 style="margin: 0; font-size: 1rem; color: #1e293b;">${itemName}</h4>
            <p style="margin: 4px 0 0; color: #64748b; font-size: 0.9rem;">LKR ${price.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap: 15px;">
          <div style="display:flex; align-items:center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff;">
            <button type="button" onclick="window.updateItemQuantity(${index}, -1)" style="padding: 4px 10px; border:none; background: #f1f5f9; cursor:pointer; font-weight:bold;">-</button>
            <span style="padding: 4px 12px; font-weight: 600; min-width: 20px; text-align: center;">${qty}</span>
            <button type="button" onclick="window.updateItemQuantity(${index}, 1)" style="padding: 4px 10px; border:none; background: #f1f5f9; cursor:pointer; font-weight:bold;">+</button>
          </div>
          
          <span style="font-weight: bold; min-width: 100px; text-align: right; color: #0f172a;">
            LKR ${(price * qty).toLocaleString('en-US', {minimumFractionDigits: 2})}
          </span>
          
          <button type="button" onclick="window.removeCartItem(${index})" style="padding: 6px 10px; border:none; background:#ef4444; color:#fff; border-radius: 6px; cursor:pointer;" title="Remove Item">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (cartCountEl) cartCountEl.innerText = totalQty;
  updateCartTotals();
}

function updateItemQuantity(index, delta) {
  let cartList = getCart();
  if (cartList[index]) {
    const currentQty = Number(cartList[index].quantity || cartList[index].qty || 1);
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      cartList.splice(index, 1);
    } else {
      cartList[index].quantity = newQty;
      cartList[index].qty = newQty;
    }

    saveCart(cartList);
    renderCartPage();
    renderCartItems();
  }
}

function removeCartItem(index) {
  let cartList = getCart();
  cartList.splice(index, 1);
  saveCart(cartList);
  renderCartPage();
  if (typeof renderCartItems === 'function') renderCartItems();
}

window.updateItemQuantity = updateItemQuantity;
window.removeCartItem = removeCartItem;
window.removeItem = removeCartItem;
window.changeQuantity = updateItemQuantity;
window.removeFromCart = removeCartItem;
window.renderCartItems = renderCartItems;
window.addToCart = addToCart;

function updateCartTotals() {
  const cartList = getCart();
  let subtotal = 0;
  let totalQty = 0;

  cartList.forEach(item => {
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' 
                  ? rawPrice 
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    
    subtotal += price * qty;
    totalQty += qty;
  });

  const summaryQty = document.getElementById('summary-qty');
  const subtotalEl = document.getElementById('subtotal-amount');
  const totalEl = document.getElementById('total-amount');

  if (summaryQty) summaryQty.innerText = totalQty;
  if (subtotalEl) subtotalEl.innerText = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (totalEl) totalEl.innerText = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
}

function toggleCheckoutDelivery(isDelivery) {
  localStorage.setItem('isDeliveryChecked', JSON.stringify(isDelivery));
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const checkoutListContainer = document.getElementById('checkout-items-list');
  const checkoutSubtotal = document.getElementById('checkout-subtotal');
  const checkoutDelivery = document.getElementById('checkout-delivery');
  const checkoutTotal = document.getElementById('checkout-total');

  const cart = getCart(); 
  if (!cart || cart.length === 0) return;

  const storedDelivery = JSON.parse(localStorage.getItem('isDeliveryChecked'));
  const isDeliveryChecked = storedDelivery !== null ? storedDelivery : true;

  const chkDelivery = document.getElementById('chk-delivery');
  const chkPickup = document.getElementById('chk-pickup');
  if (chkDelivery && chkPickup) {
    chkDelivery.checked = isDeliveryChecked;
    chkPickup.checked = !isDeliveryChecked;
  }

  const deliveryFee = isDeliveryChecked ? 2500 : 0;
  let subtotal = 0;
  if (checkoutListContainer) checkoutListContainer.innerHTML = '';

  cart.forEach(item => {
    const rawPrice = item.price !== undefined ? item.price : 0;
    const price = typeof rawPrice === 'number' 
                  ? rawPrice 
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    if (checkoutListContainer) {
      checkoutListContainer.innerHTML += `
        <div class="checkout-item-row" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
          <span>${item.name || item.title} (x${qty})</span>
          <span>LKR ${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
        </div>
      `;
    }
  });

  const grandTotal = subtotal + deliveryFee;

  if (checkoutSubtotal) checkoutSubtotal.textContent = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (checkoutDelivery) checkoutDelivery.textContent = `LKR ${deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (checkoutTotal) checkoutTotal.textContent = `LKR ${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

  const addressSection = document.getElementById('address-section');
  const addressInput = document.getElementById('address');
  const cityInput = document.getElementById('city');

  if (!isDeliveryChecked) {
    if (addressSection) addressSection.style.display = 'none';
    if (addressInput) addressInput.removeAttribute('required');
    if (cityInput) cityInput.removeAttribute('required');
  } else {
    if (addressSection) addressSection.style.display = 'block';
    if (addressInput) addressInput.setAttribute('required', 'true');
    if (cityInput) cityInput.setAttribute('required', 'true');
  }
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".add-to-cart-btn");
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  if (btn.classList.contains("processing")) return;
  btn.classList.add("processing");

  const card = btn.closest(".furniture-card");
  
  let rawName = btn.dataset.name || card?.querySelector("h4")?.innerText || "Furniture Item";
  let rawPrice = btn.dataset.price || card?.querySelector(".price")?.innerText || "0";
  let rawImage = btn.dataset.image || card?.querySelector("img")?.src || "";
  let rawCategory = btn.dataset.category || card?.getAttribute("data-category") || "Furniture";

  const productData = {
    _id: btn.dataset.id || Date.now().toString(),
    name: rawName,
    price: rawPrice,
    imageUrl: rawImage,
    category: rawCategory
  };

  addToCart(productData);

  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
  btn.style.background = "#10b981";
  btn.style.color = "#ffffff";

  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.style.background = "";
    btn.style.color = "";
    btn.classList.remove("processing");
  }, 1500);
});

function proceedToCheckout() {
  const token = localStorage.getItem("token");
  const cart = getCart();
  
  if (!cart || cart.length === 0) {
    alert("Your Cart is empty!");
    return;
  }

  if (!token) {
    alert("Please login before the Checkout.");
    openAuthModal();
    return;
  }

  window.location.href = 'checkout.html';
}

async function loadAnnouncements() {
  try {
    const trackContainer = document.getElementById('announcementTrack');
    if (!trackContainer) return;

    const response = await fetch(`${API_URL}/announcements`);
    if (!response.ok) return;

    const announcements = await response.json();

    if (announcements && announcements.length > 0) {
      trackContainer.innerHTML = announcements
        .map(item => `<span>${item.text}</span>`)
        .join('');
    }
  } catch (error) {
    console.error("Announcement Bar Error:", error);
  }
}

function filterByCategory(category, element) {
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach((chip) => chip.classList.remove("active"));
  if (element) element.classList.add("active");

  const selectedCategory = category.toLowerCase();
  const cards = document.querySelectorAll(".furniture-card");

  cards.forEach((card) => {
    const cardCat = (card.getAttribute("data-category") || "").toLowerCase();
    if (selectedCategory === "all" || cardCat === selectedCategory) {
      card.style.setProperty("display", "flex", "important");
    } else {
      card.style.setProperty("display", "none", "important");
    }
  });

  const blocks = document.querySelectorAll(".room-category-block");
  blocks.forEach((block) => {
    const secCategory = (block.getAttribute("data-sec-category") || "").toLowerCase();
    if (selectedCategory === "all" || secCategory === selectedCategory) {
      block.style.display = "block";
    } else {
      block.style.display = "none";
    }
  });
}

function openDrawerSearch() {
  const drawer = document.getElementById("drawerSearch");
  if (drawer) drawer.classList.add("active");
}

function closeDrawerSearch() {
  const drawer = document.getElementById("drawerSearch");
  if (drawer) drawer.classList.remove("active");
}

function suggestSearch() {
  const input = document.getElementById("drawerInput");
  const res = document.getElementById("searchResults");
  const cards = document.querySelectorAll(".furniture-card");

  if (!input || !res) return;

  const val = input.value.toLowerCase().trim();

  if (!val) {
    res.innerHTML = "";
    cards.forEach((card) => (card.style.display = "block"));
    return;
  }

  let matchesCount = 0;
  cards.forEach((card) => {
    const title = card.querySelector("h4") ? card.querySelector("h4").innerText.toLowerCase() : "";
    if (title.includes(val)) {
      card.style.display = "block";
      matchesCount++;
    } else {
      card.style.display = "none";
    }
  });

  res.innerHTML = `<p style="color: #64748b; padding: 10px 0;">Found ${matchesCount} item(s)</p>`;
}
// Item එක click කරපු ගමන්Data සේව් කරලා අලුත් Page එකට යවන Function එක
function openProductPage(product) {
  // Click කරපු product එකේ විස්තර LocalStorage එකේ Save කරනවා
  localStorage.setItem("selectedProduct", JSON.stringify(product));
  
  // අලුත් Detail Page එකට Redirect කරනවා
  window.location.href = "product-detail.html";
}
function toggleCategoryMore(buttonElement) {
  // Click කළ බටන් එක අයිති Category Block එක සොයා ගැනීම
  const categoryBlock = buttonElement.closest('.room-category-block');
  const productGrid = categoryBlock.querySelector('.furniture-item-grid');

  // 'expanded' class එක toggle කිරීම
  productGrid.classList.toggle('expanded');

  // Button එකේ Text එක සහ Icon එක මාරු කිරීම
  if (productGrid.classList.contains('expanded')) {
    buttonElement.innerHTML = 'View Less <i class="fa-solid fa-chevron-up"></i>';
  } else {
    buttonElement.innerHTML = 'View More Items <i class="fa-solid fa-chevron-down"></i>';
  }
}
function toggleCategoryMore(btn) {
  // Button ke parent block se grid elements dhundhna
  const categoryBlock = btn.closest('.room-category-block');
  const grid = categoryBlock.querySelector('.furniture-item-grid');

  if (grid) {
    // 'show-all' class ko toggle karna
    grid.classList.toggle('show-all');
    btn.classList.toggle('expanded');

    // Button text aur Icon badalna
    if (grid.classList.contains('show-all')) {
      btn.innerHTML = 'Show Less <i class="fa-solid fa-chevron-up"></i>';
    } else {
      btn.innerHTML = 'View More Items <i class="fa-solid fa-chevron-down"></i>';
    }
  }
}