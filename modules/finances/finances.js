// ===============================
// Finances - App Contable
// Finanzas diarias por punto de venta
// ===============================

//#region Constants
const ID_FINANCE_STORES_LIST = "financeStoresList";
const ID_FINANCE_STORE_CARD_TEMPLATE = "financeStoreCardTemplate";
const ID_ALERT_NO_STORES = "alertNoStores";
const ID_BTN_GO_TO_STORES = "btnGoToStores";

const ID_FINANCE_INPUTS_LIST = "financeInputsList";
const ID_FINANCE_OUTPUTS_LIST = "financeOutputsList";
const ID_BTN_ADD_STORE_AMOUNT = "btnAddStoreAmount";
const ID_BTN_ADD_INPUTS_AMOUNT = "btnAddInputsAmount";
const ID_BTN_ADD_OUTPUTS_AMOUNT = "btnAddOutputsAmount";

const ID_FINANCE_DAILY_LIST = "financeDailyList";
const ID_FINANCE_GENERAL_LIST = "financeGeneralList";

const ID_BTN_EXPORT_FINANCES = "btnExportFinances";

const ID_FINANCE_AMOUNT_INPUT = "financeAmountInput";
const ID_FINANCE_AMOUNT_STORE = "financeAmountStore";
const ID_FINANCE_AMOUNT_CURRENCY = "financeAmountCurrency";
const ID_FINANCE_AMOUNT_NOTE = "financeAmountNote";
const ID_FINANCE_AMOUNT_NOTE_GROUP = "financeAmountNoteGroup";
const ID_FINANCE_AMOUNT_STORE_GROUP = "financeAmountStoreGroup";
const ID_FINANCE_AMOUNT_FLOW_CONTEXT = "financeAmountFlowContext";
const ID_FINANCE_AMOUNT_FLOW_TITLE = "financeAmountFlowTitle";
const ID_FINANCE_AMOUNT_FLOW_HINT = "financeAmountFlowHint";
const ID_BTN_CONFIRM_FINANCE_AMOUNT = "btnConfirmFinanceAmount";

const FINANCE_TARGET_STORE = "store";
const FINANCE_TARGET_INPUTS = "inputs";
const FINANCE_TARGET_OUTPUTS = "outputs";

/** Tipos de undo para ítems de flujo (no confundir con PAGE_FINANCES del día) */
const FINANCE_UNDO_INPUTS = "finance-inputs";
const FINANCE_UNDO_OUTPUTS = "finance-outputs";
//#endregion

const FINANCES_STATE = {
  searchText: "",
  filterDate: null,
  orderBy: null,
  orderDir: null,
  chipFiltered: null,
  elementToEdit: null, // id de entrada/salida en edición
  amountTarget: null, // "store" | "inputs" | "outputs"
  amountStoreId: null,
  amountCurrency: null,
};

window.FINANCES_STATE = FINANCES_STATE;

let currentFinance = null;

/**
 * Hook al cargar la página de finanzas
 * @returns {Promise<void>}
 */
async function onFinancesPageLoaded() {
  console.log("onFinancesPageLoaded execution");

  await loadModal(MODAL_FINANCES_AMOUNT, PAGE_FINANCES);
  initModalModule(MODAL_FINANCES_AMOUNT);

  await setupFinancesControls();

  const btnConfirm = document.getElementById(ID_BTN_CONFIRM_FINANCE_AMOUNT);
  if (btnConfirm) btnConfirm.onclick = saveFinanceAmountFromModal;

  const btnExport = document.getElementById(ID_BTN_EXPORT_FINANCES);
  if (btnExport) btnExport.onclick = exportCurrentFinanceToCsv;

  const btnAddStore = document.getElementById(ID_BTN_ADD_STORE_AMOUNT);
  if (btnAddStore) {
    btnAddStore.onclick = () => openFinanceAmountModal(FINANCE_TARGET_STORE);
  }

  const btnAddInputs = document.getElementById(ID_BTN_ADD_INPUTS_AMOUNT);
  if (btnAddInputs) {
    btnAddInputs.onclick = () => openFinanceAmountModal(FINANCE_TARGET_INPUTS);
  }

  const btnAddOutputs = document.getElementById(ID_BTN_ADD_OUTPUTS_AMOUNT);
  if (btnAddOutputs) {
    btnAddOutputs.onclick = () => openFinanceAmountModal(FINANCE_TARGET_OUTPUTS);
  }

  await renderFinances();
}

/**
 * Configura filtros: búsqueda, fecha, chips, clear
 * @returns {Promise<void>}
 */
async function setupFinancesControls() {
  clearModuleControlsContent();
  showModuleControls();

  await loadModuleControl(CONTROL_SEARCH_INPUT);
  setupSearchInput(PAGE_FINANCES, renderFinances);

  await loadModuleControl(CONTROL_DATE_FILTER);
  setupDateFilter(PAGE_FINANCES, renderFinances);

  await loadModuleControl(CONTROL_CHIPS_FILTER);
  await setupChipsFilter(PAGE_FINANCES, renderFinances);
  await linkDateAndChipsFilters(PAGE_FINANCES, CONTROL_DATE_FILTER);

  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  setupBtnClearFilters(PAGE_FINANCES, renderFinances);
}

//#region Currency helpers

/**
 * @param {string} key
 * @returns {string}
 */
function normalizeFinanceCurrencyKey(key) {
  return String(key || "").trim().toUpperCase();
}

/**
 * @returns {string[]}
 */
function getFinanceCurrencies() {
  let list;
  if (typeof getCurrencies === "function") {
    list = getCurrencies();
  } else {
    list = getData(STG_KEYS.CURRENCIES);
  }
  if (!Array.isArray(list) || list.length === 0) {
    list =
      typeof DEFAULT_CURRENCIES !== "undefined" ? [...DEFAULT_CURRENCIES] : ["CUP", "USD"];
  }
  return [
    ...new Set(list.map((c) => normalizeFinanceCurrencyKey(c)).filter(Boolean)),
  ];
}

/**
 * Monedas a mostrar: catálogo + extras con monto ≠ 0 en el día
 * @param {Object} [finance]
 * @returns {string[]}
 */
function getFinanceDisplayCurrencies(finance = currentFinance) {
  const catalog = getFinanceCurrencies();
  const extras = new Set();
  if (finance) {
    collectNonZeroCurrencyKeys(finance.dailyTotals, extras);
    collectNonZeroCurrencyKeys(finance.generalTotals, extras);
    (finance.stores || []).forEach((s) =>
      collectNonZeroCurrencyKeys(s.amounts, extras)
    );
    collectFlowListCurrencies(finance.inputs, extras);
    collectFlowListCurrencies(finance.outputs, extras);
  }
  const merged = [...catalog];
  extras.forEach((code) => {
    if (!merged.includes(code)) merged.push(code);
  });
  return merged;
}

/**
 * @param {Object} map
 * @param {Set<string>} target
 * @returns {void}
 */
function collectNonZeroCurrencyKeys(map, target) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return;
  Object.keys(map).forEach((k) => {
    const code = normalizeFinanceCurrencyKey(k);
    if (code && Number(map[k] || 0) !== 0) target.add(code);
  });
}

/**
 * @param {Array} list
 * @param {Set<string>} target
 * @returns {void}
 */
function collectFlowListCurrencies(list, target) {
  if (!Array.isArray(list)) return;
  list.forEach((item) => {
    const code = normalizeFinanceCurrencyKey(item?.currency);
    if (code && Number(item?.amount || 0) !== 0) target.add(code);
  });
}

/**
 * @param {string} code
 * @returns {string}
 */
function getFinanceCurrencyIcon(code) {
  const c = normalizeFinanceCurrencyKey(code);
  if (c.includes("USD")) return "bi-currency-dollar";
  if (c.includes("EUR")) return "bi-currency-euro";
  if (c.includes("TRANSFER") || c === "TRANS") return "bi-credit-card";
  return "bi-cash-stack";
}

/**
 * @param {Object} map
 * @param {string} currency
 * @returns {number}
 */
function getCurrencyAmount(map, currency) {
  const code = normalizeFinanceCurrencyKey(currency);
  if (!map || !code) return 0;
  if (Object.prototype.hasOwnProperty.call(map, code)) {
    return Number(map[code] || 0);
  }
  const found = Object.keys(map).find(
    (k) => normalizeFinanceCurrencyKey(k) === code
  );
  return found != null ? Number(map[found] || 0) : 0;
}

/**
 * @param {Object} map
 * @param {string} currency
 * @param {number} value
 * @returns {void}
 */
function setCurrencyAmount(map, currency, value) {
  if (!map) return;
  const code = normalizeFinanceCurrencyKey(currency);
  if (!code) return;
  Object.keys(map).forEach((k) => {
    if (normalizeFinanceCurrencyKey(k) === code && k !== code) delete map[k];
  });
  const rounded = roundTo2(Number(value || 0));
  if (rounded <= 0) delete map[code];
  else map[code] = rounded;
}

/**
 * @param {Object} map
 * @returns {Object}
 */
function mergeCurrencyMapKeys(map) {
  const result = {};
  if (!map || typeof map !== "object" || Array.isArray(map)) return result;
  Object.keys(map).forEach((k) => {
    const code = normalizeFinanceCurrencyKey(k);
    if (!code) return;
    result[code] = roundTo2(Number(result[code] || 0) + Number(map[k] || 0));
  });
  return result;
}

/**
 * @param {Object} map
 * @param {{allowNegative?: boolean}} [options]
 * @returns {Object}
 */
function pruneCurrencyMap(map, options = {}) {
  const allowNegative = options.allowNegative === true;
  const merged = mergeCurrencyMapKeys(map);
  const result = {};
  Object.keys(merged).forEach((code) => {
    const val = roundTo2(Number(merged[code] || 0));
    if (allowNegative ? val !== 0 : val > 0) result[code] = val;
  });
  return result;
}

//#endregion

//#region Flow lists (inputs / outputs)

/**
 * Suma montos de una lista de flujo por moneda
 * @param {Array} list
 * @param {string} currency
 * @returns {number}
 */
function sumFlowListByCurrency(list, currency) {
  const code = normalizeFinanceCurrencyKey(currency);
  if (!code || !Array.isArray(list)) return 0;
  return roundTo2(
    list.reduce((acc, item) => {
      if (normalizeFinanceCurrencyKey(item?.currency) !== code) return acc;
      return acc + Number(item?.amount || 0);
    }, 0)
  );
}

/**
 * Normaliza un ítem de entrada/salida
 * @param {Object} item
 * @returns {Object|null}
 */
function normalizeFlowItem(item) {
  if (!item || typeof item !== "object") return null;
  const currency = normalizeFinanceCurrencyKey(item.currency);
  const amount = roundTo2(Number(item.amount || 0));
  if (!currency || amount <= 0) return null;
  const note = String(item.note || "").trim();
  const normalized = {
    id: item.id || crypto.randomUUID(),
    currency,
    amount,
  };
  if (note) normalized.note = note;
  return normalized;
}

/**
 * Compacta lista de entradas/salidas (solo amount > 0)
 * @param {Array} list
 * @returns {Array}
 */
function pruneFlowList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeFlowItem).filter(Boolean);
}

/**
 * Migra outputs legado (mapa por moneda) a lista
 * @param {*} outputs
 * @returns {Array}
 */
function migrateOutputsToList(outputs) {
  if (Array.isArray(outputs)) return pruneFlowList(outputs);
  if (!outputs || typeof outputs !== "object") return [];

  const list = [];
  Object.keys(outputs).forEach((k) => {
    const currency = normalizeFinanceCurrencyKey(k);
    const raw = outputs[k];
    let amount = 0;
    let note = "";
    if (typeof raw === "number") {
      amount = Number(raw) || 0;
    } else if (raw && typeof raw === "object") {
      amount = Number(raw.amount ?? 0) || 0;
      note = typeof raw.note === "string" ? raw.note : "";
    }
    const item = normalizeFlowItem({
      id: crypto.randomUUID(),
      currency,
      amount,
      note,
    });
    if (item) list.push(item);
  });
  return list;
}

/**
 * @param {Object} amounts
 * @returns {boolean}
 */
function hasNonZeroAmounts(amounts) {
  return Object.values(amounts || {}).some((v) => Number(v || 0) !== 0);
}

//#endregion

//#region Load / save / totals

/**
 * @returns {Promise<void>}
 */
async function renderFinances() {
  await loadFinance();
  if (!currentFinance) return;

  recalculateFinanceTotals();
  saveFinance();

  renderFinanceStoresSection();
  renderFinanceFlowSection(FINANCE_TARGET_INPUTS);
  renderFinanceFlowSection(FINANCE_TARGET_OUTPUTS);
  renderFinanceTotalsSections();
}

/**
 * @returns {Promise<void>}
 */
async function loadFinance() {
  const date = FINANCES_STATE.filterDate || getToday();
  const all = getData(PAGE_FINANCES) || [];
  currentFinance = all.find((f) => f.date === date) || null;

  if (!currentFinance) {
    currentFinance = createNewFinance(date);
    saveFinance();
  } else {
    migrateFinanceRecord(currentFinance);
    syncFinanceStores(currentFinance);
  }
}

/**
 * @param {string} date
 * @returns {Object}
 */
function createNewFinance(date) {
  return {
    id: crypto.randomUUID(),
    date,
    stores: buildFinanceStoresFromCatalog(),
    inputs: [],
    outputs: [],
    dailyTotals: {},
    generalTotals: {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * @returns {Object}
 */
function emptyCurrencyTotals() {
  return {};
}

/**
 * @returns {Object}
 */
function emptyStoreAmounts() {
  return {};
}

/**
 * @returns {Array}
 */
function buildFinanceStoresFromCatalog() {
  const catalog = getData(PAGE_STORES) || [];
  return catalog
    .filter((s) => s.active !== false)
    .map((s) => ({
      storeId: s.id,
      amounts: emptyStoreAmounts(),
    }));
}

/**
 * @param {Object} finance
 * @returns {void}
 */
function syncFinanceStores(finance) {
  const catalog = getData(PAGE_STORES) || [];
  const active = catalog.filter((s) => s.active !== false);
  const byId = new Map((finance.stores || []).map((s) => [s.storeId, s]));

  active.forEach((store) => {
    if (!byId.has(store.id)) {
      byId.set(store.id, { storeId: store.id, amounts: emptyStoreAmounts() });
    }
  });

  finance.stores = Array.from(byId.values()).map((entry) => ({
    ...entry,
    amounts: pruneCurrencyMap(entry.amounts, { allowNegative: false }),
  }));
}

/**
 * @param {Object} finance
 * @returns {Object}
 */
function pruneFinanceRecord(finance) {
  if (!finance) return finance;
  finance.inputs = pruneFlowList(finance.inputs);
  finance.outputs = pruneFlowList(
    Array.isArray(finance.outputs)
      ? finance.outputs
      : migrateOutputsToList(finance.outputs)
  );
  finance.dailyTotals = pruneCurrencyMap(finance.dailyTotals, {
    allowNegative: true,
  });
  finance.generalTotals = pruneCurrencyMap(finance.generalTotals, {
    allowNegative: true,
  });
  (finance.stores || []).forEach((s) => {
    s.amounts = pruneCurrencyMap(s.amounts, { allowNegative: false });
  });
  return finance;
}

/**
 * @param {Object} finance
 * @returns {Object}
 */
function migrateFinanceRecord(finance) {
  if (!finance) return finance;
  if (!Array.isArray(finance.inputs)) finance.inputs = [];
  finance.outputs = migrateOutputsToList(finance.outputs);
  return pruneFinanceRecord(finance);
}

/**
 * @returns {void}
 */
function saveFinance() {
  if (!currentFinance) return;
  pruneFinanceRecord(currentFinance);
  setDataById(PAGE_FINANCES, currentFinance);
  refreshFutureGeneralTotals(currentFinance.date);
}

/**
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
function addCurrencyTotals(a, b) {
  const keys = new Set([
    ...Object.keys(a || {}).map(normalizeFinanceCurrencyKey),
    ...Object.keys(b || {}).map(normalizeFinanceCurrencyKey),
  ]);
  const out = {};
  keys.forEach((c) => {
    if (!c) return;
    const sum = roundTo2(getCurrencyAmount(a, c) + getCurrencyAmount(b, c));
    if (sum !== 0) out[c] = sum;
  });
  return out;
}

/**
 * @param {string} fromDate
 * @returns {void}
 */
function refreshFutureGeneralTotals(fromDate) {
  if (!fromDate) return;

  const all = getData(PAGE_FINANCES) || [];
  const future = all
    .filter((f) => f.date > fromDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (future.length === 0) return;

  let prevGeneral =
    currentFinance?.date === fromDate
      ? currentFinance.generalTotals
      : all.find((f) => f.date === fromDate)?.generalTotals;
  prevGeneral = pruneCurrencyMap(prevGeneral, { allowNegative: true });

  future.forEach((finance) => {
    migrateFinanceRecord(finance);
    const daily = finance.dailyTotals || emptyCurrencyTotals();
    finance.generalTotals = addCurrencyTotals(prevGeneral, daily);
    pruneFinanceRecord(finance);
    setDataById(PAGE_FINANCES, finance);
    prevGeneral = finance.generalTotals;

    if (currentFinance?.id === finance.id) {
      currentFinance.generalTotals = finance.generalTotals;
    }
  });
}

/**
 * TotalHoy = Σ PV + Σ Entradas − Σ Salidas
 * TotalGeneralHoy = TotalHoy + TotalGeneralAyer
 * @returns {void}
 */
function recalculateFinanceTotals() {
  if (!currentFinance) return;

  const currencies = getFinanceDisplayCurrencies(currentFinance);
  const daily = {};

  currencies.forEach((code) => {
    const sumStores = (currentFinance.stores || []).reduce(
      (acc, s) => acc + getCurrencyAmount(s.amounts, code),
      0
    );
    const sumInputs = sumFlowListByCurrency(currentFinance.inputs, code);
    const sumOutputs = sumFlowListByCurrency(currentFinance.outputs, code);
    const val = roundTo2(sumStores + sumInputs - sumOutputs);
    if (val !== 0) daily[code] = val;
  });

  currentFinance.dailyTotals = daily;

  const all = getData(PAGE_FINANCES) || [];
  const previousFinance = all
    .filter((f) => f.date < currentFinance.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop();

  let previousGeneral = emptyCurrencyTotals();
  if (previousFinance) {
    previousGeneral = pruneCurrencyMap(previousFinance.generalTotals, {
      allowNegative: true,
    });
  }

  currentFinance.generalTotals = addCurrencyTotals(
    previousGeneral,
    currentFinance.dailyTotals
  );
}

//#endregion

//#region Render UI

/**
 * @returns {void}
 */
function renderFinanceStoresSection() {
  const list = document.getElementById(ID_FINANCE_STORES_LIST);
  const template = document.getElementById(ID_FINANCE_STORE_CARD_TEMPLATE);
  const alertNoStores = document.getElementById(ID_ALERT_NO_STORES);
  if (!list || !template || !currentFinance) return;

  const catalog = getData(PAGE_STORES) || [];
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const currencies = getFinanceDisplayCurrencies(currentFinance);

  let entries = (currentFinance.stores || []).filter((entry) => {
    const store = byId.get(entry.storeId);
    if (!store) {
      if (!hasNonZeroAmounts(entry.amounts)) return false;
      if (FINANCES_STATE.searchText) {
        return entry.storeId
          .toLowerCase()
          .includes(FINANCES_STATE.searchText.toLowerCase());
      }
      return true;
    }
    if (FINANCES_STATE.searchText) {
      return store.name
        .toLowerCase()
        .includes(FINANCES_STATE.searchText.toLowerCase());
    }
    return true;
  });

  entries = entries.sort((a, b) => {
    const storeA = byId.get(a.storeId);
    const storeB = byId.get(b.storeId);
    const activeA = storeA ? storeA.active !== false : false;
    const activeB = storeB ? storeB.active !== false : false;
    if (activeA !== activeB) return activeA ? -1 : 1;
    const n1 = (storeA?.name || a.storeId || "").toLowerCase();
    const n2 = (storeB?.name || b.storeId || "").toLowerCase();
    return n1.localeCompare(n2);
  });

  if (alertNoStores) {
    const hasActive = catalog.some((s) => s.active !== false);
    alertNoStores.classList.toggle("d-none", hasActive || entries.length > 0);
    const btnGo = document.getElementById(ID_BTN_GO_TO_STORES);
    if (btnGo) btnGo.onclick = () => loadPage(PAGE_STORES);
  }

  list.replaceChildren();

  if (entries.length === 0) {
    const placeholder = createEmptyStatePlaceholder(
      FINANCES_STATE.searchText
        ? "No hay puntos de venta que coincidan con la búsqueda"
        : "No hay puntos de venta para mostrar"
    );
    if (placeholder) list.appendChild(placeholder);
    return;
  }

  entries.forEach((entry) => {
    const store = byId.get(entry.storeId);
    const isInactive = store ? store.active === false : true;
    const node = template.content.cloneNode(true);

    const nameEl = node.querySelector(".finance-store-name");
    if (nameEl) {
      nameEl.textContent = store?.name || "PV eliminado";
      if (isInactive) nameEl.classList.add("text-muted");
    }

    const badgeEl = node.querySelector(".finance-store-inactive-badge");
    if (badgeEl) {
      badgeEl.classList.toggle("d-none", !isInactive);
      badgeEl.textContent = !store ? "Eliminado" : "Inactivo";
    }

    const amountsWrap = node.querySelector(".finance-store-amounts");
    if (amountsWrap) {
      amountsWrap.replaceChildren();
      currencies.forEach((code) => {
        const div = document.createElement("div");
        const icon = document.createElement("i");
        icon.className = `bi ${getFinanceCurrencyIcon(code)} text-primary`;
        div.appendChild(icon);
        div.appendChild(document.createTextNode(` ${code} `));
        const span = document.createElement("span");
        span.textContent = formatTo2(getCurrencyAmount(entry.amounts, code));
        div.appendChild(span);
        amountsWrap.appendChild(div);
      });
    }

    list.appendChild(node);
  });
}

/**
 * Render lista de entradas o salidas
 * @param {"inputs"|"outputs"} target
 * @returns {void}
 */
function renderFinanceFlowSection(target) {
  if (!currentFinance) return;
  const isInputs = target === FINANCE_TARGET_INPUTS;
  const containerId = isInputs ? ID_FINANCE_INPUTS_LIST : ID_FINANCE_OUTPUTS_LIST;
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = isInputs
    ? currentFinance.inputs || []
    : currentFinance.outputs || [];
  const tone = isInputs ? "success" : "danger";
  const search = (FINANCES_STATE.searchText || "").toLowerCase();

  let filtered = items.slice();
  if (search) {
    filtered = filtered.filter((item) => {
      const note = String(item.note || "").toLowerCase();
      const currency = String(item.currency || "").toLowerCase();
      return note.includes(search) || currency.includes(search);
    });
  }

  filtered.sort((a, b) => {
    const c = String(a.currency || "").localeCompare(String(b.currency || ""));
    if (c !== 0) return c;
    return String(a.note || "").localeCompare(String(b.note || ""));
  });

  container.replaceChildren();

  if (filtered.length === 0) {
    const placeholder = createEmptyStatePlaceholder(
      search
        ? "No hay registros que coincidan con la búsqueda"
        : isInputs
          ? "No hay entradas registradas"
          : "No hay salidas registradas"
    );
    if (placeholder) container.appendChild(placeholder);
    return;
  }

  filtered.forEach((item) => {
    container.appendChild(buildFinanceFlowRow(item, target, tone));
  });
}

/**
 * @param {Object} item
 * @param {"inputs"|"outputs"} target
 * @param {string} toneClass
 * @returns {HTMLElement}
 */
function buildFinanceFlowRow(item, target, toneClass) {
  const card = document.createElement("div");
  card.className = "card shadow-sm";

  const body = document.createElement("div");
  body.className = "card-body py-2 px-3";

  const top = document.createElement("div");
  top.className = "d-flex justify-content-between align-items-start gap-2";

  const left = document.createElement("div");
  left.className = "flex-grow-1";
  left.style.cursor = "pointer";
  left.onclick = () => openFinanceAmountModal(target, item.id);

  const currencyLine = document.createElement("div");
  currencyLine.className = "d-flex align-items-center gap-2";
  const icon = document.createElement("i");
  icon.className = `bi ${getFinanceCurrencyIcon(item.currency)} text-${toneClass}`;
  const currencyLabel = document.createElement("span");
  currencyLabel.className = "fw-semibold";
  currencyLabel.textContent = item.currency;
  currencyLine.appendChild(icon);
  currencyLine.appendChild(currencyLabel);
  left.appendChild(currencyLine);

  if (item.note) {
    const noteEl = document.createElement("div");
    noteEl.className = "small text-muted mt-1";
    noteEl.textContent = item.note;
    left.appendChild(noteEl);
  }

  const right = document.createElement("div");
  right.className = "d-flex align-items-center gap-2";

  const amountEl = document.createElement("span");
  amountEl.className = `text-${toneClass} fw-semibold`;
  amountEl.textContent = formatTo2(item.amount);
  amountEl.style.cursor = "pointer";
  amountEl.onclick = () => openFinanceAmountModal(target, item.id);

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn btn-sm btn-link text-danger p-0";
  btnDelete.title = "Eliminar";
  btnDelete.innerHTML = '<i class="bi bi-trash"></i>';
  btnDelete.onclick = (e) => {
    e.stopPropagation();
    deleteFinanceFlowItem(target, item.id);
  };

  right.appendChild(amountEl);
  right.appendChild(btnDelete);
  top.appendChild(left);
  top.appendChild(right);
  body.appendChild(top);
  card.appendChild(body);
  return card;
}

/**
 * @returns {void}
 */
function renderFinanceTotalsSections() {
  if (!currentFinance) return;
  const d = currentFinance.dailyTotals || emptyCurrencyTotals();
  const g = currentFinance.generalTotals || emptyCurrencyTotals();
  const currencies = getFinanceDisplayCurrencies(currentFinance);

  fillFinanceTotalsList(ID_FINANCE_DAILY_LIST, d, currencies);
  fillFinanceTotalsList(ID_FINANCE_GENERAL_LIST, g, currencies);
}

/**
 * @param {string} containerId
 * @param {Object} totals
 * @param {string[]} currencies
 * @returns {void}
 */
function fillFinanceTotalsList(containerId, totals, currencies) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.replaceChildren();

  currencies.forEach((code, index) => {
    const row = document.createElement("div");
    row.className =
      "d-flex justify-content-between align-items-center" +
      (index < currencies.length - 1 ? " mb-2" : "");

    const label = document.createElement("span");
    const icon = document.createElement("i");
    icon.className = `bi ${getFinanceCurrencyIcon(code)} text-primary`;
    label.appendChild(icon);
    label.appendChild(document.createTextNode(` ${code}`));

    const value = document.createElement("span");
    value.className = "fw-semibold text-primary";
    value.textContent = formatTo2(getCurrencyAmount(totals, code));

    row.appendChild(label);
    row.appendChild(value);
    container.appendChild(row);
  });
}

//#endregion

//#region Modal / CRUD

/**
 * @param {"store"|"inputs"|"outputs"} target
 * @param {string} [editId]
 * @returns {void}
 */
function openFinanceAmountModal(target, editId = null) {
  if (!currentFinance) return;

  FINANCES_STATE.amountTarget = target;
  FINANCES_STATE.elementToEdit = editId;
  FINANCES_STATE.amountStoreId = null;
  FINANCES_STATE.amountCurrency = null;

  initModalModule(MODAL_FINANCES_AMOUNT);
  setModalHeader(MODAL_FINANCES_AMOUNT, !!editId);
  clearFinanceAmountModalErrors();

  const storeGroup = document.getElementById(ID_FINANCE_AMOUNT_STORE_GROUP);
  const flowContext = document.getElementById(ID_FINANCE_AMOUNT_FLOW_CONTEXT);
  const noteGroup = document.getElementById(ID_FINANCE_AMOUNT_NOTE_GROUP);
  const flowTitle = document.getElementById(ID_FINANCE_AMOUNT_FLOW_TITLE);
  const flowHint = document.getElementById(ID_FINANCE_AMOUNT_FLOW_HINT);
  const modalTitle = document.getElementById("financeAmountModalTitle");
  const modalIcon = document.getElementById("financeAmountModalIcon");

  const isStore = target === FINANCE_TARGET_STORE;
  const isInputs = target === FINANCE_TARGET_INPUTS;

  if (storeGroup) storeGroup.classList.toggle("d-none", !isStore);
  if (flowContext) flowContext.classList.toggle("d-none", isStore);
  if (noteGroup) noteGroup.classList.toggle("d-none", isStore);

  if (!isStore) {
    if (flowTitle) flowTitle.textContent = isInputs ? "Entradas" : "Salidas";
    if (flowHint) {
      flowHint.textContent = editId
        ? "Editá moneda, monto y concepto"
        : "Agregá moneda, monto y concepto";
    }
    if (modalTitle) {
      modalTitle.textContent = editId
        ? isInputs
          ? "Editar entrada"
          : "Editar salida"
        : isInputs
          ? "Agregar entrada"
          : "Agregar salida";
    }
    if (modalIcon) {
      modalIcon.className = isInputs
        ? "bi bi-box-arrow-in-down text-success"
        : "bi bi-box-arrow-up text-danger";
    }
  } else {
    if (modalTitle) {
      modalTitle.textContent = "Agregar monto de punto de venta";
    }
    if (modalIcon) {
      modalIcon.className = "bi bi-cash-coin text-primary";
    }
  }

  fillFinanceCurrencySelect();
  setInputValue(ID_FINANCE_AMOUNT_CURRENCY, "");
  setInputValue(ID_FINANCE_AMOUNT_INPUT, "");
  setInputValue(ID_FINANCE_AMOUNT_NOTE, "");

  if (isStore) {
    fillFinanceStoreSelect();
  } else if (editId) {
    const list = isInputs ? currentFinance.inputs : currentFinance.outputs;
    const item = (list || []).find((x) => x.id === editId);
    if (item) {
      setInputValue(ID_FINANCE_AMOUNT_CURRENCY, item.currency);
      setInputValue(ID_FINANCE_AMOUNT_INPUT, formatTo2(item.amount));
      setInputValue(ID_FINANCE_AMOUNT_NOTE, item.note || "");
    }
  }

  const currencySelect = document.getElementById(ID_FINANCE_AMOUNT_CURRENCY);
  const storeSelect = document.getElementById(ID_FINANCE_AMOUNT_STORE);
  if (currencySelect) {
    currencySelect.onchange = isStore ? fillFinanceAmountFromSelection : null;
  }
  if (storeSelect) {
    storeSelect.onchange = fillFinanceAmountFromSelection;
  }

  showModalModules();
}

/**
 * @returns {void}
 */
function fillFinanceCurrencySelect() {
  const select = document.getElementById(ID_FINANCE_AMOUNT_CURRENCY);
  if (!select) return;

  const previous = select.value;
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleccioná una moneda...";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  getFinanceCurrencies().forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    select.appendChild(option);
  });

  if (previous && getFinanceCurrencies().includes(previous)) {
    select.value = previous;
  }
}

/**
 * @returns {void}
 */
function fillFinanceStoreSelect() {
  const select = document.getElementById(ID_FINANCE_AMOUNT_STORE);
  if (!select) return;

  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Seleccioná un punto de venta...";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  const catalog = getData(PAGE_STORES) || [];
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const financeStoreIds = new Set(
    (currentFinance?.stores || []).map((s) => s.storeId)
  );

  const options = catalog
    .filter((s) => s.active !== false || financeStoreIds.has(s.id))
    .sort((a, b) => {
      const activeA = a.active !== false;
      const activeB = b.active !== false;
      if (activeA !== activeB) return activeA ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });

  options.forEach((store) => {
    const option = document.createElement("option");
    option.value = store.id;
    option.textContent =
      store.active === false ? `${store.name} (Inactivo)` : store.name;
    select.appendChild(option);
  });

  (currentFinance?.stores || []).forEach((entry) => {
    if (byId.has(entry.storeId)) return;
    const option = document.createElement("option");
    option.value = entry.storeId;
    option.textContent = "PV eliminado";
    select.appendChild(option);
  });
}

/**
 * Precarga monto de PV (solo target store)
 * @returns {void}
 */
function fillFinanceAmountFromSelection() {
  if (!currentFinance) return;
  if (FINANCES_STATE.amountTarget !== FINANCE_TARGET_STORE) return;

  const currency = normalizeFinanceCurrencyKey(
    getInputValue(ID_FINANCE_AMOUNT_CURRENCY)
  );
  const storeId = getInputValue(ID_FINANCE_AMOUNT_STORE);
  if (!currency || !storeId) {
    setInputValue(ID_FINANCE_AMOUNT_INPUT, "");
    return;
  }

  const entry = (currentFinance.stores || []).find((s) => s.storeId === storeId);
  setInputValue(
    ID_FINANCE_AMOUNT_INPUT,
    formatTo2(getCurrencyAmount(entry?.amounts, currency))
  );
}

/**
 * @returns {void}
 */
function clearFinanceAmountModalErrors() {
  clearInputErrors([
    ID_FINANCE_AMOUNT_STORE,
    ID_FINANCE_AMOUNT_CURRENCY,
    ID_FINANCE_AMOUNT_INPUT,
    ID_FINANCE_AMOUNT_NOTE,
  ]);
}

/**
 * @returns {void}
 */
function saveFinanceAmountFromModal() {
  if (!currentFinance) return;

  clearFinanceAmountModalErrors();

  const currency = normalizeFinanceCurrencyKey(
    getInputValue(ID_FINANCE_AMOUNT_CURRENCY)
  );
  const amount = parseFloat(getInputValue(ID_FINANCE_AMOUNT_INPUT));
  const target = FINANCES_STATE.amountTarget;
  const isStore = target === FINANCE_TARGET_STORE;
  const storeId = isStore ? getInputValue(ID_FINANCE_AMOUNT_STORE) : null;
  const note = getInputValue(ID_FINANCE_AMOUNT_NOTE) || "";

  if (isStore && !storeId) {
    setInputError(ID_FINANCE_AMOUNT_STORE, "Seleccioná un punto de venta");
    return;
  }

  if (!currency) {
    setInputError(ID_FINANCE_AMOUNT_CURRENCY, "Seleccioná una moneda");
    return;
  }

  const allowed = getFinanceCurrencies().map(normalizeFinanceCurrencyKey);
  if (!allowed.includes(currency)) {
    setInputError(ID_FINANCE_AMOUNT_CURRENCY, "Moneda no válida");
    return;
  }

  if (Number.isNaN(amount) || amount < 0) {
    setInputError(ID_FINANCE_AMOUNT_INPUT, "Ingresá una cantidad válida");
    return;
  }

  if (!isStore && amount <= 0) {
    setInputError(ID_FINANCE_AMOUNT_INPUT, "Ingresá una cantidad mayor a 0");
    return;
  }

  const rounded = roundTo2(amount);

  if (isStore) {
    const entry = (currentFinance.stores || []).find((s) => s.storeId === storeId);
    if (!entry) {
      setInputError(ID_FINANCE_AMOUNT_STORE, "Punto de venta no encontrado");
      return;
    }
    if (!entry.amounts) entry.amounts = emptyStoreAmounts();
    setCurrencyAmount(entry.amounts, currency, rounded);
  } else {
    const listKey =
      target === FINANCE_TARGET_INPUTS ? "inputs" : "outputs";
    if (!Array.isArray(currentFinance[listKey])) currentFinance[listKey] = [];

    const editId = FINANCES_STATE.elementToEdit;
    if (editId) {
      const idx = currentFinance[listKey].findIndex((x) => x.id === editId);
      if (idx < 0) {
        showToast("Registro no encontrado.", TOAST_COLORS.DANGER, 3);
        return;
      }
      const updated = normalizeFlowItem({
        id: editId,
        currency,
        amount: rounded,
        note,
      });
      if (!updated) return;
      currentFinance[listKey][idx] = updated;
    } else {
      const created = normalizeFlowItem({
        id: crypto.randomUUID(),
        currency,
        amount: rounded,
        note,
      });
      if (!created) return;
      currentFinance[listKey].push(created);
    }
  }

  FINANCES_STATE.elementToEdit = null;
  recalculateFinanceTotals();
  saveFinance();
  hideModalModules();
  renderFinances();
}

/**
 * Elimina una entrada o salida (con undo vía snackbar)
 * @param {"inputs"|"outputs"} target
 * @param {string} itemId
 * @returns {void}
 */
function deleteFinanceFlowItem(target, itemId) {
  if (!currentFinance || !itemId) return;
  const listKey = target === FINANCE_TARGET_INPUTS ? "inputs" : "outputs";
  const list = currentFinance[listKey] || [];
  const index = list.findIndex((x) => x.id === itemId);
  if (index < 0) return;

  const deleted = list[index];

  if (typeof UNDO_STATE !== "undefined") {
    UNDO_STATE.data = deleted;
    UNDO_STATE.type =
      target === FINANCE_TARGET_INPUTS
        ? FINANCE_UNDO_INPUTS
        : FINANCE_UNDO_OUTPUTS;
    UNDO_STATE.index = index;
  }

  currentFinance[listKey] = list.filter((x) => x.id !== itemId);
  recalculateFinanceTotals();
  saveFinance();
  renderFinances();

  if (typeof showSnackbar === "function") {
    showSnackbar(
      target === FINANCE_TARGET_INPUTS ? "Entrada eliminada" : "Salida eliminada"
    );
  }
}

/**
 * Restaura una entrada/salida eliminada (llamado desde undoDelete)
 * @param {"finance-inputs"|"finance-outputs"} undoType
 * @param {Object} item
 * @param {number} [index]
 * @returns {void}
 */
function undoFinanceFlowDelete(undoType, item, index) {
  if (!currentFinance || !item) return;
  const listKey =
    undoType === FINANCE_UNDO_INPUTS ? "inputs" : "outputs";
  if (!Array.isArray(currentFinance[listKey])) {
    currentFinance[listKey] = [];
  }

  const insertAt =
    typeof index === "number" && index >= 0
      ? Math.min(index, currentFinance[listKey].length)
      : currentFinance[listKey].length;

  currentFinance[listKey].splice(insertAt, 0, item);
  recalculateFinanceTotals();
  saveFinance();
  renderFinances();
}

/**
 * @returns {void}
 */
function exportCurrentFinanceToCsv() {
  if (!currentFinance) {
    showToast("No hay finanzas cargadas para exportar.", TOAST_COLORS.DANGER, 3);
    return;
  }

  const storesCatalog = getData(PAGE_STORES) || [];
  const currencies = getFinanceDisplayCurrencies(currentFinance);
  const ok = exportFinancesToCsv(currentFinance, storesCatalog, currencies);
  if (ok) {
    showToast("Finanzas exportadas correctamente.", TOAST_COLORS.SUCCESS, 3);
  }
}

//#endregion
