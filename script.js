"use strict";

const $ = id => document.getElementById(id);
const paper = $("paper");
const itemsBody = $("items");

let rows = [];
let nextId = 1;
let currentSavedId = "";
const STORAGE_KEY = "listly_saved_lists_v1";

const CURRENCIES = {
    NGN: { locale: "en-NG", symbol: "₦" },
    USD: { locale: "en-US", symbol: "$" },
    GBP: { locale: "en-GB", symbol: "£" },
    EUR: { locale: "de-DE", symbol: "€" },
    GHS: { locale: "en-GH", symbol: "GH₵" },
    KES: { locale: "en-KE", symbol: "KSh" },
    ZAR: { locale: "en-ZA", symbol: "R" },
    CAD: { locale: "en-CA", symbol: "C$" },
    INR: { locale: "en-IN", symbol: "₹" }
};

const DEFAULTS = {
    original: { background: "#07151b" },
    classic: { background: "#fffaf0" },
    market: { background: "#fff7e8" },
    minimal: { background: "#ffffff" }
};

function money(value) {
    const currency = $("currency").value;
    const settings = CURRENCIES[currency] || CURRENCIES.NGN;

    try {
        return new Intl.NumberFormat(settings.locale, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    } catch {
        return settings.symbol + (Number(value) || 0).toFixed(2);
    }
}

function currencySymbol() {
    return (CURRENCIES[$("currency").value] || CURRENCIES.NGN).symbol;
}

function numberValue(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function quantityValue(value) {
    const text = String(value ?? "").trim();
    if (!text) return 0;

    const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (fraction && Number(fraction[2]) !== 0) {
        return Number(fraction[1]) / Number(fraction[2]);
    }

    const n = Number(text);
    if (Number.isFinite(n) && n > 0) return n;

    const match = text.match(/^\s*(\d+(?:\.\d+)?)/);
    return match ? numberValue(match[1]) : 0;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[c]);
}

function addRow(name = "", quantity = "", price = "") {
    const row = { id: nextId++, name, quantity, price };
    rows.push(row);
    renderRows();

    const input = itemsBody.querySelector(
        `tr[data-id="${row.id}"] .name-input`
    );
    if (input) input.focus();
}

function renderRows() {
    itemsBody.innerHTML = rows.map((row, index) => `
        <tr data-id="${row.id}">
            <td class="row-number">${index + 1}</td>
            <td>
                <input class="cell-input name-input" type="text"
                    aria-label="Item name" placeholder="Item name"
                    value="${escapeHTML(row.name)}">
            </td>
            <td>
                <input class="cell-input quantity-input" type="text"
                    inputmode="decimal" aria-label="Quantity"
                    placeholder="e.g. 2" value="${escapeHTML(row.quantity)}">
            </td>
            <td>
                <input class="cell-input price-input" type="number"
                    min="0" step="0.01" inputmode="decimal"
                    aria-label="Unit price" placeholder="Unit price"
                    value="${escapeHTML(row.price)}">
                <div class="line-amount">—</div>
            </td>
            <td class="action-col">
                <button class="remove-row" type="button"
                    aria-label="Remove item" title="Remove item">×</button>
            </td>
        </tr>
    `).join("");

    updateTotals();
}

function readRows() {
    itemsBody.querySelectorAll("tr").forEach(tr => {
        const row = rows.find(item => item.id === Number(tr.dataset.id));
        if (!row) return;

        row.name = tr.querySelector(".name-input").value;
        row.quantity = tr.querySelector(".quantity-input").value;
        row.price = tr.querySelector(".price-input").value;
    });
}

function updateTotals() {
    let total = 0;

    itemsBody.querySelectorAll("tr").forEach(tr => {
        const row = rows.find(item => item.id === Number(tr.dataset.id));
        if (!row) return;

        const hasQuantity = row.quantity.trim() !== "";
        const hasPrice = row.price !== "";
        const amount = quantityValue(row.quantity) * numberValue(row.price);

        total += amount;

        tr.querySelector(".line-amount").textContent =
            hasQuantity && hasPrice ? money(amount) : "—";
    });

    $("totalInside").textContent = money(total);
    $("totalOutside").textContent = money(total);

    const budgetText = $("budget").value.trim();
    const hasBudget = budgetText !== "" &&
        Number.isFinite(Number(budgetText)) && Number(budgetText) >= 0;

    const budget = hasBudget ? Number(budgetText) : null;
    const remaining = hasBudget ? budget - total : null;

    $("budgetInside").textContent = hasBudget ? money(budget) : "—";
    $("remainingInside").textContent = hasBudget ? money(remaining) : "—";
    $("remainingOutside").textContent = hasBudget ? money(remaining) : "—";

    const overBudget = remaining !== null && remaining < 0;
    $("remainingInside").style.color = overBudget ? "#ff8277" : "";
    $("remainingOutside").style.color = overBudget ? "#b43e31" : "";

    return { total, hasBudget, budget, remaining };
}

/* Item controls */
$("addRow").addEventListener("click", () => addRow());

$("clearRows").addEventListener("click", () => {
    rows = [];
    renderRows();
    setStatus("All items cleared.");
});

itemsBody.addEventListener("input", () => {
    readRows();
    updateTotals();
});

itemsBody.addEventListener("click", event => {
    const button = event.target.closest(".remove-row");
    if (!button) return;

    const id = Number(button.closest("tr").dataset.id);
    rows = rows.filter(row => row.id !== id);
    renderRows();
    setStatus("Item removed.");
});

/* Template selection */
function selectedTemplate() {
    return $("template").value;
}

function applyTemplate(template, resetColour = true) {
    if (!DEFAULTS[template]) template = "original";

    paper.className = `paper ${template}`;

    if (resetColour) {
        $("background").value = DEFAULTS[template].background;
    }

    applyBackground();
}

$("template").addEventListener("change", () => {
    applyTemplate(selectedTemplate(), true);
});

/* Background colour */
function applyBackground() {
    paper.style.setProperty("--paper-bg", $("background").value);
}

$("background").addEventListener("input", applyBackground);

$("resetBackground").addEventListener("click", () => {
    $("background").value = DEFAULTS[selectedTemplate()].background;
    applyBackground();
    setStatus("Default background colour restored.");
});

/* Editable heading and text */
const textBindings = [
    ["heading", "previewHeading"],
    ["subtitle", "previewSubtitle"],
    ["decorativeText", "previewDecorative"],
    ["footerText", "previewFooter"]
];

function formatDecorativeText(value) {
    return escapeHTML(value).replace(/,\s*/g, "<br>");
}

textBindings.forEach(([inputId, previewId]) => {
    const input = $(inputId);
    const preview = $(previewId);

    input.addEventListener("input", () => {
        if (previewId === "previewDecorative") {
            preview.innerHTML = formatDecorativeText(input.value);
        } else {
            preview.textContent = input.value;
        }
    });

    preview.addEventListener("input", () => {
        input.value = preview.innerText.replace(/\n/g, " ").trim();
    });
});

/* Currency switcher */
function updateCurrencyDisplay() {
    document.querySelectorAll(".currencySymbol").forEach(el => {
        el.textContent = currencySymbol();
    });
    updateTotals();
}

$("currency").addEventListener("change", () => {
    updateCurrencyDisplay();
    setStatus("Currency display changed. Prices have not been converted.");
});

/* Budget */
$("budget").addEventListener("input", updateTotals);

/* Saving and loading lists */
function setStatus(message) {
    $("status").textContent = message;
}

function getSavedLists() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function putSavedLists(lists) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
        return true;
    } catch (error) {
        console.error(error);
        setStatus("Could not save. Browser storage may be full or disabled.");
        return false;
    }
}

function refreshSavedLists(selectId = "") {
    const select = $("savedLists");
    const lists = getSavedLists();

    select.innerHTML = "";

    if (!lists.length) {
        select.add(new Option("No saved lists yet", ""));
    } else {
        select.add(new Option("Choose a saved list", ""));
        lists.forEach(list => {
            select.add(new Option(list.name, list.id));
        });
    }

    if (selectId && lists.some(list => list.id === selectId)) {
        select.value = selectId;
    }

    $("updateList").disabled = !select.value;
    $("deleteList").disabled = !select.value;
}

function captureList() {
    readRows();

    return {
        name: $("listName").value.trim(),
        template: selectedTemplate(),
        background: $("background").value,
        heading: $("heading").value,
        subtitle: $("subtitle").value,
        decorativeText: $("decorativeText").value,
        footerText: $("footerText").value,
        budget: $("budget").value,
        currency: $("currency").value,
        rows: rows.map(row => ({
            name: row.name,
            quantity: row.quantity,
            price: row.price
        }))
    };
}

function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

function saveList() {
    const name = $("listName").value.trim();

    if (!name) {
        $("listName").focus();
        setStatus("Enter a name for your list before saving.");
        return;
    }

    const lists = getSavedLists();
    const data = captureList();

    data.id = makeId();
    data.name = name;
    data.updatedAt = new Date().toISOString();

    lists.push(data);

    if (!putSavedLists(lists)) return;

    currentSavedId = data.id;
    refreshSavedLists(currentSavedId);
    setStatus(`"${name}" has been saved.`);
}

function updateSavedList() {
    const id = $("savedLists").value || currentSavedId;

    if (!id) {
        setStatus("Select a saved list to update.");
        return;
    }

    const lists = getSavedLists();
    const index = lists.findIndex(list => list.id === id);

    if (index < 0) {
        setStatus("That saved list could not be found.");
        refreshSavedLists();
        return;
    }

    const data = captureList();
    data.id = id;
    data.name = $("listName").value.trim() || lists[index].name;
    data.updatedAt = new Date().toISOString();

    lists[index] = data;

    if (!putSavedLists(lists)) return;

    currentSavedId = id;
    refreshSavedLists(id);
    setStatus(`"${data.name}" has been updated.`);
}

function loadSavedList() {
    const id = $("savedLists").value;

    if (!id) {
        setStatus("Choose a saved list to load.");
        return;
    }

    const data = getSavedLists().find(list => list.id === id);

    if (!data) {
        setStatus("Saved list not found.");
        refreshSavedLists();
        return;
    }

    currentSavedId = data.id;

    $("listName").value = data.name || "";
    $("template").value = DEFAULTS[data.template] ? data.template : "original";
    $("background").value = data.background || DEFAULTS[$("template").value].background;
    $("heading").value = data.heading || "Shopping List";
    $("subtitle").value = data.subtitle || "";
    $("decorativeText").value = data.decorativeText || "";
    $("footerText").value = data.footerText || "";
    $("budget").value = data.budget ?? "";
    $("currency").value = CURRENCIES[data.currency] ? data.currency : "NGN";

    $("previewHeading").textContent = $("heading").value;
    $("previewSubtitle").textContent = $("subtitle").value;
    $("previewDecorative").innerHTML = formatDecorativeText($("decorativeText").value);
    $("previewFooter").textContent = $("footerText").value;

    rows = (Array.isArray(data.rows) ? data.rows : []).map(row => ({
        id: nextId++,
        name: row.name || "",
        quantity: row.quantity || "",
        price: row.price ?? ""
    }));

    applyTemplate($("template").value, false);
    updateCurrencyDisplay();
    renderRows();
    refreshSavedLists(id);
    setStatus(`"${data.name}" has been loaded.`);
}

function deleteSavedList() {
    const id = $("savedLists").value;

    if (!id) {
        setStatus("Choose a saved list to delete.");
        return;
    }

    const lists = getSavedLists();
    const selected = lists.find(list => list.id === id);
    const remaining = lists.filter(list => list.id !== id);

    if (!putSavedLists(remaining)) return;

    if (currentSavedId === id) currentSavedId = "";

    refreshSavedLists();
    setStatus(`"${selected?.name || "List"}" has been deleted.`);
}

$("saveList").addEventListener("click", saveList);
$("updateList").addEventListener("click", updateSavedList);
$("loadList").addEventListener("click", loadSavedList);
$("deleteList").addEventListener("click", deleteSavedList);

$("savedLists").addEventListener("change", () => {
    const id = $("savedLists").value;
    $("updateList").disabled = !id;
    $("deleteList").disabled = !id;
});

/* PNG export helpers */
function drawText(ctx, text, x, y, options = {}) {
    ctx.font = options.font || "16px Arial";
    ctx.fillStyle = options.color || "#222";
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = "middle";
    ctx.fillText(String(text ?? ""), x, y, options.maxWidth);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    ctx.font = options.font || "16px Arial";
    ctx.fillStyle = options.color || "#222";
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = "middle";

    let line = "";
    let currentY = y;

    for (const word of String(text || "").split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;

        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, currentY);
            currentY += lineHeight;
            line = word;
        } else {
            line = test;
        }
    }

    if (line) ctx.fillText(line, x, currentY);
}

function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

function drawShoppingList() {
    readRows();
    const totals = updateTotals();
    const template = selectedTemplate();

    const palette = {
        background: $("background").value,
        text: template === "original" ? "#f3f6ff" :
              template === "classic" ? "#343a30" :
              template === "market" ? "#3c3024" : "#252525",
        accent: template === "original" ? "#10e6a3" :
                template === "classic" ? "#648057" :
                template === "market" ? "#c34e2d" : "#252525",
        line: template === "original" ? "#245c7b" :
              template === "classic" ? "#ded8c8" :
              template === "market" ? "#e4c99e" : "#ddd",
        head: template === "original" ? "#102632" :
              template === "classic" ? "#eee8d9" :
              template === "market" ? "#f2dfb9" : "#f4f4f4"
    };

    const title = $("previewHeading").innerText.trim() || "Shopping List";
    const subtitle = $("previewSubtitle").innerText.trim();
    const decorative = $("previewDecorative").innerText.trim();
    const footer = $("previewFooter").innerText.trim();
    const visibleRows = rows.filter(row =>
        row.name.trim() || row.quantity.trim() || row.price !== ""
    );

    const width = 1000;
    const margin = 40;
    const tableY = template === "market" ? 190 : 160;
    const headerH = 55;
    const rowH = 60;
    const totalH = 65;
    const count = Math.max(visibleRows.length, 1);
    const tableH = headerH + count * rowH + totalH;
    const showBudget = template !== "minimal";
    const budgetH = showBudget ? 100 : 0;
    const height = tableY + tableH + budgetH + (showBudget ? 100 : 25);

    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;

    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const tableX = margin;
    const tableW = width - margin * 2;
    const endX = tableX + tableW;
    const numberX = tableX;
    const itemX = tableX + 75;
    const quantityX = tableX + tableW * .53;
    const amountX = tableX + tableW * .77;

    /* Header layouts differ by template. */
    if (template === "original") {
        drawText(ctx, "🛒", margin + 35, 60, {
            font: "48px Arial", color: palette.accent, align: "center"
        });
        drawText(ctx, title, margin + 80, 50, {
            font: "bold 43px Arial", color: palette.text, maxWidth: 590
        });
        drawText(ctx, subtitle, margin + 80, 95, {
            font: "bold 18px Arial", color: palette.text, maxWidth: 590
        });
        drawText(ctx, decorative.replace(/\n/g, " "), endX, 60, {
            font: "bold 19px Georgia", color: palette.accent, align: "right",
            maxWidth: 160
        });
    } else if (template === "classic") {
        drawText(ctx, title, margin, 45, {
            font: "bold 42px Georgia", color: palette.text, maxWidth: tableW
        });
        drawText(ctx, subtitle, margin, 90, {
            font: "20px Georgia", color: palette.text, maxWidth: tableW
        });
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(margin, 125);
        ctx.lineTo(endX, 125);
        ctx.stroke();
        drawText(ctx, decorative.replace(/\n/g, " "), endX, 143, {
            font: "italic 17px Georgia", color: palette.accent, align: "right"
        });
    } else if (template === "market") {
        ctx.fillStyle = palette.head;
        roundedRect(ctx, margin, 25, tableW, 140, 14);
        ctx.fill();
        ctx.fillStyle = palette.accent;
        ctx.fillRect(margin, 158, tableW, 7);
        drawText(ctx, title, margin + 20, 60, {
            font: "bold 42px Georgia", color: palette.text, maxWidth: tableW - 40
        });
        drawText(ctx, subtitle, margin + 20, 100, {
            font: "19px Arial", color: palette.text, maxWidth: tableW - 40
        });
        drawText(ctx, decorative.replace(/\n/g, " "), margin + 20, 138, {
            font: "bold 17px Georgia", color: palette.accent
        });
    } else {
        drawText(ctx, title, margin, 55, {
            font: "bold 42px Arial", color: palette.text, maxWidth: tableW
        });
        drawText(ctx, subtitle, margin, 100, {
            font: "20px Arial", color: "#777", maxWidth: tableW
        });
        ctx.fillStyle = palette.text;
        ctx.fillRect(margin, 132, tableW, 3);
    }

    /* Table header */
    ctx.fillStyle = palette.head;
    ctx.fillRect(tableX, tableY, tableW, headerH);
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, tableY, tableW, tableH);

    drawText(ctx, "#", numberX + 37, tableY + 28, {
        font: "bold 20px Arial", color: palette.text, align: "center"
    });
    drawText(ctx, "Item", itemX + 8, tableY + 28, {
        font: "bold 20px Arial", color: palette.text
    });
    drawText(ctx, "Quantity", quantityX + 8, tableY + 28, {
        font: "bold 17px Arial", color: palette.text
    });
    drawText(ctx, `Amount (${currencySymbol()})`, endX - 10, tableY + 28, {
        font: "bold 17px Arial", color: palette.text, align: "right"
    });

    [itemX, quantityX, amountX].forEach(x => {
        ctx.beginPath();
        ct
