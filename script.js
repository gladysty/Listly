"use strict";


/* =================================
   ELEMENTS AND DEFAULT SETTINGS
================================= */

const $ = id => document.getElementById(id);

const paper = $("paper");
const itemsBody = $("items");

let rows = [];
let nextId = 1;

const DEFAULTS = {
    original: {
        background: "#07151b",
        text: "#f3f6ff",
        accent: "#10e6a3",
        line: "#245c7b",
        head: "#102632"
    },

    classic: {
        background: "#fffaf0",
        text: "#343a30",
        accent: "#648057",
        line: "#ded8c8",
        head: "#eee8d9"
    },

    market: {
        background: "#fff7e8",
        text: "#3c3024",
        accent: "#c34e2d",
        line: "#e4c99e",
        head: "#f2dfb9"
    },

    minimal: {
        background: "#ffffff",
        text: "#252525",
        accent: "#252525",
        line: "#dddddd",
        head: "#f4f4f4"
    }
};

const CURRENCY = "NGN";


/* =================================
   CURRENCY AND NUMBER HELPERS
================================= */

function money(value) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function numberValue(value) {
    const number = Number(value);

    return Number.isFinite(number) && number > 0
        ? number
        : 0;
}

function quantityValue(value) {
    const text = String(value ?? "").trim();

    if (!text) return 0;

    // Support fractions such as 1/2 and 3/4.
    const fraction = text.match(/^(\d+)\s*\/\s*(\d+)$/);

    if (fraction && Number(fraction[2]) !== 0) {
        return Number(fraction[1]) / Number(fraction[2]);
    }

    // Support decimal and whole quantities.
    const number = Number(text);

    if (Number.isFinite(number) && number > 0) {
        return number;
    }

    /*
      For text quantities such as "2 packs", calculate using
      the first number while preserving the text in the list.
    */
    const match = text.match(/^\s*(\d+(?:\.\d+)?)/);

    if (match) {
        return numberValue(match[1]);
    }

    return 0;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


/* =================================
   ADDING AND RENDERING ROWS
================================= */

function addRow(name = "", quantity = "", price = "") {

    const row = {
        id: nextId++,
        name,
        quantity,
        price
    };

    rows.push(row);

    renderRows();

    const input = itemsBody.querySelector(
        `tr[data-id="${row.id}"] .name-input`
    );

    if (input) {
        input.focus();
    }
}

function renderRows() {

    itemsBody.innerHTML = rows.map((row, index) => `

        <tr data-id="${row.id}">

            <td class="row-number">
                ${index + 1}
            </td>

            <td>
                <input
                    class="cell-input name-input"
                    type="text"
                    aria-label="Item name"
                    placeholder="Item name"
                    value="${escapeHTML(row.name)}"
                >
            </td>

            <td>
                <input
                    class="cell-input quantity-input"
                    type="text"
                    inputmode="decimal"
                    aria-label="Quantity"
                    placeholder="e.g. 2"
                    value="${escapeHTML(row.quantity)}"
                >
            </td>

            <td>
                <input
                    class="cell-input price-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    aria-label="Unit price"
                    placeholder="Unit price"
                    value="${escapeHTML(row.price)}"
                >

                <div class="line-amount">—</div>
            </td>

            <td class="action-col">
                <button
                    class="remove-row"
                    type="button"
                    aria-label="Remove item"
                    title="Remove item"
                >×</button>
            </td>

        </tr>

    `).join("");

    updateTotals();
}


/* =================================
   READ THE VALUES IN THE TABLE
================================= */

function readRows() {

    itemsBody.querySelectorAll("tr").forEach(tr => {

        const id = Number(tr.dataset.id);

        const row = rows.find(item => item.id === id);

        if (!row) return;

        row.name = tr.querySelector(".name-input").value;
        row.quantity = tr.querySelector(".quantity-input").value;
        row.price = tr.querySelector(".price-input").value;

    });
}


/* =================================
   CALCULATIONS
================================= */

function calculateTotal() {

    return rows.reduce((sum, row) => {

        const quantity = quantityValue(row.quantity);
        const price = numberValue(row.price);

        return sum + quantity * price;

    }, 0);
}

function updateTotals() {

    let total = 0;

    itemsBody.querySelectorAll("tr").forEach(tr => {

        const row = rows.find(
            item => item.id === Number(tr.dataset.id)
        );

        if (!row) return;

        const quantity = quantityValue(row.quantity);
        const price = numberValue(row.price);

        const amount = quantity * price;

        total += amount;

        const amountElement = tr.querySelector(".line-amount");

        if (row.quantity.trim() !== "" && row.price !== "") {
            amountElement.textContent = money(amount);
        } else {
            amountElement.textContent = "—";
        }

    });

    $("totalInside").textContent = money(total);
    $("totalOutside").textContent = money(total);

    const budgetText = $("budget").value.trim();

    const hasBudget =
        budgetText !== "" &&
        Number.isFinite(Number(budgetText)) &&
        Number(budgetText) >= 0;

    const budget = hasBudget ? Number(budgetText) : null;

    const remaining = hasBudget ? budget - total : null;

    $("budgetInside").textContent =
        hasBudget ? money(budget) : "—";

    $("remainingInside").textContent =
        hasBudget ? money(remaining) : "—";

    $("remainingOutside").textContent =
        hasBudget ? money(remaining) : "—";

    const overBudget = remaining !== null && remaining < 0;

    $("remainingInside").style.color = overBudget
        ? "#ff8277"
        : "";

    $("remainingOutside").style.color = overBudget
        ? "#b43e31"
        : "";

    return {
        total,
        hasBudget,
        budget,
        remaining
    };
}


/* =================================
   TABLE INTERACTIONS
================================= */

$("addRow").addEventListener("click", () => {
    addRow();
});

$("clearRows").addEventListener("click", () => {

    rows = [];

    renderRows();

    $("status").textContent = "All items cleared.";

});

itemsBody.addEventListener("input", () => {

    readRows();

    updateTotals();

});

itemsBody.addEventListener("click", event => {

    const button = event.target.closest(".remove-row");

    if (!button) return;

    const rowElement = button.closest("tr");

    const id = Number(rowElement.dataset.id);

    rows = rows.filter(row => row.id !== id);

    renderRows();

    $("status").textContent = "Item removed.";

});


/* =================================
   TEMPLATE SELECTION
================================= */

function selectedTemplate() {
    return $("template").value;
}

function applyTemplate(template, resetColour = true) {

    if (!DEFAULTS[template]) {
        template = "original";
    }

    paper.className = `paper ${template}`;

    if (resetColour) {
        $("background").value = DEFAULTS[template].background;
    }

    applyBackground();

    /*
      The market template uses a warm background and distinctive
      card layout. The minimalist template intentionally hides
      its decorative budget panel and footer.
    */
}

$("template").addEventListener("change", () => {

    applyTemplate(selectedTemplate(), true);

    $("status").textContent = "Template changed.";

});


/* =================================
   BACKGROUND COLOUR CUSTOMISATION
================================= */

function applyBackground() {

    paper.style.setProperty(
        "--paper-bg",
        $("background").value
    );

}

$("background").addEventListener("input", () => {

    applyBackground();

});

$("resetBackground").addEventListener("click", () => {

    const template = selectedTemplate();

    $("background").value = DEFAULTS[template].background;

    applyBackground();

    $("status").textContent =
        "The default background colour has been restored.";

});


/* =================================
   EDITABLE HEADING AND TEXT
================================= */

const textBindings = [
    ["heading", "previewHeading"],
    ["subtitle", "previewSubtitle"],
    ["decorativeText", "previewDecorative"],
    ["footerText", "previewFooter"]
];

function decorativeTextHTML(value) {

    const parts = String(value)
        .split(/\s*,\s*/)
        .map(part => escapeHTML(part));

    if (parts.length > 1) {
        return parts.join("<br>");
    }

    return escapeHTML(value);
}

textBindings.forEach(([inputId, previewId]) => {

    const input = $(inputId);
    const preview = $(previewId);

    input.addEventListener("input", () => {

        if (previewId === "previewDecorative") {
            preview.innerHTML = decorativeTextHTML(input.value);
        } else {
            preview.textContent = input.value;
        }

    });

    preview.addEventListener("input", () => {

        const value = preview.innerText
            .replace(/\n/g, " ")
            .trim();

        input.value = value;

    });

});


/* =================================
   BUDGET
================================= */

$("budget").addEventListener("input", () => {

    updateTotals();

});


/* =================================
   CANVAS DRAWING HELPERS
================================= */

function roundedRect(ctx, x, y, width, height, radius) {

    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();

    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);

    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - r,
        y + height
    );

    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - r
    );

    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);

    ctx.closePath();

}

function drawText(ctx, text, x, y, options = {}) {

    const {
        font = "16px Arial",
        color = "#222222",
        align = "left",
        maxWidth
    } = options;

    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";

    if (maxWidth) {
        ctx.fillText(String(text), x, y, maxWidth);
    } else {
        ctx.fillText(String(text), x, y);
    }

}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {

    const words = String(text).split(/\s+/);
    let line = "";
    let currentY = y;

    ctx.font = options.font || "16px Arial";
    ctx.fillStyle = options.color || "#222222";
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = "middle";

    for (const word of words) {

        const testLine = line ? `${line} ${word}` : word;

        if (ctx.measureText(testLine).width > maxWidth && line) {

            ctx.fillText(line, x, currentY);

            currentY += lineHeight;
            line = word;

        } else {

            line = testLine;

        }

    }

    if (line) {
        ctx.fillText(line, x, currentY);
    }

    return currentY;

}


/* =================================
   CREATE THE SHOPPING LIST PNG
================================= */

function drawShoppingList() {

    readRows();

    const totals = updateTotals();

    const template = selectedTemplate();

    const palette = {
        ...DEFAULTS[template],
        background: $("background").value
    };

    const title = $("previewHeading").innerText.trim() || "Shopping List";
    const subtitle = $("previewSubtitle").innerText.trim();

    const decorative = $("previewDecorative").innerText.trim();
    const footer = $("previewFooter").innerText.trim();

    const visibleRows = rows.filter(row =>
        row.name.trim() !== "" ||
        row.quantity.trim() !== "" ||
        row.price !== ""
    );

    const outputRows = visibleRows.length ? visibleRows : [];

    /*
      Portrait output gives the list a shape similar to the
      original reference design.
    */

    const width = 1000;
    const margin = 40;

    const headerHeight = template === "market" ? 175 : 160;
    const tableHeaderHeight = 55;
    const rowHeight = 60;

    const tableX = margin;
    const tableY = headerHeight;

    const tableWidth = width - margin * 2;

    const tableRows = Math.max(outputRows.length, 1);

    const tableHeight =
        tableHeaderHeight +
        tableRows * rowHeight +
        65;

    const showBudget = template !== "minimal";

    const budgetHeight = showBudget ? 100 : 0;
    const footerHeight = showBudget ? 75 : 15;

    const height =
        tableY +
        tableHeight +
        budgetHeight +
        footerHeight +
        25;

    const scale = 2;

    const canvas = document.createElement("canvas");

    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");

    ctx.scale(scale, scale);

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const textColor = palette.text;
    const accentColor = palette.accent;
    const lineColor = palette.line;
    const headerColor = palette.head;

    /* ----- TEMPLATE HEADING ----- */

    if (template === "original") {

        drawText(ctx, "🛒", margin + 35, 65, {
            font: "48px Arial",
            color: accentColor,
            align: "center"
        });

        drawText(ctx, title, margin + 80, 55, {
            font: "bold 43px Arial",
            color: textColor,
            maxWidth: 590
        });

        drawText(ctx, subtitle, margin + 80, 100, {
            font: "bold 18px Arial",
            color: textColor,
            maxWidth: 590
        });

        const noteLines = decorative.split(/\n/);

        drawText(ctx, noteLines[0] || "", width - margin, 48, {
            font: "bold 23px Georgia",
            color: accentColor,
            align: "right"
        });

        drawText(ctx, noteLines.slice(1).join(" ") || "", width - margin, 77, {
            font: "bold 20px Georgia",
            color: accentColor,
            align: "right"
        });

    } else if (template === "classic") {

        drawText(ctx, title, margin, 50, {
            font: "bold 42px Georgia",
            color: textColor,
            maxWidth: tableWidth
        });

        drawText(ctx, subtitle, margin, 95, {
            font: "20px Georgia",
            color: textColor,
            maxWidth: tableWidth
        });

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(margin, 130);
        ctx.lineTo(width - margin, 130);
        ctx.stroke();

        drawText(ctx, decorative.replace(/\n/g, " "), width - margin, 147, {
            font: "italic 16px Georgia",
            color: accentColor,
            align: "right"
        });

    } else if (template === "market") {

        ctx.fillStyle = headerColor;

        roundedRect(ctx, margin, 25, tableWidth, 130, 14);

        ctx.fill();

        ctx.fillStyle = accentColor;
        ctx.fillRect(margin, 145, tableWidth, 7);

        drawText(ctx, title, margin + 20, 65, {
            font: "bold 42px Georgia",
            color: textColor,
            maxWidth: tableWidth - 40
        });

        drawText(ctx, subtitle, margin + 20, 103, {
            font: "19px Arial",
            color: textColor,
            maxWidth: tableWidth - 40
        });

        drawText(ctx, decorative.replace(/\n/g, " "), margin + 20, 133, {
            font: "bold 17px Georgia",
            color: accentColor
        });

    } else {

        drawText(ctx, title, margin, 55, {
            font: "bold 42px Arial",
            color: textColor,
            maxWidth: tableWidth
        });

        drawText(ctx, subtitle, margin, 100, {
            font: "20px Arial",
            color: "#777777",
            maxWidth: tableWidth
        });

        ctx.fillStyle = textColor;
        ctx.fillRect(margin, 132, tableWidth, 3);

    }


    /* ----- TABLE COLUMNS ----- */

    const numberX = tableX;
    const itemX = tableX + 75;
    const quantityX = tableX + tableWidth * 0.53;
    const amountX = tableX + tableWidth * 0.77;
    const endX = tableX + tableWidth;

    const numberWidth = 75;
    const itemWidth = quantityX - itemX - 10;
    const quantityWidth = amountX - quantityX - 15;
    const amountWidth = endX - amountX;

    const headerY = tableY;
    const bodyY = tableY + tableHeaderHeight;

    /* ----- TABLE HEADER ----- */

    ctx.fillStyle = headerColor;
    ctx.fillRect(tableX, headerY, tableWidth, tableHeaderHeight);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;

    ctx.strokeRect(
        tableX,
        headerY,
        tableWidth,
        tableHeight
    );

    drawText(ctx, "#", numberX + numberWidth / 2, headerY + 28, {
        font: "bold 20px Arial",
        color: textColor,
        align: "center"
    });

    drawText(ctx, "Item", itemX + 8, headerY + 28, {
        font: "bold 20px Arial",
        color: textColor
    });

    drawText(ctx, "Quantity", quantityX + 8, headerY + 28, {
        font: "bold 17px Arial",
        color: textColor
    });

    drawText(ctx, "Amount (₦)", endX - 10, headerY + 28, {
        font: "bold 17px Arial",
        color: textColor,
        align: "right"
    });

    /* ----- TABLE VERTICAL LINES ----- */

    const boundaries = [
        itemX,
        quantityX,
        amountX
    ];

    ctx.strokeStyle = lineColor;

    boundaries.forEach(x => {

        ctx.beginPath();

        ctx.moveTo(x, headerY);
        ctx.lineTo(x, headerY + tableHeight);

        ctx.stroke();

    });

    /* ----- TABLE ROWS ----- */

    outputRows.forEach((row, index) => {

        const y = bodyY + index * rowHeight;

        if (template === "market" && index % 2 === 1) {

            ctx.fillStyle = "#f8efd9";

            ctx.fillRect(
                tableX + 1,
                y,
                tableWidth - 2,
                rowHeight
            );

        }

        ctx.strokeStyle = lineColor;

        ctx.beginPath();
        ctx.moveTo(tableX, y + rowHeight);
        ctx.lineTo(endX, y + rowHeight);
        ctx.stroke();

        const quantity = quantityValue(row.quantity);
        const price = numberValue(row.price);
        const amount = quantity * price;

        drawText(ctx, String(index + 1), numberX + numberWidth / 2, y + 30, {
            font: "bold 18px Arial",
            color: accentColor,
            align: "center"
        });

        wrapText(
            ctx,
            row.name || "",
            itemX + 8,
            y + 30,
            itemWidth - 15,
            19,
            {
                font: "bold 17px Arial",
                color: textColor
            }
        );

        drawText(
            ctx,
            row.quantity || "",
            quantityX + 8,
            y + 30,
            {
                font: "16px Arial",
                color: textColor,
                maxWidth: quantityWidth - 10
            }
        );

        drawText(
            ctx,
            row.quantity.trim() !== "" && row.price !== ""
                ? money(amount)
                : "—",
            endX - 10,
            y + 30,
            {
                font: "bold 17px Arial",
                color: textColor,
                align: "right",
                maxWidth: amountWidth - 10
            }
        );

    });

    /* ----- EMPTY LIST MESSAGE ----- */

    if (outputRows.length === 0) {

        drawText(
            ctx,
            "Your shopping list",
            width / 2,
            bodyY + 30,
            {
                font: "17px Arial",
                color: textColor,
                align: "center"
            }
        );

    }


    /* ----- TOTAL ----- */

    const totalY = bodyY + tableRows * rowHeight;

    ctx.fillStyle = palette.background;

    ctx.fillRect(
        tableX + 1,
        totalY,
        tableWidth - 2,
        65
    );

    ctx.strokeStyle = lineColor;

    ctx.beginPath();
    ctx.moveTo(tableX, totalY);
    ctx.lineTo(endX, totalY);
    ctx.stroke();

    drawText(ctx, "TOTAL", amountX - 18, totalY + 31, {
        font: "bold 24px Arial",
        color: textColor,
        align: "right"
    });

    drawText(ctx, money(totals.total), endX - 10, totalY + 31, {
        font: "bold 24px Arial",
        color: accentColor,
        align: "right",
        maxWidth: amountWidth - 10
    });


    /* ----- BUDGET PANEL ----- */

    if (showBudget) {

        const budgetY = tableY + tableHeight + 18;

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;

        roundedRect(
            ctx,
            margin,
            budgetY,
            tableWidth,
            82,
            template === "market" ? 28 : 14
        );

        ctx.stroke();

        drawText(ctx, "▣", margin + 42, budgetY + 41, {
            font: "bold 37px Arial",
            color: accentColor,
            align: "center"
        });

        ctx.beginPath();
        ctx.moveTo(margin + 90, budgetY + 12);
        ctx.lineTo(margin + 90, budgetY + 70);
        ctx.stroke();

        drawText(ctx, "Total Budget:", margin + 115, budgetY + 27, {
            font: "bold 19px Arial",
            color: textColor
        });

        drawText(ctx, "Remaining:", margin + 115, budgetY + 56, {
            font: "bold 19px Arial",
            color: textColor
        });

        const budgetValue = totals.hasBudget
            ? money(totals.budget)
            : "—";

        const remainingValue = totals.hasBudget
            ? money(totals.remaining)
            : "—";

        drawText(ctx, budgetValue, margin + 320, budgetY + 27, {
            font: "bold 19px Arial",
            color: accentColor
        });

        drawText(ctx, remainingValue, margin + 320, budgetY + 56, {
            font: "bold 19px Arial",
            color: totals.remaining < 0 ? "#ff8277" : accentColor
        });

    }


    /* ----- FOOTER ----- */

    if (showBudget) {

        const footerY = tableY + tableHeight + budgetHeight + 18;

        drawText(
            ctx,
            footer,
            width / 2,
            footerY,
            {
                font: "bold 25px Georgia",
                color: accentColor,
                align: "center",
                maxWidth: tableWidth
            }
        );

    }

    return canvas;
}


/* =================================
   DOWNLOAD PNG
================================= */

$("downloadBtn").addEventListener("click", async () => {

    const button = $("downloadBtn");

    button.disabled = true;
    button.textContent = "Preparing image...";

    $("status").textContent = "";

    try {

        const canvas = drawShoppingList();

        const blob = await new Promise((resolve, reject) => {

            canvas.toBlob(result => {

                if (result) {
                    resolve(result);
                } else {
                    reject(new Error("Could not create PNG."));
                }

            }, "image/png");

        });

        const url = URL.createObjectURL(blob);

        const title = $("heading").value.trim() || "Shopping List";

        const filename = title
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase();

        const link = document.createElement("a");

        link.href = url;
        link.download = `${filename || "shopping-list"}.png`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);

        $("status").textContent =
            "Your shopping list PNG is ready.";

    } catch (error) {

        console.error("PNG export error:", error);

        $("status").textContent =
            "The image could not be downloaded. Please try again in Chrome.";

    } finally {

        button.disabled = false;
        button.textContent = "↓ Download PNG";

    }

});


/* =================================
   INITIALISE THE WEBSITE
================================= */

// Start with Template 1 and its original background.
$("template").value = "original";

$("background").value = DEFAULTS.original.background;

applyTemplate("original", false);

// The template starts blank: no example items or prices.
rows = [];

renderRows();