// ── Default supplier config ───────────────────────────────────────────────────
// Stored in localStorage as "jr_suppliers" so Manage page can edit it

const DEFAULT_SUPPLIERS = {
  "RV Bakery":              { type: "group",  contact: "https://chat.whatsapp.com/EqlgF2sr4xx7a265q49Pj2", lang: "zh" },
  "千层蛋糕":               { type: "group",  contact: "https://chat.whatsapp.com/Ifmf0DiZX4D4bY83hixOi9", lang: "zh" },
  "水果":                   { type: "group",  contact: "https://chat.whatsapp.com/DHk8FAbtB5MCxotKkZ4nsS", lang: "zh" },
  "TS Mart":                { type: "group",  contact: "https://chat.whatsapp.com/DbreQp9QxBdF04shUZN9oc", lang: "zh" },
  "Thermalnator":           { type: "phone",  contact: "60189859000",                                       lang: "zh" },
  "旺明":                   { type: "copy",   contact: "",                                                  lang: "zh" },
  "Goldenlita":             { type: "group",  contact: "https://chat.whatsapp.com/DTM0b1tLyRu97zOxSlvvvV", lang: "zh" },
  "Kivory":                 { type: "phone",  contact: "60169806640",                                       lang: "zh" },
  "Bo 8 Tea":               { type: "copy",   contact: "",                                                  lang: "zh" },
  "Fine Roastery":          { type: "group",  contact: "https://chat.whatsapp.com/GOXcyJogV2N40EUSUe4P2S", lang: "zh" },
  "茶包":                   { type: "copy",   contact: "",                                                  lang: "zh" },
  "H&S":                    { type: "group",  contact: "https://chat.whatsapp.com/FX4kEC4BGTA1nU0O2AF6qb", lang: "en" },
  "果汁":                   { type: "group",  contact: "https://chat.whatsapp.com/Hr5ghiQvasBBNjaTvlrUHn", lang: "en" },
  "Kombucha":               { type: "phone",  contact: "601126232548",                                      lang: "en" },
  "Yeli":                   { type: "group",  contact: "https://chat.whatsapp.com/FD0zMS1VxZCDBBMSz7t6V2", lang: "zh" },
  "Global Coffee Resources":{ type: "group",  contact: "https://chat.whatsapp.com/Itvu2IBqjpkCwbDLyAD6FH", lang: "en" },
  "散货":                   { type: "copy",   contact: "",                                                  lang: "zh" },
};

// ── Load / Save from localStorage ─────────────────────────────────────────────
export function loadSuppliers() {
  try {
    const saved = localStorage.getItem("jr_suppliers");
    if (saved) return { ...DEFAULT_SUPPLIERS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SUPPLIERS };
}

export function saveSuppliers(suppliers) {
  localStorage.setItem("jr_suppliers", JSON.stringify(suppliers));
}

export function resetSuppliers() {
  localStorage.removeItem("jr_suppliers");
  return { ...DEFAULT_SUPPLIERS };
}

// ── Message builder ────────────────────────────────────────────────────────────
export function buildMessage(category, selectedItems, supplierLang) {
  const lang = supplierLang ?? "zh";
  const itemLines = selectedItems.map((name) => `• ${name}`).join("\n");
  if (lang === "zh") {
    return `你好，我想订以下货品：\n\n${itemLines}\n\n请确认，谢谢 🙏`;
  }
  return `Hi, I'd like to order the following:\n\n${itemLines}\n\nPlease confirm, thank you 🙏`;
}

// ── WhatsApp URL builder ───────────────────────────────────────────────────────
export function buildWhatsAppUrl(supplier, selectedItems) {
  if (!supplier || supplier.type === "copy") return null;
  const message = buildMessage("", selectedItems, supplier.lang);
  const encoded = encodeURIComponent(message);

  if (supplier.type === "group") {
    const link = (supplier.contact ?? "").trim();
    if (!link) return null;
    return { url: link, type: "group" };
  }

  if (supplier.type === "phone") {
    // Strip everything except digits
    let phone = (supplier.contact ?? "").replace(/\D/g, "");

    // Handle Malaysian local format: starts with 0 → replace with 60
    // e.g. 0123456789 → 60123456789
    if (phone.startsWith("0")) {
      phone = "60" + phone.slice(1);
    }

    // Must start with country code — if still no 60 prefix, assume Malaysia
    if (!phone.startsWith("60") && phone.length <= 10) {
      phone = "60" + phone;
    }

    if (!phone) return null;
    return { url: `https://wa.me/${phone}?text=${encoded}`, type: "phone" };
  }

  return null;
}

// ── Validate contact before saving ───────────────────────────────────────────
export function validateContact(type, contact) {
  if (type === "copy") return { ok: true };
  if (!contact?.trim()) return { ok: false, msg: "Contact cannot be empty" };

  if (type === "group") {
    const link = contact.trim();
    if (!link.includes("chat.whatsapp.com") && !link.includes("wa.me")) {
      return { ok: false, msg: "Must be a WhatsApp group link (chat.whatsapp.com/...)" };
    }
    return { ok: true };
  }

  if (type === "phone") {
    const digits = contact.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) {
      return { ok: false, msg: "Phone number looks invalid (e.g. 60123456789)" };
    }
    return { ok: true };
  }

  return { ok: true };
}
