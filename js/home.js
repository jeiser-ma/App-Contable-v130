// ===============================
// Home Dashboard - App Contable
// ===============================

/**
 * Hook que llama el router cuando se carga la página de inicio
 * Calcula y muestra todas las métricas del dashboard
 * @returns {void}
 */
function onHomePageLoaded() {
  console.log("onHomePageLoaded execution");

  // Usar setTimeout para asegurar que el DOM esté completamente renderizado
  setTimeout(() => {
    updateDashboard();
    setupClickableCards();
    setupWhatsAppButton();
    updateAccountingSummary();
  }, 100);
}

/**
 * Actualiza todas las métricas del dashboard
 * @returns {void}
 */
function updateDashboard() {
  console.log("updateDashboard ejecutado");

  // Obtener datos
  const products = getData(PAGE_PRODUCTS) || [];
  const movements = getData(PAGE_MOVEMENTS) || [];
  const expenses = getData(PAGE_EXPENSES) || [];
  const inventory = getData(PAGE_INVENTORY) || [];

  console.log("Total productos:", products.length);

  // 1. Total de productos
  const totalProducts = products.length;
  updateMetric("totalProducts", totalProducts);
  console.log("totalProducts actualizado:", totalProducts);

  // 2. Productos con stock bajo
  const lowStockCount = products.filter((p) => {
    const lowThreshold = p.lowStockThreshold || 0;
    const criticalThreshold = p.criticalStockThreshold || 0;
    return p.quantity <= lowThreshold && p.quantity > criticalThreshold;
  }).length;
  updateMetric("lowStockProducts", lowStockCount);
  console.log("lowStockProducts actualizado:", lowStockCount);

  // 3. Productos con stock crítico
  const criticalStockCount = products.filter((p) => {
    const criticalThreshold = p.criticalStockThreshold || 0;
    return p.quantity <= criticalThreshold;
  }).length;
  updateMetric("criticalStockProducts", criticalStockCount);
  console.log("criticalStockProducts actualizado:", criticalStockCount);

  // 4. Total de movimientos
  const totalMovements = movements.length;
  updateMetric("totalMovements", totalMovements);

  // 5. Total de gastos (suma de todos los gastos)
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  updateMetric("accountingTotalExpenses", formatCurrency(totalExpenses));

  // 7. Valor total del inventario (suma de precio * cantidad de todos los productos)
  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.price || 0) * (p.quantity || 0),
    0
  );
  updateMetric("inventoryValue", formatCurrency(inventoryValue));

}

/**
 * Actualiza el valor de una métrica en el DOM
 * @param {string} id - ID del elemento
 * @param {string|number} value - Valor a mostrar
 * @returns {void}
 */
function updateMetric(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
    console.log(`updateMetric: ${id} = ${value}`);
  } else {
    console.warn(`updateMetric: No se encontró el elemento con id "${id}"`);
  }
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada como moneda
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Construye el texto del mensaje para WhatsApp: productos en falta (crítico) y que se están acabando (bajo).
 * @returns {string}
 */
function getWhatsAppStockMessage() {
  const products = getData(PAGE_PRODUCTS) || [];
  const critical = products.filter((p) => {
    const criticalThreshold = p.criticalStockThreshold ?? 0;
    return (p.quantity ?? 0) <= criticalThreshold;
  });
  const low = products.filter((p) => {
    const lowThreshold = p.lowStockThreshold ?? 0;
    const criticalThreshold = p.criticalStockThreshold ?? 0;
    const qty = p.quantity ?? 0;
    return qty <= lowThreshold && qty > criticalThreshold;
  });

  const bullet = "•";
  const lines = [];

  lines.push("Reporte de stock");
  lines.push("");
  lines.push(">> Productos en falta:");
  if (critical.length) critical.forEach((p) => lines.push(bullet + " " + (p.name || "Sin nombre")));
  else lines.push(bullet + " (ninguno)");
  lines.push("");
  lines.push(">> Productos que se están acabando:");
  if (low.length) low.forEach((p) => lines.push(bullet + " " + (p.name || "Sin nombre")));
  else lines.push(bullet + " (ninguno)");

  return lines.join("\n");
}

/**
 * Configura el botón Enviar por WhatsApp: abre wa.me con el mensaje para que el usuario elija el contacto.
 */
function setupWhatsAppButton() {
  const btn = document.getElementById("btnSendWhatsApp");
  if (!btn) return;
  btn.onclick = () => {
    const text = getWhatsAppStockMessage();
    const url = "https://wa.me/?text=" + encodeURIComponent(text);
    window.location.href = url;
  };
}

/**
 * Configura las cards clicables (stock bajo y crítico)
 * @returns {void}
 */
function setupClickableCards() {
  console.log("setupClickableCards ejecutado");

  const cardLowStock = document.getElementById("cardLowStock");
  const cardCriticalStock = document.getElementById("cardCriticalStock");
  const btnViewAccountingDetails = document.getElementById("btnViewAccountingDetails");

  console.log("cardLowStock:", cardLowStock);
  console.log("cardCriticalStock:", cardCriticalStock);
  console.log("btnViewAccountingDetails:", btnViewAccountingDetails);

  if (cardLowStock) {
    // Remover listener anterior si existe
    cardLowStock.removeEventListener("click", cardLowStock._clickHandler);
    cardLowStock._clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Card stock bajo clickeada");
      navigateToProductsWithFilter("low");
    };
    cardLowStock.addEventListener("click", cardLowStock._clickHandler);
  } else {
    console.error("No se encontró cardLowStock");
  }

  if (cardCriticalStock) {
    // Remover listener anterior si existe
    cardCriticalStock.removeEventListener("click", cardCriticalStock._clickHandler);
    cardCriticalStock._clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Card stock crítico clickeada");
      navigateToProductsWithFilter("critical");
    };
    cardCriticalStock.addEventListener("click", cardCriticalStock._clickHandler);
  } else {
    console.error("No se encontró cardCriticalStock");
  }

  if (btnViewAccountingDetails) {
    // Remover listener anterior si existe
    btnViewAccountingDetails.removeEventListener("click", btnViewAccountingDetails._clickHandler);
    btnViewAccountingDetails._clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Botón ver detalles clickeado");

      if (typeof loadPage === "function") {
        // Cargar la página de contabilidad
        // Por defecto se carga la contabilidad de hoy
        loadPage(PAGE_ACCOUNTING);
      }
    };
    btnViewAccountingDetails.addEventListener("click", btnViewAccountingDetails._clickHandler);
  } else {
    console.error("No se encontró btnViewAccountingDetails");
  }
}

/**
 * Navega a la página de productos con un filtro aplicado
 * @param {string} filterType - Tipo de filtro ("low" o "critical")
 * @returns {void}
 */
async function navigateToProductsWithFilter(filterType) {
  if (typeof loadPage === "function") {
    await loadPage(PAGE_PRODUCTS);

    // Activar el chip correspondiente
    const chipId = PAGES_CONFIG[PAGE_PRODUCTS].chips.find(chip => chip.value === filterType).id;
    activateChip(chipId, window.PRODUCTS_STATE);

    // Actualizar el estado del módulo con el filtro aplicado
    window.PRODUCTS_STATE.chipFiltered = filterType;

    // Renderizar productos con el filtro aplicado
    if (typeof renderProducts === "function") {
      renderProducts();
    }
  }
}

/**
 * Formatea una Date a YYYY-MM-DD usando la zona horaria local
 * @param {Date} d
 * @returns {string}
 */
function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD
 * @returns {string} Fecha de hoy
 */
function getToday() {
  return formatLocalDate(new Date());
}

/**
 * Obtiene la fecha de ayer en formato YYYY-MM-DD
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha de ayer
 */
function getYesterday(date) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * Obtiene la fecha de mañana en formato YYYY-MM-DD
 * @param {string} date - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha de mañana
 */
function getTomorrow(date) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}


/**
 * Obtiene el porcentaje de salario desde settings
 * @returns {number} Porcentaje de salario (por defecto 1.7)
 */
function getSalaryPercentage() {
  // Intentar usar la función de settings.js si está disponible
  if (typeof window.getSalaryPercentage === "function") {
    return window.getSalaryPercentage();
  }
  // Si no está disponible, leer usando getData
  const percentage = getData("salaryPercentage");
  return percentage !== null && percentage !== undefined ? percentage : 1.7;
}

/**
 * Calcula y actualiza el resumen de contabilidad del día
 * @returns {void}
 */
function updateAccountingSummary() {
  const today = getToday();
  const yesterday = getYesterday(today);

  // Obtener datos
  const allAccounting = getData("accounting") || [];
  let accounting = allAccounting.find(a => a.date === today);

  // Si no existe, crear uno nuevo
  if (!accounting) {
    accounting = createTodayAccounting(today, yesterday);
  }

  // Actualizar valores en el DOM
  updateMetric("accountingTotalAmount", formatCurrency(accounting.totalAmount || 0));
  updateMetric("accountingTotalExpenses", formatCurrency(accounting.totalExpenses || 0));
  updateMetric("accountingTotalSales", formatCurrency(accounting.totalSales || 0));

  // Calcular diferencia
  const difference = (accounting.difference);
  updateMetric("accountingDifference", formatCurrency(difference));

  // Aplicar color e icono según la diferencia
  const differenceElement = document.getElementById("accountingDifference");
  const differenceIcon = document.getElementById("accountingDifferenceIcon");

  if (differenceElement && differenceIcon) {
    // Remover clases de color anteriores
    differenceElement.classList.remove("text-success", "text-danger", "text-primary");
    differenceIcon.className = "bi";

    if (difference === 0) {
      differenceElement.classList.add("text-success");
      differenceIcon.classList.add("bi-check-circle-fill", "text-success");
    } else if (difference < 0) {
      differenceElement.classList.add("text-danger");
      differenceIcon.classList.add("bi-arrow-down-circle-fill", "text-danger");
    } else {
      differenceElement.classList.add("text-warning");
      differenceIcon.classList.add("bi-arrow-up-circle-fill", "text-warning");
    }
  }
}

/**
 * Crea un objeto de contabilidad para hoy
 * @param {string} today - Fecha de hoy en formato YYYY-MM-DD
 * @param {string} yesterday - Fecha de ayer en formato YYYY-MM-DD
 * @returns {Object} Objeto de contabilidad
 */
function createTodayAccounting(today, yesterday) {
  const products = getData(PAGE_PRODUCTS) || [];
  const movements = getData(PAGE_MOVEMENTS) || [];
  const inventory = getData(PAGE_INVENTORY) || [];
  const expenses = getData(PAGE_EXPENSES) || [];

  // Obtener contabilidad de ayer (si existe y está cerrada)
  const allAccounting = getData(PAGE_ACCOUNTING) || [];
  const yesterdayAccounting = allAccounting.find(a => a.date === yesterday && a.closed);

  const accountingProducts = products.map(product => {
    // Stock de ayer
    let yesterdayStock = product.quantity;
    if (yesterdayAccounting) {
      const yesterdayProduct = yesterdayAccounting.products.find(p => p.productId === product.id);
      if (yesterdayProduct) {
        yesterdayStock = yesterdayProduct.yesterdayStock + yesterdayProduct.yesterdayEntries - yesterdayProduct.yesterdayExits;
      }
    }

    // Entradas de ayer
    const yesterdayEntries = movements
      .filter(m => m.date === yesterday && m.type === MOVEMENTS_TYPES.IN && m.productId === product.id)
      .reduce((sum, m) => sum + m.quantity, 0);

    // Salidas de ayer
    const yesterdayExits = movements
      .filter(m => m.date === yesterday && m.type === MOVEMENTS_TYPES.OUT && m.productId === product.id)
      .reduce((sum, m) => sum + m.quantity, 0);

    // Inventario de hoy
    const todayInventory = inventory.find(inv => inv.date === today && inv.productId === product.id && inv.status === "CONFIRMED");
    let todayInventoryQty = null;
    if (todayInventory) {
      todayInventoryQty = (todayInventory.warehouseQuantity || 0) + (todayInventory.storeQuantity || 0);
    }

    // Ventas = stock ayer + entradas ayer - salidas ayer - inventario hoy
    const sales = todayInventoryQty !== null
      ? yesterdayStock + yesterdayEntries - yesterdayExits - todayInventoryQty
      : 0;

    return {
      productId: product.id,
      yesterdayStock: yesterdayStock,
      yesterdayEntries: yesterdayEntries,
      yesterdayExits: yesterdayExits,
      todayInventory: todayInventoryQty,
      sales: sales,
      unitPrice: product.price || 0,
      amount: sales * (product.price || 0)
    };
  });

  // Gastos de ayer
  const yesterdayExpenses = expenses.filter(e => e.date === yesterday);
  const totalExpenses = yesterdayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Obtener ventas de contabilidad existente (si existe)
  let cashSales = 0;
  let transferSales = 0;
  const existingAccounting = allAccounting.find(a => a.date === today);
  if (existingAccounting) {
    cashSales = existingAccounting.cashSales || 0;
    transferSales = existingAccounting.transferSales || 0;
  }

  const totalAmount = accountingProducts.reduce((sum, p) => sum + p.amount, 0);
  // Total de ventas incluye ventas en efectivo + transferencia + gastos
  const totalSales = cashSales + transferSales + totalExpenses;

  return {
    id: existingAccounting?.id || crypto.randomUUID(),
    date: today,
    products: accountingProducts,
    cashSales: cashSales,
    transferSales: transferSales,
    totalSales: totalSales,
    totalExpenses: totalExpenses,
    totalAmount: totalAmount,
    difference: totalAmount - totalSales,
    salaryPercentage: getSalaryPercentage(),
    nominalSalary: 0,
    realSalary: 0,
    closed: existingAccounting?.closed || false,
    createdAt: existingAccounting?.createdAt || new Date().toISOString(),
    closedAt: existingAccounting?.closedAt || null
  };
}

