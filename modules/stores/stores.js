// ===============================
// Stores - App Contable
// Gestión de puntos de venta / sucursales
// ===============================

//#region Constants
const BTN_ID_CONFIRM_STORE = "btnConfirmStore";

const ID_STORES_LIST = "storesList";
const ID_STORE_CARD_TEMPLATE = "storeCardTemplate";

const ID_STORE_NAME = "storeName";
const ID_STORE_STATUS_ACTIVE = "storeStatusActive";
const ID_STORE_STATUS_INACTIVE = "storeStatusInactive";

const CHIP_STORE_ACTIVE = "active";
const CHIP_STORE_INACTIVE = "inactive";
//#endregion

// Estado de la pantalla de puntos de venta
const STORES_STATE = {
  searchText: "",
  filterDate: null,
  orderBy: "name",
  orderDir: "asc",
  chipFiltered: null, // "active" | "inactive" | null
  elementToEdit: null,
};

window.STORES_STATE = STORES_STATE;

/**
 * Hook que llama el router cuando se carga la página de puntos de venta
 * @returns {Promise<void>}
 */
async function onStoresPageLoaded() {
  console.log("onStoresPageLoaded execution");

  await loadModal(MODAL_STORES, PAGE_STORES);
  initModalModule(MODAL_STORES);

  await setupStoresControls();

  const btnConfirm = document.getElementById(BTN_ID_CONFIRM_STORE);
  if (btnConfirm) {
    btnConfirm.onclick = saveStoreFromModal;
  }

  renderStores();
}

/**
 * Configura los controles del módulo de puntos de venta
 * @returns {Promise<void>}
 */
async function setupStoresControls() {
  clearModuleControlsContent();
  showModuleControls();

  await loadModuleControl(CONTROL_SEARCH_INPUT);
  setupSearchInput(PAGE_STORES, renderStores);

  await loadModuleControl(CONTROL_BTN_ADD);
  setupBtnAdd(openAddStoreModal);

  await loadModuleControl(CONTROL_CHIPS_FILTER);
  await setupChipsFilter(PAGE_STORES, renderStores);

  await loadModuleControl(CONTROL_LIST_COUNTER);

  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  setupBtnClearFilters(PAGE_STORES, renderStores);
}

/**
 * Abre el modal para crear un punto de venta
 * @returns {void}
 */
function openAddStoreModal() {
  STORES_STATE.elementToEdit = null;
  setModalHeader(MODAL_STORES, false);
  clearStoreModalErrors();
  setInputValue(ID_STORE_NAME, "");
  setStoreStatusSelector(true);
  showModalModules();
}

/**
 * Abre el modal para editar un punto de venta
 * @param {string} id
 * @returns {void}
 */
function openEditStoreModal(id) {
  const store = getDataById(PAGE_STORES, id);
  if (!store) return;

  STORES_STATE.elementToEdit = id;
  setModalHeader(MODAL_STORES, true);
  clearStoreModalErrors();
  setInputValue(ID_STORE_NAME, store.name);
  setStoreStatusSelector(store.active !== false);
  showModalModules();
}

/**
 * Limpia errores de validación del modal
 * @returns {void}
 */
function clearStoreModalErrors() {
  clearInputErrors([ID_STORE_NAME]);
}

/**
 * Define el estado Activo/Inactivo en el selector del modal
 * @param {boolean} active
 * @returns {void}
 */
function setStoreStatusSelector(active) {
  const activeRadio = document.getElementById(ID_STORE_STATUS_ACTIVE);
  const inactiveRadio = document.getElementById(ID_STORE_STATUS_INACTIVE);
  if (activeRadio) activeRadio.checked = !!active;
  if (inactiveRadio) inactiveRadio.checked = !active;
}

/**
 * Lee si el punto de venta está marcado como activo en el modal
 * @returns {boolean}
 */
function getStoreStatusFromModal() {
  const activeRadio = document.getElementById(ID_STORE_STATUS_ACTIVE);
  return activeRadio ? activeRadio.checked : true;
}

/**
 * Guarda un punto de venta desde el modal (crear o editar)
 * @returns {void}
 */
function saveStoreFromModal() {
  const name = getInputValue(ID_STORE_NAME).trim();
  const active = getStoreStatusFromModal();

  if (!name) {
    setInputError(ID_STORE_NAME, "Ingresá un nombre");
    return;
  }

  const allStores = getData(PAGE_STORES) || [];
  const nameExists = allStores.some(
    (s) =>
      s.name.toLowerCase() === name.toLowerCase() &&
      s.id !== STORES_STATE.elementToEdit
  );
  if (nameExists) {
    setInputError(ID_STORE_NAME, "Ya existe un punto de venta con ese nombre");
    return;
  }

  if (STORES_STATE.elementToEdit) {
    const storeToEdit = getDataById(PAGE_STORES, STORES_STATE.elementToEdit);
    if (!storeToEdit) {
      setInputError(ID_STORE_NAME, "El punto de venta no existe");
      return;
    }
    setDataById(PAGE_STORES, {
      ...storeToEdit,
      name,
      active,
    });
  } else {
    setDataById(PAGE_STORES, {
      id: crypto.randomUUID(),
      name,
      active,
      createdAt: new Date().toISOString(),
    });
  }

  hideModalModules();
  renderStores();
}

/**
 * Abre el modal de confirmación para eliminar
 * @param {string} id
 * @returns {void}
 */
function openDeleteStoreModal(id) {
  const store = getDataById(PAGE_STORES, id);
  if (!store) return;

  DELETE_STATE.type = "store";
  DELETE_STATE.id = id;
  openConfirmDeleteModal("store", id, store.name);
}

/**
 * Confirma la eliminación de un punto de venta
 * @returns {void}
 */
function confirmDeleteStore() {
  if (!DELETE_STATE.id) return;

  const stores = getData(PAGE_STORES) || [];
  const deleted = stores.find((s) => s.id === DELETE_STATE.id);
  if (!deleted) return;

  UNDO_STATE.data = deleted;
  UNDO_STATE.type = PAGE_STORES;

  setData(
    PAGE_STORES,
    stores.filter((s) => s.id !== DELETE_STATE.id)
  );

  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  renderStores();
  showSnackbar("Punto de venta eliminado");
}

/**
 * Filtra puntos de venta según STORES_STATE
 * @param {Array} stores
 * @returns {Array}
 */
function filterStores(stores) {
  let filtered = [...stores];

  if (STORES_STATE.searchText) {
    const q = STORES_STATE.searchText.toLowerCase();
    filtered = filtered.filter((s) => (s.name || "").toLowerCase().includes(q));
  }

  if (STORES_STATE.chipFiltered === CHIP_STORE_ACTIVE) {
    filtered = filtered.filter((s) => s.active !== false);
  } else if (STORES_STATE.chipFiltered === CHIP_STORE_INACTIVE) {
    filtered = filtered.filter((s) => s.active === false);
  }

  return filtered;
}

/**
 * Ordena puntos de venta por nombre
 * @param {Array} stores
 * @returns {Array}
 */
function sortStores(stores) {
  return [...stores].sort((a, b) => {
    const v1 = (a.name || "").toLowerCase();
    const v2 = (b.name || "").toLowerCase();
    if (v1 < v2) return STORES_STATE.orderDir === "asc" ? -1 : 1;
    if (v1 > v2) return STORES_STATE.orderDir === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Renderiza la lista de cards
 * @param {Array} stores
 * @returns {void}
 */
function renderStoresList(stores) {
  const list = document.getElementById(ID_STORES_LIST);
  const template = document.getElementById(ID_STORE_CARD_TEMPLATE);
  if (!list || !template) return;

  list.innerHTML = "";

  if (stores.length === 0) {
    const placeholder = createEmptyStatePlaceholder("No se encontraron puntos de venta");
    if (placeholder) list.appendChild(placeholder);
    return;
  }

  stores.forEach((store) => {
    const node = template.content.cloneNode(true);
    const isActive = store.active !== false;

    const iconCircle = node.querySelector(".store-icon-circle");
    if (iconCircle) {
      iconCircle.classList.add(isActive ? "bg-success" : "bg-secondary");
    }

    const nameEl = node.querySelector(".store-name");
    if (nameEl) nameEl.textContent = store.name;

    const statusEl = node.querySelector(".store-status");
    if (statusEl) {
      statusEl.innerHTML = isActive
        ? `<i class="bi bi-check-circle text-success"></i> Activo`
        : `<i class="bi bi-dash-circle text-secondary"></i> Inactivo`;
    }

    const btnEdit = node.querySelector(".btn-edit-store");
    const btnDelete = node.querySelector(".btn-delete-store");
    if (btnEdit) btnEdit.onclick = () => openEditStoreModal(store.id);
    if (btnDelete) btnDelete.onclick = () => openDeleteStoreModal(store.id);

    list.appendChild(node);
  });
}

/**
 * Filtra, ordena y renderiza los puntos de venta
 * @returns {void}
 */
function renderStores() {
  const allStores = getData(PAGE_STORES) || [];
  const filtered = filterStores(allStores);
  const sorted = sortStores(filtered);

  updateListCounter(sorted.length, allStores.length, PAGE_STORES);
  renderStoresList(sorted);
}
