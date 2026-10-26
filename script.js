"use strict";

const $ = id => document.getElementById(id);

const STORAGE_KEY = "listly_saved_lists_v1";

const templates = {
  cream: {
    background: "#fff9eb",
    color: "#30382b",
    accent: "#66845c"
  },
  green: {
    background: "#294b3c",
    color: "#f8f2df",
    accent: "#e3c878"
  },
  pink: {
    background: "#f8e3e7",
    color: "#533b43",
    accent: "#b35f78"
  },
  dark: {
    background: "#101b20",
    color: "#f0f5f4",
    accent: "#40e2ae"
  }
};

const currencies = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  CAD: "CA$",
  INR: "₹"
};

let items = [];
let savedLists = [];
let activeTemplate = "cream";
let accentColor = "#66845c";
let nextId = 1;
let activeSavedId = null;

function makeId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getCurrency() {
  return $("currency").value || "NGN";
}

function money(value) {
  const amount = Number(value) || 0;
  const currency = getCurrency();

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currencies[currency] || currency}${amount.toFixed(2)}`;
  }
}

function readItemsFromInputs() {
  document.querySelectorAll(".item-row").forEach(row => {
    const id = row.dataset.id;
    const item = items.find(entry => entry.id === id);
    if (!item) return;

    item.name = row.querySelector(".item-name").value;
    item.qty = row.querySelector(".item-qty").value;
    item.price = row.querySelector(".item-price").value;
  });
}

function addItem(data = {}) {
  const item = {
    id: makeId(),
    name: String(data.name || ""),
    qty: data.qty ?? 1,
    price: data.price ?? ""
  };

  items.push(item);
  renderItems();

  const rows = document.querySelectorAll(".item-row");
  const last = rows[rows.length - 1];
  if (last) last.querySelector(".item-name").focus();

  renderPreview();
}

function renderItems() {
  const container = $("itemsList");

  if (!items.length) {
    container.innerHTML = "";
    $("itemCount").textContent = "0 items";
    renderPreview();
    return;
  }

  container.innerHTML = `
    <div class="item-labels">
      <span>Item</span>
      <span>Quantity</span>
      <span>Unit price</span>
      <span></span>
    </div>
    ${items.map(item => `
      <div class="item-row" data-id="${escapeHtml(item.id)}">
        <input
          class="item-name"
          type="text"
          maxlength="100"
          placeholder="Item name"
          aria-label="Item name"
          value="${escapeHtml(item.name)}"
        >
        <input
          class="item-qty"
          type="number"
          min="0"
          step="any"
          aria-label="Quantity"
          placeholder="Qty"
          value="${escapeHtml(item.qty)}"
        >
        <input
          class="item-price"
          type="number"
          min="0"
          step="0.01"
          aria-label="Unit price"
          placeholder="Price"
          value="${escapeHtml(item.price)}"
        >
        <button class="remove-item" type="button" aria-label="Remove item">×</button>
      </div>
    `).join("")}
  `;

  const namedCount = items.filter(item => item.name.trim()).length;
  $("itemCount").textContent = `${namedCount} item${namedCount === 1 ? "" : "s"}`;
}

function totalCost() {
  return items.reduce((sum, item) => {
    const quantity = Math.max(0, Number(item.qty) || 0);
    const price = Math.max(0, Number(item.price) || 0);
    return sum + quantity * price;
  }, 0);
}

function renderPreview() {
  $("previewTitle").textContent =
    $("listTitle").value.trim() || "Shopping List";

  $("previewSubtitle").textContent = $("subtitle").value.trim();

  const total = totalCost();
  $("previewTotal").textContent = money(total);

  const budgetRaw = $("budget").value;
  const hasBudget = budgetRaw !== "" && Number(budgetRaw) >= 0;
  const budget = hasBudget ? Number(budgetRaw) : null;

  $("previewBudgetBlock").style.display = hasBudget ? "" : "none";
  $("previewDifferenceBlock").style.display = hasBudget ? "" : "none";

  if (hasBudget) {
    const difference = budget - total;

    $("previewBudget").textContent = money(budget);
    $("differenceLabel").textContent =
      difference >= 0 ? "LEFT OVER" : "OVER BUDGET";

    $("previewDifference").textContent = money(Math.abs(difference));
    $("previewDifference").style.color =
      difference < 0 ? "#bd5b48" : "var(--preview-accent)";
  }

  const namedItems = items.filter(item => item.name.trim());

  if (!namedItems.length) {
    $("previewItems").innerHTML =
      '<p class="empty-preview">Your items will appear here. Add your first item above!</p>';
  } else {
    $("previewItems").innerHTML = namedItems.map(item => {
      const quantity = Math.max(0, Number(item.qty) || 0);
      const price = Math.max(0, Number(item.price) || 0);

      const showQuantity = $("showQuantities").checked;
      const showPrice = $("showPrices").checked;

      const meta = [
        showQuantity ? `× ${quantity}` : "",
        showPrice && item.price !== "" ? money(quantity * price) : ""
      ].filter(Boolean).join(" · ");

      return `
        <div class="preview-item">
          <span class="preview-check"></span>
          <span class="preview-item-name">${escapeHtml(item.name)}</span>
          ${meta ? `<span class="preview-item-meta">${escapeHtml(meta)}</span>` : ""}
        </div>
      `;
    }).join("");
  }

  const preview = $("listPreview");
  preview.className = `list-preview theme-${activeTemplate}`;
  preview.style.background = templates[activeTemplate].background;
  preview.style.color = templates[activeTemplate].color;
  preview.style.setProperty("--preview-accent", accentColor);
}

function currentList() {
  readItemsFromInputs();

  return {
    id: activeSavedId || makeId(),
    title: $("listTitle").value.trim() || "Shopping List",
    currency: getCurrency(),
    budget: $("budget").value,
    subtitle: $("subtitle").value,
    items: items.map(({ name, qty, price }) => ({ name, qty, price })),
    template: activeTemplate,
    accentColor,
    showQuantities: $("showQuantities").checked,
    showPrices: $("showPrices").checked,
    updatedAt: new Date().toISOString()
  };
}

function loadList(data) {
  $("listTitle").value = data.title || "Shopping List";
  $("currency").value = currencies[data.currency] ? data.currency : "NGN";
  $("budget").value = data.budget ?? "";
  $("subtitle").value = data.subtitle || "";

  activeTemplate = templates[data.template] ? data.template : "cream";
  accentColor = data.accentColor || templates[activeTemplate].accent;
  activeSavedId = data.id || null;

  $("showQuantities").checked = data.showQuantities !== false;
  $("showPrices").checked = data.showPrices !== false;

  items = (Array.isArray(data.items) ? data.items : []).map(item => ({
    id: makeId(),
    name: String(item.name || ""),
    qty: item.qty ?? 1,
    price: item.price ?? ""
  }));

  document.querySelectorAll(".template-option").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.template === activeTemplate
    );
  });

  document.querySelectorAll(".color-dot").forEach(button => {
    button.classList.toggle(
      "selected",
      button.dataset.color === accentColor
    );
  });

  renderItems();
  renderPreview();
  showStatus("List loaded.");
}

function readSavedLists() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.error("Could not read saved lists:", error);
    return [];
  }
}

function persistSavedLists() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLists));
    return true;
  } catch (error) {
    console.error("Could not save lists:", error);
    showStatus("Could not save. Browser storage may be full or unavailable.", true);
    return false;
  }
}

function renderSavedLists() {
  const container = $("savedLists");

  if (!savedLists.length) {
    container.innerHTML =
      '<p class="empty-saved">Your saved lists will show up here.</p>';
    return;
  }

  container.innerHTML = savedLists.map(list => {
    const count = (list.items || []).filter(
      item => String(item.name || "").trim()
    ).length;

    const total = (list.items || []).reduce((sum, item) => {
      return sum
        + Math.max(0, Number(item.qty) || 0)
        * Math.max(0, Number(item.price) || 0);
    }, 0);

    let formatted;

    try {
      formatted = new Intl.NumberFormat("en", {
        style: "currency",
        currency: list.currency || "NGN"
      }).format(total);
    } catch {
      formatted = `${list.currency || "NGN"} ${total.toFixed(2)}`;
    }

    return `
      <article class="saved-card">
        <h3>${escapeHtml(list.title || "Shopping List")}</h3>
        <p>${count} item${count === 1 ? "" : "s"} · ${escapeHtml(formatted)}</p>
        <div class="saved-card-actions">
          <button class="load-saved" type="button" data-load="${escapeHtml(list.id)}">Open list</button>
          <button class="delete-saved" type="button" data-delete="${escapeHtml(list.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function showStatus(message, isError = false) {
  const status = $("statusMessage");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function resetList() {
  $("listTitle").value = "Shopping List";
  $("currency").value = "NGN";
  $("budget").value = "";
  $("subtitle").value = "";

  activeTemplate = "cream";
  accentColor = templates.cream.accent;
  activeSavedId = null;
  items = [];

  $("showQuantities").checked = true;
  $("showPrices").checked = true;

  document.querySelectorAll(".template-option").forEach(button => {
    button.classList.toggle("active", button.dataset.template === "cream");
  });

  document.querySelectorAll(".color-dot").forEach(button => {
    button.classList.toggle("selected", button.dataset.color === accentColor);
  });

  renderItems();
  renderPreview();
  showStatus("Started a fresh list.");
}

$("addItemBtn").addEventListener("click", () => addItem());
$("newListBtn").addEventListener("click", resetList);

$("clearBtn").addEventListener("click", () => {
  items = [];
  renderItems();
  renderPreview();
  showStatus("Items cleared.");
});

$("saveBtn").addEventListener("click", () => {
  const data = currentList();

  if (!data.items.some(item => item.name.trim())) {
    showStatus("Add at least one named item before saving.", true);
    return;
  }

  const existingIndex = savedLists.findIndex(list => list.id === data.id);

  if (existingIndex >= 0) {
    savedLists[existingIndex] = data;
  } else {
    savedLists.unshift(data);
  }

  savedLists = savedLists.slice(0, 50);

  if (persistSavedLists()) {
    activeSavedId = data.id;
    renderSavedLists();
    showStatus("List saved in this browser.");
  }
});

$("itemsList").addEventListener("input", event => {
  if (!event.target.matches("input")) return;

  readItemsFromInputs();
  renderPreview();
});

$("itemsList").addEventListener("click", event => {
  const button = event.target.closest(".remove-item");
  if (!button) return;

  const row = button.closest(".item-row");
  const id = row.dataset.id;

  items = items.filter(item => item.id !== id);
  renderItems();
  renderPreview();
});

["listTitle", "currency", "budget", "subtitle", "showQuantities", "showPrices"]
  .forEach(id => {
    $(id).addEventListener("input", renderPreview);
    $(id).addEventListener("change", renderPreview);
  });

$("templates").addEventListener("click", event => {
  const button = event.target.closest("[data-template]");
  if (!button) return;

  activeTemplate = button.dataset.template;
  accentColor = templates[activeTemplate].accent;

  document.querySelectorAll(".template-option").forEach(option => {
    option.classList.toggle("active", option === button);
  });

  document.querySelectorAll(".color-dot").forEach(dot => {
    dot.classList.toggle("selected", dot.dataset.color === accentColor);
  });

  renderPreview();
});

document.querySelectorAll(".color-dot").forEach(button => {
  button.addEventListener("click", () => {
    accentColor = button.dataset.color;

    document.querySelectorAll(".color-dot").forEach(dot => {
      dot.classList.toggle("selected", dot === button);
    });

    renderPreview();
  });
});

$("savedLists").addEventListener("click", event => {
  const loadButton = event.target.closest("[data-load]");
  const deleteButton = event.target.closest("[data-delete]");

  if (loadButton) {
    const list = savedLists.find(entry => entry.id === loadButton.dataset.load);

    if (list) {
      loadList(list);
      $("builder").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;

    savedLists = savedLists.filter(entry => entry.id !== id);

    if (persistSavedLists()) {
      if (activeSavedId === id) activeSavedId = null;
      renderSavedLists();
      showStatus("Saved list deleted.");
    }
  }
});

$("downloadBtn").addEventListener("click", async () => {
  renderPreview();

  const node = $("listPreview");
  const downloadButton = $("downloadBtn");

  downloadButton.disabled = true;
  downloadButton.textContent = "Preparing image…";

  try {
    const width = Math.ceil(node.getBoundingClientRect().width);
    const height = Math.ceil(node.getBoundingClientRect().height);

    if (!width || !height) {
      throw new Error("The preview has no size.");
    }

    const clone = node.cloneNode(true);
    clone.style.width = `${width}px`;
    clone.style.height = "auto";
    clone.style.fontFamily = "Arial, sans-serif";

    const html = new XMLSerializer().serializeToString(clone);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml"
               style="width:${width}px;min-height:${height}px;font-family:Arial,sans-serif">
            ${html}
          </div>
        </foreignObject>
      </svg>
    `;

    const svgBlob = new Blob([svg], {
      type: "image/svg+xml;charset=utf-8"
    });

    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * 2;
        canvas.height = height * 2;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable.");

        context.scale(2, 2);
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(png => {
          URL.revokeObjectURL(svgUrl);

          if (!png) {
            showStatus("Image export failed in this browser.", true);
            return;
          }

          const pngUrl = URL.createObjectURL(png);
          const link = document.createElement("a");

          link.href = pngUrl;
          link.download =
            `${($("listTitle").value.trim() || "shopping-list")
              .replace(/[^a-z0-9-_]+/gi, "-")
              .toLowerCase()}.png`;

          document.body.appendChild(link);
          link.click();
          link.remove();

          setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
          showStatus("Your PNG download is ready.");
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        console.error(error);
        showStatus("Could not export the image in this browser.", true);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      showStatus(
        "This browser couldn't export the image. Try opening the website in another browser.",
        true
      );
    };

    image.src = svgUrl;
  } catch (error) {
    console.error(error);
    showStatus("Could not export the image. Please try again.", true);
  } finally {
    downloadButton.disabled = false;
    downloadButton.textContent = "↓ Download list as image";
  }
});

// Start with a blank, reusable shopping list.
$("listTitle").value = "Shopping List";
$("subtitle").value = "";
$("budget").value = "";
$("currency").value = "NGN";
items = [];

// Restore saved lists from this browser.
savedLists = readSavedLists();

renderItems();
renderPreview();
renderSavedLists();
