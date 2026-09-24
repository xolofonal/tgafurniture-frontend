const API_URL = 'https://tgafurniture-backend.vercel.app';
const OWNER_WHATSAPP_NUMBER = "94775670819";

function getCartData() {
  try {
    const cartData = localStorage.getItem("cartItems");
    return cartData ? JSON.parse(cartData) : [];
  } catch (err) {
    return [];
  }
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
  const deliveryFeeRow = document.getElementById('delivery-fee-row');

  const cart = getCartData(); 
  if (!checkoutListContainer) return;

  checkoutListContainer.innerHTML = '';

  if (!cart || cart.length === 0) {
    checkoutListContainer.innerHTML = "<p>Your cart is empty.</p>";
    if (checkoutSubtotal) checkoutSubtotal.textContent = "LKR 0.00";
    if (checkoutDelivery) checkoutDelivery.textContent = "LKR 0.00";
    if (checkoutTotal) checkoutTotal.textContent = "LKR 0.00";
    return;
  }

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

  cart.forEach(item => {
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' 
                  ? rawPrice 
                  : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    checkoutListContainer.innerHTML += `
      <div class="checkout-item-row" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
        <span>${item.name || item.title} (x${qty})</span>
        <span>LKR ${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
      </div>
    `;
  });

  const grandTotal = subtotal + deliveryFee;

  if (checkoutSubtotal) checkoutSubtotal.textContent = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  
  // Delivery Fee row Toggle Effect
  if (deliveryFeeRow) {
    if (isDeliveryChecked) {
      deliveryFeeRow.style.display = 'flex';
      if (checkoutDelivery) checkoutDelivery.textContent = `LKR ${deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    } else {
      deliveryFeeRow.style.display = 'none';
    }
  }

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

async function sendWhatsAppOrder(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const submitBtn = document.querySelector("#checkoutForm button[type='submit']");
  const form = document.getElementById("checkoutForm");

  if (form && !form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  const cart = getCartData();
  if (!cart || cart.length === 0) {
    alert("ඔබගේ Cart එක හිස්ව පවතී!");
    return false;
  }

  if (submitBtn) submitBtn.disabled = true;

  const firstName = document.getElementById("first_name")?.value.trim() || "";
  const lastName = document.getElementById("last_name")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const phone = document.getElementById("phone")?.value.trim() || "";
  const addressElem = document.getElementById("address");
  const cityElem = document.getElementById("city");

  const isDeliveryChecked = JSON.parse(localStorage.getItem('isDeliveryChecked'));
  const isDelivery = isDeliveryChecked !== null ? isDeliveryChecked : true;
  const orderType = isDelivery ? "Delivery" : "Store Pickup";

  const addressVal = (isDelivery && addressElem && addressElem.value.trim() !== "") ? addressElem.value.trim() : "Store Pickup";
  const cityVal = (isDelivery && cityElem && cityElem.value.trim() !== "") ? cityElem.value.trim() : "Store Pickup";

  let subtotal = 0;
  let itemsText = "";

  cart.forEach((item, index) => {
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    itemsText += `${index + 1}. *${item.name || item.title}*\n   - Qty: ${qty}\n   - Price: LKR ${itemTotal.toLocaleString('en-US')}\n`;
  });

  const deliveryFee = isDelivery ? 2500 : 0;
  const totalAmount = subtotal + deliveryFee;
  const orderId = "ORD-" + Date.now();

  try {
    await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        customer: { firstName, lastName, email, phone, address: addressVal, city: cityVal },
        items: cart,
        orderType: orderType,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        totalAmount: totalAmount,
        paymentMethod: "WhatsApp Inquiry",
        status: "Pending"
      })
    });
  } catch (err) {
    console.warn("Backend order save failed or skipped:", err);
  }

  // WhatsApp Message Formatting
  let message = `🛒 *NEW ORDER INQUIRY - TGA FURNITURE*\n\n`;
  message += `🔖 *Order ID:* ${orderId}\n`;
  message += `👤 *Customer Name:* ${firstName} ${lastName}\n`;
  message += `📞 *Phone Number:* ${phone}\n`;
  if (email) message += `📧 *Email:* ${email}\n`;
  message += `🚚 *Order Type:* ${orderType}\n`;

  if (isDelivery) {
    message += `📍 *Delivery Address:* ${addressVal}, ${cityVal}\n`;
  }

  message += `\n📦 *ORDER ITEMS:*\n${itemsText}\n`;
  message += `💰 *Subtotal:* LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}\n`;
  
  // WhatsApp Message: Sirf Delivery hone par hi Delivery Fee dikhayega
  if (isDelivery) {
    message += `🚚 *Delivery Fee:* LKR ${deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2})}\n`;
  }

  message += `💵 *TOTAL PRICE:* LKR ${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n`;
  message += `Please confirm my order. Thank you!`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodedMessage}`;

  localStorage.removeItem("cartItems");
  localStorage.removeItem("isDeliveryChecked");
  
  if (submitBtn) submitBtn.disabled = false;
  
  window.open(whatsappUrl, '_blank');
}

window.toggleCheckoutDelivery = toggleCheckoutDelivery;

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", sendWhatsAppOrder);
  }
});