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
    return { url: supplier.contact, type: "group" };
  }
  if (supplier.type === "phone") {
    const phone = supplier.contact.replace(/\D/g, "");
    return { url: `https://wa.me/${phone}?text=${encoded}`, type: "phone" };
  }
  return null;
}
