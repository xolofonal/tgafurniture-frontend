const API_URL = 'https://tgafurniture-backend.vercel.app/api';

// Owner ගේ WhatsApp අංකය (Country code එක සහිතව, '+' නැතිව)
const OWNER_WHATSAPP_NUMBER = "94771234567";

function getCartData() {
  try {
    const cartData = localStorage.getItem("cartItems");
    return cartData ? JSON.parse(cartData) : [];
  } catch (err) {
    return [];
  }
}

function toggleCheckoutDelivery(isDelivery) {
  const addressSection = document.getElementById("address-section");
  const addressInput = document.getElementById("address");
  const cityInput = document.getElementById("city");

  localStorage.setItem('isDeliveryChecked', JSON.stringify(isDelivery));

  if (addressSection) {
    addressSection.style.display = isDelivery ? "block" : "none";
  }

  if (addressInput) addressInput.required = isDelivery;
  if (cityInput) cityInput.required = isDelivery;

  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const itemsContainer = document.getElementById("checkout-items-list");
  const subtotalElem = document.getElementById("checkout-subtotal");
  const deliveryElem = document.getElementById("checkout-delivery");
  const totalElem = document.getElementById("checkout-total");

  const cart = getCartData();
  if (!itemsContainer) return;

  itemsContainer.innerHTML = "";

  if (!cart || cart.length === 0) {
    itemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    if (subtotalElem) subtotalElem.textContent = "LKR 0.00";
    if (deliveryElem) deliveryElem.textContent = "LKR 0.00";
    if (totalElem) totalElem.textContent = "LKR 0.00";
    return;
  }

  let subtotal = 0;

  cart.forEach(item => {
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    const div = document.createElement("div");
    div.className = "summary-item";
    div.style.cssText = "display: flex; justify-content: space-between; margin-bottom: 8px;";
    div.innerHTML = `
      <span>${item.name || item.title} (x${qty})</span>
      <span>LKR ${itemTotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
    `;
    itemsContainer.appendChild(div);
  });

  const isDeliveryChecked = JSON.parse(localStorage.getItem('isDeliveryChecked'));
  const isDelivery = isDeliveryChecked !== null ? isDeliveryChecked : true;
  const deliveryFee = isDelivery ? 2500 : 0;
  const total = subtotal + deliveryFee;

  if (subtotalElem) subtotalElem.textContent = `LKR ${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
  if (deliveryElem) deliveryElem.textContent = isDelivery ? `LKR ${deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2})}` : "Free";
  if (totalElem) totalElem.textContent = `LKR ${total.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
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

  // Subtotal සහ Items පෙළ සකස් කිරීම
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

  // 1. Back-end එකට Order Details Save කිරීම (Optionally)
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

  // 2. WhatsApp Message Text එක සැකසීම
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
  message += `🚚 *Delivery Fee:* ${isDelivery ? 'LKR ' + deliveryFee.toLocaleString('en-US', {minimumFractionDigits: 2}) : 'Free'}\n`;
  message += `💵 *TOTAL PRICE:* LKR ${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n`;
  message += `Please confirm my order. Thank you!`;

  // 3. Encoded WhatsApp URL එක සාදා redirect කිරීම
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${94775670819}?text=${encodedMessage}`;

  // 4. Cart එක Clear කර WhatsApp එකට යැවීම
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