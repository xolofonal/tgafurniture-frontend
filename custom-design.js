// Owner ගේ WhatsApp අංකය (Country code එක සහිතව, '+' නැතිව)
const OWNER_WHATSAPP_NUMBER = "94771234567";

document.getElementById("customOrderForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const fileInput = document.getElementById("photo_input");
  const height = document.getElementById("height_input").value.trim();
  const width = document.getElementById("width_input").value.trim();
  const wood = document.getElementById("wood_input").value;
  const phone = document.getElementById("phone_input").value.trim();
  const notes = document.getElementById("notes_input").value.trim();

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("කරුණාකර Photo / Sketch එකක් තෝරන්න!");
    return;
  }

  const file = fileInput.files[0];
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading Photo...`;

  let photoUrl = "";

  // Cloudinary Free Unsigned Preset එක හරහා Image එක Upload කිරීම
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default"); // Free default preset

    const res = await fetch("https://api.cloudinary.com/v1_1/demo/image/upload", {
      method: "POST",
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      photoUrl = data.secure_url;
    }
  } catch (err) {
    console.warn("Photo auto-upload failed, sending request without image link.", err);
  }

  // WhatsApp Message එක සැකසීම
  let message = `📐 *CUSTOM FURNITURE DESIGN REQUEST*\n\n`;
  message += `📞 *Customer Phone:* ${phone}\n`;
  message += `📏 *Height:* ${height}\n`;
  message += `📐 *Width:* ${width}\n`;
  message += `🪵 *Wood Type:* ${wood}\n`;
  if (notes) message += `📝 *Additional Details:* ${notes}\n`;

  if (photoUrl) {
    message += `\n🖼️ *Design Photo/Sketch:* ${photoUrl}\n`;
  } else {
    message += `\n⚠️ *(Photo attachment option failed. Please attach the photo manually in WhatsApp chat)*\n`;
  }

  message += `\nPlease review and send me a quote. Thank you!`;

  // WhatsApp Open කිරීම
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${94775670819}?text=${encodedMessage}`;

  submitBtn.disabled = false;
  submitBtn.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Send Custom Request via WhatsApp`;

  window.open(whatsappUrl, "_blank");
});