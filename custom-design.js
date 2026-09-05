// Owner ගේ WhatsApp අංකය (Country code එක සහිතව, '+' නැතිව)
const OWNER_WHATSAPP_NUMBER = "94775670819";

document.getElementById("customOrderForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const height = document.getElementById("height_input").value.trim();
  const width = document.getElementById("width_input").value.trim();
  const wood = document.getElementById("wood_input").value;
  const phone = document.getElementById("phone_input").value.trim();
  const notes = document.getElementById("notes_input").value.trim();

  // WhatsApp Message එක සැකසීම
  let message = `📐 *CUSTOM FURNITURE DESIGN REQUEST*\n\n`;
  message += `📞 *Customer Phone:* ${phone}\n`;
  message += `📏 *Height:* ${height}\n`;
  message += `📐 *Width:* ${width}\n`;
  message += `🪵 *Wood Type:* ${wood}\n`;
  if (notes) message += `📝 *Additional Details:* ${notes}\n\n`;
  message += `📸 *(I will attach my custom design photos/sketches in this chat)*`;

  // WhatsApp Open කිරීම
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${OWNER_WHATSAPP_NUMBER}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
});