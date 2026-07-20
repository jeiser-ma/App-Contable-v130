/**
 * Módulo de exportación - App Contable
 * Funciones para exportar datos en diferentes formatos (JSON, CSV, etc.).
 */

// Claves de localStorage que forman el estado completo de la app
const APP_STATE_KEYS = [
  PAGE_PRODUCTS,
  PAGE_MOVEMENTS,
  PAGE_INVENTORY,
  PAGE_EXPENSES,
  PAGE_ACCOUNTING,
  "units",
  "expenseConcepts",
  "salaryPercentage",
  "salesPoint"
];

// ==============================================
// Utilidades internas
// ==============================================

/**
 * Descarga un string como archivo en el navegador
 * @param {string} content - Contenido del archivo
 * @param {string} filename - Nombre del archivo
 * @param {string} mimeType - Tipo MIME (ej. "application/json", "text/csv")
 */
function downloadFile(content, filename, mimeType, addBom = false) {
  const blob = new Blob([addBom ? "\uFEFF" + content : content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ==============================================
// Exportación JSON
// ==============================================

/**
 * Obtiene el estado completo de la app desde localStorage
 * @returns {Object}
 */
function getAppState() {
  const state = {};
  for (const key of APP_STATE_KEYS) {
    try {
      state[key] = getData(key);
    } catch (_) {
      state[key] = null;
    }
  }
  state._exportedAt = new Date().toISOString();
  state._appVersion = typeof APP_VERSION !== "undefined" ? APP_VERSION : "?";
  return state;
}

/**
 * Exporta el estado de la app en formato JSON
 * @param {Object} [options]
 * @param {boolean} [options.download=true] - Si true, descarga el archivo. Si false, devuelve el string.
 * @param {string} [options.filename] - Nombre del archivo (por defecto: app-state-YYYY-MM-DD.json)
 * @returns {string|void}
 */
function exportAppStateToJson(options = {}) {
  const { download = true, filename } = options;
  const state = getAppState();
  const json = JSON.stringify(state, null, 2);
  const name = filename || `app-state-${new Date().toISOString().slice(0, 10)}.json`;

  if (download) {
    downloadFile(json, name, "application/json");
  } else {
    return json;
  }
}

// ==============================================
// Exportación CSV
// ==============================================

/**
 * Convierte un array de objetos en string CSV
 * @param {Array<Object>} data - Array de objetos (ej. productos, gastos, movimientos)
 * @param {Object} [options]
 * @param {string[]} [options.columns] - Orden de columnas (keys del objeto). Si no se pasa, se usan todas las keys del primer objeto.
 * @param {Object} [options.headerMap] - Mapeo key -> cabecera legible (ej. { name: "Nombre", price: "Precio" })
 * @returns {string}
 */
function arrayToCsv(data, options = {}) {
  if (!data || data.length === 0) return "";

  const columns = options.columns || Object.keys(data[0]);
  const headerMap = options.headerMap || {};
  const headers = columns.map((col) => headerMap[col] ?? col);

  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [headers.join(",")];
  for (const obj of data) {
    rows.push(columns.map((col) => escape(obj[col])).join(","));
  }
  return rows.join("\n");
}

/**
 * Exporta un array de objetos a archivo CSV
 * @param {Array<Object>} data - Datos a exportar
 * @param {string} [filename] - Nombre del archivo (por defecto: export-YYYY-MM-DD.csv)
 * @param {Object} [options] - Opciones para arrayToCsv (columns, headerMap)
 */
function exportToCsv(data, filename, options = {}) {
  const name = filename || `export-${new Date().toISOString().slice(0, 10)}.csv`;
  const csv = arrayToCsv(data, options);
  downloadFile(csv, name, "text/csv;charset=utf-8", true);
}

/**
 * Formatea un valor numérico para CSV (0 si es null/undefined)
 * @param {*} value
 * @returns {string}
 */
function csvExportNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  const n = Number(value);
  if (Number.isNaN(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Escapa un valor para CSV
 * @param {*} val
 * @returns {string}
 */
function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Arma una fila CSV con columnas fijas (rellena vacíos al final)
 * @param {Array<*>} cells
 * @param {number} columnCount
 * @returns {string}
 */
function csvFixedRow(cells, columnCount = 8) {
  const row = cells.map((cell) => csvEscape(cell));
  while (row.length < columnCount) row.push("");
  return row.join(",");
}

/**
 * Formatea fecha ISO (yyyy-mm-dd) a d-m-yyyy sin ceros a la izquierda
 * @param {string} isoDate
 * @returns {string}
 */
function formatAccountingCsvDate(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${parseInt(day, 10)}-${parseInt(month, 10)}-${year}`;
}

/**
 * Sanitiza el punto de venta para usarlo en el nombre del archivo
 * @param {string} salesPoint
 * @returns {string}
 */
function sanitizeSalesPointForFilename(salesPoint) {
  const value = (salesPoint || "").trim();
  if (!value) return "Sin-PV";
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-");
}

/**
 * Genera cabeceras CSV cuando no hay filas de datos
 * @param {Object} headerMap
 * @returns {string}
 */
function csvHeadersOnly(headerMap) {
  return Object.values(headerMap).join(",");
}

/**
 * Exporta la contabilidad diaria a CSV según el formato acordado
 * @param {Object} accounting - Registro de contabilidad del día
 * @param {Array<Object>} productsCatalog - Catálogo de productos (para resolver nombres)
 * @returns {boolean} true si se generó la descarga
 */
function exportAccountingToCsv(accounting) {
  if (!accounting) return false;

  const salesPoint = typeof getSalesPoint === "function" ? getSalesPoint() : "";
  const isoDate = accounting.date || new Date().toISOString().slice(0, 10);
  const products = getData(PAGE_PRODUCTS) || [];
  const productsById = new Map(products.map((p) => [p.id, p]));

  const productHeaderMap = {
    producto: "Producto",
    inicio: "Inicio",
    entradas: "Entradas ",
    salidas: "Salidas ",
    final: "Final",
    ventas: "Ventas",
    precioUnitario: "Prec.Unit.",
    importe: "Importe",
  };
  const productColumns = Object.keys(productHeaderMap);
  const productRows = (accounting.products || []).map((ap) => {
    const product = productsById.get(ap.productId);
    return {
      producto: product?.name ?? ap.productId,
      inicio: csvExportNumber(ap.yesterdayStock),
      entradas: csvExportNumber(ap.yesterdayEntries),
      salidas: csvExportNumber(ap.yesterdayExits),
      final: csvExportNumber(ap.todayInventory),
      ventas: csvExportNumber(ap.sales),
      precioUnitario: csvExportNumber(ap.unitPrice),
      importe: csvExportNumber(ap.amount),
    };
  });
  const productsCsv =
    productRows.length > 0
      ? arrayToCsv(productRows, { columns: productColumns, headerMap: productHeaderMap })
      : csvHeadersOnly(productHeaderMap);

  const expenseRows = (accounting.expenses || []).map((e) =>
    csvFixedRow([e.concept ?? "", csvExportNumber(e.amount)])
  );

  // Resolver Entradas y Salidas de ayer
  const yesterday = getYesterday(accounting.date);
  const movements = getData(PAGE_MOVEMENTS) || [];
  // Entradas de ayer
  const yesterdayMovements = movements.filter(m => m.date === yesterday);
  // Entradas de ayer
  const yesterdayEntries = yesterdayMovements.filter(m => m.type === MOVEMENTS_TYPES.IN);
  const entriesRows = (yesterdayEntries || []).map((en) => {
    const product = productsById.get(en.productId);
    return csvFixedRow([product?.name ?? en.productId, csvExportNumber(en.quantity)])
  });
  // Salidas de ayer
  const yesterdayExits = yesterdayMovements.filter(m => m.type === MOVEMENTS_TYPES.OUT);
  const existsRows = (yesterdayExits || []).map((ex) => {
    const product = productsById.get(ex.productId);
    return csvFixedRow([product?.name ?? ex.productId, csvExportNumber(ex.quantity)])
  });

  const lines = [
    csvFixedRow(["Punto Venta", salesPoint]),
    csvFixedRow(["Fecha", formatAccountingCsvDate(isoDate)]),
    csvFixedRow([]),
    csvFixedRow(["CONTABILIDAD"]),
    productsCsv,
    csvFixedRow([]),
    csvFixedRow(["RESUMEN"]),
    csvFixedRow(["Total gastos", csvExportNumber(accounting.totalExpenses)]),
    csvFixedRow(["Ventas efectivo", csvExportNumber(accounting.cashSales)]),
    csvFixedRow(["Ventas transferencia", csvExportNumber(accounting.transferSales)]),
    csvFixedRow([]),
    csvFixedRow(["CIERRE"]),
    csvFixedRow(["Total ventas", csvExportNumber(accounting.totalSales)]),
    csvFixedRow(["Importe total", csvExportNumber(accounting.totalAmount)]),
    csvFixedRow(["Diferencia ", csvExportNumber(accounting.difference)]),
    csvFixedRow(["Salario vendedor", csvExportNumber(accounting.realSalary)]),
    csvFixedRow([]),
    csvFixedRow(["GASTOS"]),
    ...expenseRows,
    csvFixedRow([]),
    csvFixedRow(["ENTRADAS"]),
    ...entriesRows,
    csvFixedRow([]),
    csvFixedRow(["SALIDAS"]),
    ...existsRows,
  ];

  const pvSegment = sanitizeSalesPointForFilename(salesPoint);
  const filename = `contabilidad-PV-${pvSegment}-${isoDate}.csv`;
  downloadFile(lines.join("\n"), filename, "text/csv;charset=utf-8", true);
  return true;
}
