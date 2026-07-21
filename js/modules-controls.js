// ===============================
// Module Controls - App Contable
// Controla la visibilidad y configuración de los controles del módulo
// ===============================

let currentModule = null;

// Configuración centralizada por módulo
const MODULES_CONFIG = {
  products: {
    searchPlaceholder: "Buscar producto...",
    hasSort: true,
    sortOptions: [
      { value: "name", label: "Nombre" },
      { value: "price", label: "Precio" },
      { value: "quantity", label: "Cantidad" },
    ],
    hasChips: true,
    hasDateFilter: false,
    counterLabel: "productos",
    stateName: "PRODUCTS_STATE",
    renderFunction: "renderProducts",
    openModalFunction: "openAddProductModal",
    addButtonId: "btnAddProduct",
    addButtonTitle: "Agregar producto",
    chips: [
      {
        id: "filterLowStock",
        label: "Stock bajo",
        icon: "bi-box",
        colorClass: "btn-outline-warning",
        filterKey: "filterStockStatus",
        filterValue: "low",
      },
      {
        id: "filterCriticalStock",
        label: "Stock crítico",
        icon: "bi-box",
        colorClass: "btn-outline-danger",
        filterKey: "filterStockStatus",
        filterValue: "critical",
      },
    ]
  },
  expenses: {
    searchPlaceholder: "Buscar gasto...",
    hasSort: true,
    sortOptions: [
      { value: "concept", label: "Concepto" },
      { value: "date", label: "Fecha" },
    ],
    hasChips: false,
    hasDateFilter: true,
    counterLabel: "gastos",
    stateName: "EXPENSES_STATE",
    renderFunction: "renderExpenses",
    openModalFunction: "openAddExpenseModal",
    addButtonId: "btnAddExpense",
    addButtonTitle: "Agregar gasto",
    chips: []
  },
  movements: {
    searchPlaceholder: "Buscar producto...",
    hasSort: false,
    sortOptions: [],
    hasChips: true,
    hasDateFilter: true,
    counterLabel: "movimientos",
    stateName: "MOVEMENTS_STATE",
    renderFunction: "renderMovements",
    openModalFunction: "openAddMovementModal",
    addButtonId: "btnAddMovement",
    addButtonTitle: "Agregar movimiento",
    chips: [
      {
        id: "filterIn",
        label: "Entradas",
        icon: null,
        colorClass: "success",
        filterKey: "filterType",
        filterValue: MOVEMENTS_TYPES.IN,
      },
      {
        id: "filterOut",
        label: "Salidas",
        icon: null,
        colorClass: "danger",
        filterKey: "filterType",
        filterValue: MOVEMENTS_TYPES.OUT,
      },
    ]
  },
  inventory: {
    searchPlaceholder: "Buscar producto...",
    hasSort: false,
    sortOptions: [],
    hasChips: false,
    hasDateFilter: true,
    counterLabel: "inventarios",
    stateName: "INVENTORY_STATE",
    renderFunction: "renderInventory",
    openModalFunction: null, // No hay botón de agregar, se abre desde las cards
    addButtonId: null,
    addButtonTitle: null,
    chips: []
  }
};

/**
 * Oculta los controles del módulo
 * @returns {void}
 */
function hideModuleControls() {
  const controls = document.getElementById(ID_MODULES_CONTROLS_CONTAINER);
  if (controls) {
    controls.classList.add("d-none");
  }
  currentModule = null;
}

/**
 * Oculta los controles del módulo
 * @returns {void}
 */
function showModuleControls() {
  const controls = document.getElementById(ID_MODULES_CONTROLS_CONTAINER);
  if (controls) {
    controls.classList.remove("d-none");
  }
  currentModule = null;
}

/**
 * Limpia el contenido de los controles del módulo
 * @returns {void}
 */
function clearModuleControlsContent() {
  const controls = document.getElementById(ID_MODULES_CONTROLS_CONTAINER);

  const row1 = document.getElementById(ID_CONTAINER_SEARCH_INPUT_BTN_ADD);
  const row2 = document.getElementById(ID_CONTAINER_DATE_FILTER_ORDER_BY);
  const row3 = document.getElementById(ID_CONTAINER_CHIPS_FILTER);
  const row4 = document.getElementById(ID_CONTAINER_LIST_COUNTER_BTN_CLEAR_FILTERS);

  if (row1) {
    row1.innerHTML = "";
  }
  if (row2) {
    row2.innerHTML = "";
  }
  if (row3) {
    row3.innerHTML = "";
  }
  if (row4) {
    row4.innerHTML = "";
  }
}


// DEPRECATED
/**
 * Configura y muestra los controles del módulo
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @returns {void}
 */
async function setupModuleControls(moduleName) { // DEPRECATED
  const config = MODULES_CONFIG[moduleName];
  if (!config) {
    console.error(`Configuración no encontrada para el módulo: ${moduleName}`);
    return;
  }

  currentModule = moduleName;

  // Verificar que el estado del módulo esté disponible
  const state = window[config.stateName];
  if (!state) {
    console.error(
      `Estado ${config.stateName} no encontrado para el módulo: ${moduleName}`
    );
    return;
  }

  const container = document.getElementById(ID_MODULES_CONTROLS_CONTAINER);
  if (!container) return;

  // Mostrar controles
  container.classList.remove("d-none");

  // Configurar controles
  // 1. Buscador
  setupSearchInput(moduleName, config.renderFunction);
  // 2. Botón de agregar
  setupBtnAdd(moduleName);
  // 3. Ordenamiento
  setupOrderBy(moduleName);
  // 4. Filtro de fecha
  setupDateFilter(moduleName);
  // 5. Filtros de chips
  setupChipsFilter(moduleName);
  // 6. Contador
  updateModuleCounterFromData(moduleName);
  //setupListCounter(moduleName);
  // 7. Botón de limpiar filtros
  setupBtnClearFilters(moduleName);

  // 8. Renderizar inicialmente
  callModuleRender();
}

/**
 * Obtiene el objeto de estado completo de un módulo dado su nombre
 * @param {string} moduleName - Nombre del módulo ("expenses", "inventory", "accounting", "products", "movements")
 * @returns {Object|null} - Objeto de estado del módulo o null si no se encuentra
 * @example
 * const expensesState = getModuleState("expenses"); // Retorna EXPENSES_STATE
 * const inventoryState = getModuleState("inventory"); // Retorna INVENTORY_STATE
 */
function getModuleState(moduleName) {
  // Mapeo de nombres de módulos a nombres de estados
  const stateNameMap = {
    "expenses": "EXPENSES_STATE",
    "inventory": "INVENTORY_STATE",
    "accounting": "ACCOUNTING_STATE",
    "products": "PRODUCTS_STATE",
    "movements": "MOVEMENTS_STATE",
    "stores": "STORES_STATE",
    "finances": "FINANCES_STATE",
  };

  const stateName = stateNameMap[moduleName];
  if (!stateName) {
    console.warn(`getModuleState: Módulo "${moduleName}" no encontrado`);
    return null;
  }

  const state = window[stateName];
  if (!state) {
    console.warn(`getModuleState: Estado "${stateName}" no encontrado en window`);
    return null;
  }

  return state;
}

/**
 * Obtiene un valor específico del estado del módulo actual
 * @param {string} key - Clave del estado
 * @returns {any}
 */
function getCurrentModuleStateValue(key) {
  if (!currentModule) return null;
  const config = MODULES_CONFIG[currentModule];
  if (!config) return null;

  const state = window[config.stateName];
  return state ? state[key] : null;
}

/**
 * Actualiza el estado del módulo actual
 * @param {string} key - Clave del estado
 * @param {any} value - Valor a asignar
 * @returns {void}
 */
function updateModuleState(key, value) {
  if (!currentModule) {
    console.warn("updateModuleState: currentModule is null");
    return;
  }
  const config = MODULES_CONFIG[currentModule];
  if (!config) {
    console.warn(
      `updateModuleState: config not found for module ${currentModule}`
    );
    return;
  }

  const state = window[config.stateName];
  if (state) {
    const oldValue = state[key];
    state[key] = value;
    console.log(
      `updateModuleState: ${currentModule}.${key} = ${value} (was: ${oldValue})`,
      state
    );
  } else {
    console.error(
      `updateModuleState: state ${config.stateName} not found in window`
    );
  }
}

/**
 * Llama a la función de render del módulo actual
 * @returns {void}
 */
function callModuleRender() {
  if (!currentModule) {
    console.warn("callModuleRender: currentModule is null");
    return;
  }
  const config = MODULES_CONFIG[currentModule];
  if (!config) {
    console.warn(
      `callModuleRender: config not found for module ${currentModule}`
    );
    return;
  }

  const renderFn = window[config.renderFunction];
  if (renderFn && typeof renderFn === "function") {
    console.log(
      `callModuleRender: calling ${config.renderFunction} for ${currentModule}`
    );
    renderFn();
  } else {
    console.error(
      `callModuleRender: function ${config.renderFunction} not found or not a function`
    );
  }
}

/**
 * Actualiza el contador del módulo desde los datos
 * @param {string} moduleName - Nombre del módulo
 * @returns {Object|null} - Objeto de configuración del módulo o null si no se encuentra
 */
function getModuleConfig(moduleName) {
  const config = PAGES_CONFIG[moduleName];
  if (!config) {
    console.error(`Configuración no encontrada para el módulo: ${moduleName}`);
    return null;
  }
  return config;
}