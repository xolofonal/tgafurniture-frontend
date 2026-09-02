const API_URL = 'https://tgafurniture-backend.vercel.app/api';

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

async function startPayHerePayment(e) {
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

  if (submitBtn) submitBtn.disabled = true;

  if (typeof payhere === 'undefined') {
    alert("PayHere SDK library link is not loaded correctly.");
    if (submitBtn) submitBtn.disabled = false;
    return false;
  }

  const cart = getCartData();
  if (!cart || cart.length === 0) {
    alert("Your cart is empty!");
    if (submitBtn) submitBtn.disabled = false;
    return false;
  }

  // PayHere Event Handlers මුලින්ම Bind කිරීම
  payhere.onCompleted = function (orderId) {
    alert("Payment completed successfully! Order ID: " + orderId);
    localStorage.removeItem("cartItems");
    localStorage.removeItem("isDeliveryChecked");
    window.location.href = "index.html";
  };

  payhere.onDismissed = function () {
    if (submitBtn) submitBtn.disabled = false;
  };

  payhere.onError = function (error) {
    if (submitBtn) submitBtn.disabled = false;
    alert("PayHere Error: " + error);
  };

  const subtotal = cart.reduce((sum, item) => {
    const rawPrice = item.price !== undefined ? item.price : item.unitPrice;
    const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || 0).replace(/[^0-9.]/g, "")) || 0;
    const qty = Number(item.quantity || item.qty || 1);
    return sum + (price * qty);
  }, 0);

  const isDeliveryChecked = JSON.parse(localStorage.getItem('isDeliveryChecked'));
  const isDelivery = isDeliveryChecked !== null ? isDeliveryChecked : true;
  const deliveryFee = isDelivery ? 2500 : 0;
  const totalAmount = subtotal + deliveryFee;
  const orderId = "ORD-" + Date.now();

  const firstName = document.getElementById("first_name")?.value.trim() || "";
  const lastName = document.getElementById("last_name")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const phone = document.getElementById("phone")?.value.trim() || "";
  const addressElem = document.getElementById("address");
  const cityElem = document.getElementById("city");

  const addressVal = (isDelivery && addressElem && addressElem.value.trim() !== "") ? addressElem.value.trim() : "Store Pickup";
  const cityVal = (isDelivery && cityElem && cityElem.value.trim() !== "") ? cityElem.value.trim() : "Store Pickup";

  try {
    const res = await fetch(`${API_URL}/payments/payhere-hash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: orderId, amount: totalAmount, currency: "LKR" })
    });

    if (!res.ok) throw new Error("Failed to fetch hash from backend server.");

    const hashData = await res.json();

// checkout.js ඇතුළත
const paymentObject = {
  "sandbox": true,
  "merchant_id": hashData.merchant_id,
  "return_url": window.location.origin + "/index.html",
  "cancel_url": window.location.href,
  "notify_url": `${API_URL}/payments/notify`,
  "order_id": orderId,
  "items": "Test", // Items නම කෙටියෙන් තබන්න
  "amount": hashData.amount, // ⚠️ Backend එකෙන් Hash එක හදන්න භාවිතා කල String Amount එකම යවන්න (e.g. "100.00")
  "currency": hashData.currency,
  "hash": hashData.hash,
  "first_name": firstName || "Customer",
  "last_name": lastName || "Name",
  "email": email || "test@example.com",
  "phone": phone || "0771234567",
  "address": addressVal || "No 1",
  "city": cityVal || "Colombo",
  "country": "Sri Lanka"
};

    payhere.startPayment(paymentObject);

  } catch (err) {
    if (submitBtn) submitBtn.disabled = false;
    console.error("Payment initiation error:", err);
    alert("Backend Server එක ක්‍රියාත්මක නොවේ, නැතහොත් Request එක අඩාල විය.");
  }
}

window.toggleCheckoutDelivery = toggleCheckoutDelivery;

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", startPayHerePayment);
  }
});