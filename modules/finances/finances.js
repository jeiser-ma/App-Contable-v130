// ===============================
// Finances - App Contable
// Finanzas diarias por punto de venta
// ===============================

//#region Constants
const ID_FINANCE_STORES_LIST = "financeStoresList";
const ID_FINANCE_STORE_CARD_TEMPLATE = "financeStoreCardTemplate";
const ID_ALERT_NO_STORES = "alertNoStores";
const ID_BTN_GO_TO_STORES = "btnGoToStores";

const ID_FINANCE_OUTPUTS_CUP = "financeOutputsCup";
const ID_FINANCE_OUTPUTS_USD = "financeOutputsUsd";
const ID_FINANCE_OUTPUTS_TRANSFER = "financeOutputsTransfer";
const ID_BTN_ADD_STORE_AMOUNT = "btnAddStoreAmount";
const ID_BTN_ADD_OUTPUTS_AMOUNT = "btnAddOutputsAmount";

const ID_FINANCE_DAILY_CUP = "financeDailyCup";
const ID_FINANCE_DAILY_USD = "financeDailyUsd";
const ID_FINANCE_DAILY_TRANSFER = "financeDailyTransfer";

const ID_FINANCE_GENERAL_CUP = "financeGeneralCup";
const ID_FINANCE_GENERAL_USD = "financeGeneralUsd";
const ID_FINANCE_GENERAL_TRANSFER = "financeGeneralTransfer";

const ID_BTN_EXPORT_FINANCES = "btnExportFinances";

const ID_FINANCE_AMOUNT_INPUT = "financeAmountInput";
const ID_FINANCE_AMOUNT_STORE = "financeAmountStore";
const ID_FINANCE_AMOUNT_CURRENCY = "financeAmountCurrency";
const ID_FINANCE_AMOUNT_STORE_GROUP = "financeAmountStoreGroup";
const ID_FINANCE_AMOUNT_OUTPUTS_CONTEXT = "financeAmountOutputsContext";
const ID_BTN_CONFIRM_FINANCE_AMOUNT = "btnConfirmFinanceAmount";

/** Monedas: amountKey (stores) / totalKey (outputs, totals) / label UI */
const FINANCE_CURRENCIES = [
  { amountKey: "CUP", totalKey: "cup", label: "CUP" },
  { amountKey: "USD", totalKey: "usd", label: "USD" },
  { amountKey: "TRANSFER", totalKey: "transfer", label: "TRANSF" },
];

const FINANCE_TARGET_STORE = "store";
const FINANCE_TARGET_OUTPUTS = "outputs";
//#endregion

const FINANCES_STATE = {
  searchText: "",
  filterDate: null,
  orderBy: null,
  orderDir: null,
  chipFiltered: null,
  elementToEdit: null,
  /** Contexto del modal de monto */
  amountTarget: null, // "store" | "outputs"
  amountStoreId: null,
  amountCurrency: null, // "CUP" | "USD" | "TRANSFER"
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
  if (btnAddStore) btnAddStore.onclick = () => openFinanceAmountModal(FINANCE_TARGET_STORE);

  const btnAddOutputs = document.getElementById(ID_BTN_ADD_OUTPUTS_AMOUNT);
  if (btnAddOutputs) btnAddOutputs.onclick = () => openFinanceAmountModal(FINANCE_TARGET_OUTPUTS);

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

/**
 * Render principal
 * @returns {Promise<void>}
 */
async function renderFinances() {
  await loadFinance();
  if (!currentFinance) return;

  recalculateFinanceTotals();
  saveFinance();

  renderFinanceStoresSection();
  renderFinanceOutputsSection();
  renderFinanceTotalsSections();
}

/**
 * Carga o crea la finanza del día filtrado
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
    syncFinanceStores(currentFinance);
  }
}

/**
 * Crea un registro de finanza vacío para la fecha
 * @param {string} date
 * @returns {Object}
 */
function createNewFinance(date) {
  return {
    id: crypto.randomUUID(),
    date,
    stores: buildFinanceStoresFromCatalog(),
    outputs: emptyCurrencyTotals(),
    dailyTotals: emptyCurrencyTotals(),
    generalTotals: emptyCurrencyTotals(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Totales en cero (cup/usd/transfer)
 * @returns {{cup:number,usd:number,transfer:number}}
 */
function emptyCurrencyTotals() {
  return { cup: 0, usd: 0, transfer: 0 };
}

/**
 * Montos de store en cero (CUP/USD/TRANSFER)
 * @returns {{CUP:number,USD:number,TRANSFER:number}}
 */
function emptyStoreAmounts() {
  return { CUP: 0, USD: 0, TRANSFER: 0 };
}

/**
 * Arma entradas de stores activos para una finanza nueva
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
 * Asegura que todos los PV activos estén en el registro del día
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

  finance.stores = Array.from(byId.values());
}

/**
 * Persiste currentFinance y propaga totales generales a días posteriores
 * @returns {void}
 */
function saveFinance() {
  if (!currentFinance) return;
  setDataById(PAGE_FINANCES, currentFinance);
  refreshFutureGeneralTotals(currentFinance.date);
}

/**
 * Suma dos objetos de totales por moneda (cup/usd/transfer)
 * @param {Object} a
 * @param {Object} b
 * @returns {{cup:number,usd:number,transfer:number}}
 */
function addCurrencyTotals(a, b) {
  const left = a || emptyCurrencyTotals();
  const right = b || emptyCurrencyTotals();
  return {
    cup: roundTo2(Number(left.cup || 0) + Number(right.cup || 0)),
    usd: roundTo2(Number(left.usd || 0) + Number(right.usd || 0)),
    transfer: roundTo2(Number(left.transfer || 0) + Number(right.transfer || 0)),
  };
}

/**
 * Recalcula generalTotals de todos los días posteriores a fromDate
 * Cadena: general(día) = general(día anterior) + daily(día)
 * @param {string} fromDate - Fecha del día recién guardado
 * @returns {void}
 */
function refreshFutureGeneralTotals(fromDate) {
  if (!fromDate) return;

  const all = getData(PAGE_FINANCES) || [];
  const future = all
    .filter((f) => f.date > fromDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (future.length === 0) return;

  // Punto de partida: generalTotals del día guardado
  let prevGeneral =
    currentFinance?.date === fromDate
      ? currentFinance.generalTotals
      : all.find((f) => f.date === fromDate)?.generalTotals;
  prevGeneral = prevGeneral || emptyCurrencyTotals();

  future.forEach((finance) => {
    const daily = finance.dailyTotals || emptyCurrencyTotals();
    // Si hay hueco de fechas, usamos el general del último día recalculado
    // (equivalente a sumar 0 en los días sin registro)
    finance.generalTotals = addCurrencyTotals(prevGeneral, daily);
    setDataById(PAGE_FINANCES, finance);
    prevGeneral = finance.generalTotals;

    // Si el usuario está viendo ese día, mantener memoria al día
    if (currentFinance?.id === finance.id) {
      currentFinance.generalTotals = finance.generalTotals;
    }
  });
}

/**
 * Recalcula dailyTotals y generalTotals del día actual
 * daily = suma PV - salidas
 * general = general(ayer) + daily(hoy)  → acumulado verdadero
 * @returns {void}
 */
function recalculateFinanceTotals() {
  if (!currentFinance) return;

  const outputs = currentFinance.outputs || emptyCurrencyTotals();
  const daily = emptyCurrencyTotals();

  FINANCE_CURRENCIES.forEach(({ amountKey, totalKey }) => {
    const sumStores = (currentFinance.stores || []).reduce(
      (acc, s) => acc + Number(s.amounts?.[amountKey] || 0),
      0
    );
    daily[totalKey] = roundTo2(sumStores - Number(outputs[totalKey] || 0));
  });

  currentFinance.dailyTotals = daily;

  // Acumulado: general del último día anterior con registro + daily de hoy
  // (si no hay día previo, general = daily)
  const all = getData(PAGE_FINANCES) || [];
  const previousFinance = all
    .filter((f) => f.date < currentFinance.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop();
  const previousGeneral = previousFinance?.generalTotals || emptyCurrencyTotals();

  currentFinance.generalTotals = addCurrencyTotals(previousGeneral, daily);
}

/**
 * Render cards de puntos de venta (filtradas por búsqueda)
 * Incluye PV inactivos si ya tienen datos en la finanza del día
 * @returns {void}
 */
function renderFinanceStoresSection() {
  const list = document.getElementById(ID_FINANCE_STORES_LIST);
  const template = document.getElementById(ID_FINANCE_STORE_CARD_TEMPLATE);
  const alertNoStores = document.getElementById(ID_ALERT_NO_STORES);
  if (!list || !template || !currentFinance) return;

  const catalog = getData(PAGE_STORES) || [];
  const byId = new Map(catalog.map((s) => [s.id, s]));

  let entries = (currentFinance.stores || []).filter((entry) => {
    const store = byId.get(entry.storeId);
    // Sin catálogo: solo mostrar si hay montos (PV eliminado del todo)
    if (!store) {
      const amounts = entry.amounts || {};
      const hasAmounts =
        Number(amounts.CUP || 0) !== 0 ||
        Number(amounts.USD || 0) !== 0 ||
        Number(amounts.TRANSFER || 0) !== 0;
      if (!hasAmounts) return false;
      if (FINANCES_STATE.searchText) {
        return entry.storeId.toLowerCase().includes(FINANCES_STATE.searchText.toLowerCase());
      }
      return true;
    }

    // Activos siempre; inactivos solo si ya están en esta finanza (histórico)
    // (todos los de currentFinance.stores ya están "registrados" en el día)
    if (FINANCES_STATE.searchText) {
      return store.name.toLowerCase().includes(FINANCES_STATE.searchText.toLowerCase());
    }
    return true;
  });

  // Activos primero, luego inactivos; ambos por nombre
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
    const hasListed = entries.length > 0;
    // Solo alertar si no hay nada que mostrar y tampoco hay activos para agregar
    alertNoStores.classList.toggle("d-none", hasActive || hasListed);
    const btnGo = document.getElementById(ID_BTN_GO_TO_STORES);
    if (btnGo) {
      btnGo.onclick = () => loadPage(PAGE_STORES);
    }
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
      if (!store) badgeEl.textContent = "Eliminado";
      else badgeEl.textContent = "Inactivo";
    }

    const cupEl = node.querySelector(".finance-store-cup");
    const usdEl = node.querySelector(".finance-store-usd");
    const transferEl = node.querySelector(".finance-store-transfer");
    if (cupEl) cupEl.textContent = formatTo2(entry.amounts?.CUP || 0);
    if (usdEl) usdEl.textContent = formatTo2(entry.amounts?.USD || 0);
    if (transferEl) transferEl.textContent = formatTo2(entry.amounts?.TRANSFER || 0);

    list.appendChild(node);
  });
}

/**
 * Render montos de salidas
 * @returns {void}
 */
function renderFinanceOutputsSection() {
  if (!currentFinance) return;
  const o = currentFinance.outputs || emptyCurrencyTotals();
  setLabelText(ID_FINANCE_OUTPUTS_CUP, formatTo2(o.cup));
  setLabelText(ID_FINANCE_OUTPUTS_USD, formatTo2(o.usd));
  setLabelText(ID_FINANCE_OUTPUTS_TRANSFER, formatTo2(o.transfer));
}

/**
 * Render totales diarios y generales
 * @returns {void}
 */
function renderFinanceTotalsSections() {
  if (!currentFinance) return;
  const d = currentFinance.dailyTotals || emptyCurrencyTotals();
  const g = currentFinance.generalTotals || emptyCurrencyTotals();

  setLabelText(ID_FINANCE_DAILY_CUP, formatTo2(d.cup));
  setLabelText(ID_FINANCE_DAILY_USD, formatTo2(d.usd));
  setLabelText(ID_FINANCE_DAILY_TRANSFER, formatTo2(d.transfer));

  setLabelText(ID_FINANCE_GENERAL_CUP, formatTo2(g.cup));
  setLabelText(ID_FINANCE_GENERAL_USD, formatTo2(g.usd));
  setLabelText(ID_FINANCE_GENERAL_TRANSFER, formatTo2(g.transfer));
}

/**
 * Abre el modal para agregar/editar un monto
 * @param {"store"|"outputs"} target
 * @returns {void}
 */
function openFinanceAmountModal(target) {
  if (!currentFinance) return;

  FINANCES_STATE.amountTarget = target;
  FINANCES_STATE.amountStoreId = null;
  FINANCES_STATE.amountCurrency = null;

  initModalModule(MODAL_FINANCES_AMOUNT);
  setModalHeader(MODAL_FINANCES_AMOUNT, false);
  clearFinanceAmountModalErrors();

  const storeGroup = document.getElementById(ID_FINANCE_AMOUNT_STORE_GROUP);
  const outputsContext = document.getElementById(ID_FINANCE_AMOUNT_OUTPUTS_CONTEXT);
  const isStore = target === FINANCE_TARGET_STORE;

  if (storeGroup) storeGroup.classList.toggle("d-none", !isStore);
  if (outputsContext) outputsContext.classList.toggle("d-none", isStore);

  if (isStore) {
    fillFinanceStoreSelect();
  }

  setInputValue(ID_FINANCE_AMOUNT_CURRENCY, "");
  setInputValue(ID_FINANCE_AMOUNT_INPUT, "");

  const currencySelect = document.getElementById(ID_FINANCE_AMOUNT_CURRENCY);
  const storeSelect = document.getElementById(ID_FINANCE_AMOUNT_STORE);
  if (currencySelect) {
    currencySelect.onchange = fillFinanceAmountFromSelection;
  }
  if (storeSelect) {
    storeSelect.onchange = fillFinanceAmountFromSelection;
  }

  showModalModules();
}

/**
 * Llena el select de puntos de venta activos
 * @returns {void}
 */
/**
 * Llena el select de puntos de venta: activos + inactivos ya presentes en la finanza
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
  const financeStoreIds = new Set((currentFinance?.stores || []).map((s) => s.storeId));

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

  // PV eliminados del catálogo pero con datos en la finanza
  (currentFinance?.stores || []).forEach((entry) => {
    if (byId.has(entry.storeId)) return;
    const option = document.createElement("option");
    option.value = entry.storeId;
    option.textContent = "PV eliminado";
    select.appendChild(option);
  });
}

/**
 * Precarga la cantidad actual según PV + moneda (o solo moneda en Salidas)
 * @returns {void}
 */
function fillFinanceAmountFromSelection() {
  if (!currentFinance) return;

  const currency = getInputValue(ID_FINANCE_AMOUNT_CURRENCY);
  if (!currency) {
    setInputValue(ID_FINANCE_AMOUNT_INPUT, "");
    return;
  }

  const currencyMeta = FINANCE_CURRENCIES.find((c) => c.amountKey === currency);
  if (!currencyMeta) return;

  let currentValue = 0;
  if (FINANCES_STATE.amountTarget === FINANCE_TARGET_STORE) {
    const storeId = getInputValue(ID_FINANCE_AMOUNT_STORE);
    if (!storeId) {
      setInputValue(ID_FINANCE_AMOUNT_INPUT, "");
      return;
    }
    const entry = (currentFinance.stores || []).find((s) => s.storeId === storeId);
    currentValue = entry?.amounts?.[currency] ?? 0;
  } else {
    currentValue = currentFinance.outputs?.[currencyMeta.totalKey] ?? 0;
  }

  setInputValue(ID_FINANCE_AMOUNT_INPUT, formatTo2(currentValue));
}

/**
 * Limpia errores de validación del modal de montos
 * @returns {void}
 */
function clearFinanceAmountModalErrors() {
  clearInputErrors([
    ID_FINANCE_AMOUNT_STORE,
    ID_FINANCE_AMOUNT_CURRENCY,
    ID_FINANCE_AMOUNT_INPUT,
  ]);
}

/**
 * Guarda el monto del modal
 * @returns {void}
 */
function saveFinanceAmountFromModal() {
  if (!currentFinance) return;

  clearFinanceAmountModalErrors();

  const currency = getInputValue(ID_FINANCE_AMOUNT_CURRENCY);
  const amount = parseFloat(getInputValue(ID_FINANCE_AMOUNT_INPUT));
  const isStore = FINANCES_STATE.amountTarget === FINANCE_TARGET_STORE;
  const storeId = isStore ? getInputValue(ID_FINANCE_AMOUNT_STORE) : null;

  if (isStore && !storeId) {
    setInputError(ID_FINANCE_AMOUNT_STORE, "Seleccioná un punto de venta");
    return;
  }

  if (!currency) {
    setInputError(ID_FINANCE_AMOUNT_CURRENCY, "Seleccioná una moneda");
    return;
  }

  if (Number.isNaN(amount) || amount < 0) {
    setInputError(ID_FINANCE_AMOUNT_INPUT, "Ingresá una cantidad válida");
    return;
  }

  const rounded = roundTo2(amount);
  const currencyMeta = FINANCE_CURRENCIES.find((c) => c.amountKey === currency);
  if (!currencyMeta) return;

  if (isStore) {
    const entry = (currentFinance.stores || []).find((s) => s.storeId === storeId);
    if (!entry) {
      setInputError(ID_FINANCE_AMOUNT_STORE, "Punto de venta no encontrado");
      return;
    }
    if (!entry.amounts) entry.amounts = emptyStoreAmounts();
    entry.amounts[currency] = rounded;
  } else {
    if (!currentFinance.outputs) currentFinance.outputs = emptyCurrencyTotals();
    currentFinance.outputs[currencyMeta.totalKey] = rounded;
  }

  recalculateFinanceTotals();
  saveFinance();
  hideModalModules();
  renderFinances();
}

/**
 * Exporta la finanza del día visible a CSV
 * @returns {void}
 */
function exportCurrentFinanceToCsv() {
  if (!currentFinance) {
    showToast("No hay finanzas cargadas para exportar.", TOAST_COLORS.DANGER, 3);
    return;
  }

  const storesCatalog = getData(PAGE_STORES) || [];
  const ok = exportFinancesToCsv(currentFinance, storesCatalog);
  if (ok) {
    showToast("Finanzas exportadas correctamente.", TOAST_COLORS.SUCCESS, 3);
  }
}
