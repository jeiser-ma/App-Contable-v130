// ===============================
// Settings - App Contable
// Gestión de unidades de medida y conceptos de gastos
// ===============================

//#region Constants
const ID_INPUT_NEW_UNIT = "inputNewUnit";
const ID_BTN_ADD_UNIT = "btnAddUnit";
const ID_UNITS_LIST = "unitsList";
const ID_UNIT_ERROR_FEEDBACK = "unitErrorFeedback";

const ID_INPUT_NEW_CONCEPT = "inputNewConcept";
const ID_BTN_ADD_CONCEPT = "btnAddConcept";
const ID_CONCEPTS_LIST = "conceptsList";
const ID_CONCEPT_ERROR_FEEDBACK = "conceptErrorFeedback";

const ID_INPUT_SALARY_PERCENTAGE = "inputSalaryPercentage";
const ID_BTN_SAVE_SALARY_PERCENTAGE = "btnSaveSalaryPercentage";
const ID_SALARY_PERCENTAGE_ERROR_FEEDBACK = "salaryPercentageErrorFeedback";

const ID_INPUT_SALES_POINT = "inputSalesPoint";
const ID_BTN_SAVE_SALES_POINT = "btnSaveSalesPoint";
const ID_SALES_POINT_ERROR_FEEDBACK = "salesPointErrorFeedback";

const STORAGE_KEY_SALES_POINT = "salesPoint";

const ID_APP_VERSION_TEXT = "appVersionText";
const ID_APP_VERSION_CONTAINER = "appVersionContainer";
const ID_APP_LAST_UPDATE_TEXT = "appLastUpdateDateText";
const ID_BTN_EXPORT_APP_STATE = "btnExportAppState";
const ID_BTN_IMPORT_APP_STATE = "btnImportAppState";
const ID_INPUT_IMPORT_APP_STATE = "inputImportAppState";
const ID_BTN_DELETE_APP_DATA_FULL = "btnDeleteAppDataFull";
const ID_BTN_RESET_APP_DATA_PRODUCTS = "btnResetAppDataProducts";

/** Claves operativas que se borran en el reset (productos se conservan con stock 0) */
const OPERATIONAL_STATE_KEYS = [
  PAGE_MOVEMENTS,
  PAGE_INVENTORY,
  PAGE_EXPENSES,
  PAGE_ACCOUNTING,
];
//#endregion

/**
 * Hook que llama el router cuando se carga la página de ajustes
 * @returns {Promise<void>}
 */
async function onSettingsPageLoaded() {
  console.log("onSettingsPageLoaded execution");

  // Cargar modal de confirmación si no está cargado
  loadModal(MODAL_CONFIRM_DELETE);

  // Asegurar que el componente badge esté cargado antes de renderizar chips
  if (!document.getElementById(ID_BADGE_TEMPLATE)) await loadComponent("badge");

  // Renderizar unidades de medida y conceptos
  renderUnits();
  renderConcepts();

  // Configurar event listeners
  setupUnitsListeners();
  setupConceptsListeners();
  setupSalaryPercentageListener();
  setupSalesPointListener();

  // Cargar porcentaje de salario actual
  loadSalaryPercentage();
  loadSalesPoint();

  // Configurar la versión y la fecha de última actualización de la app
  setupAppVersion();
  setupAppLastUpdate();

  // Configurar el botón para exportar el estado de la app en JSON
  setupExportAppStateListener();
  // Configurar el botón e input para importar estado desde un archivo JSON
  setupImportAppStateListener();
  // Configurar botones para eliminar / resetear datos de la app
  setupDeleteAppDataListeners();
}

/**
 * Configura los botones de borrado completo y reset con productos en stock 0
 */
function setupDeleteAppDataListeners() {
  const btnFull = document.getElementById(ID_BTN_DELETE_APP_DATA_FULL);
  if (btnFull) {
    btnFull.onclick = () =>
      openConfirmActionModal({
        title: "Borrado completo",
        message:
          "Se eliminarán todos los datos de la app, incluido el catálogo de productos, " +
          "ajustes y la sesión. Tendrás que iniciar sesión de nuevo. ¿Continuar?",
        confirmText: "Eliminar todo",
        confirmButtonClass: "btn-danger",
        callbackFn: deleteAppDataFull,
      });
  }

  const btnReset = document.getElementById(ID_BTN_RESET_APP_DATA_PRODUCTS);
  if (btnReset) {
    btnReset.onclick = () =>
      openConfirmActionModal({
        title: "Reset de datos operativos",
        message:
          "Se borrarán movimientos, inventarios, gastos y contabilidad. " +
          "Los productos se conservan con stock en 0. Unidades, conceptos y % de salario no se modifican. ¿Continuar?",
        confirmText: "Resetear",
        confirmButtonClass: "btn-warning",
        callbackFn: resetAppDataKeepingProducts,
      });
  }
}

/**
 * Borrado completo: elimina todo el localStorage y recarga la app
 */
function deleteAppDataFull() {
  localStorage.clear();
  location.reload();
}

/**
 * Reset operativo: productos con stock 0; borra movimientos, inventario, gastos y contabilidad
 */
function resetAppDataKeepingProducts() {
  const products = (getData(PAGE_PRODUCTS) || []).map((p) => ({
    ...p,
    quantity: 0,
  }));

  for (const key of OPERATIONAL_STATE_KEYS) {
    localStorage.removeItem(key);
  }

  setData(PAGE_PRODUCTS, products);
  location.reload();
}

/**
 * Configura el botón para exportar el estado de la app en JSON
 */
function setupExportAppStateListener() {
  const btn = document.getElementById(ID_BTN_EXPORT_APP_STATE);
  if (!btn) return;
  btn.onclick = () => exportAppStateToJson();
}

/**
 * Configura el botón e input para importar estado desde un archivo JSON
 */
function setupImportAppStateListener() {
  const btn = document.getElementById(ID_BTN_IMPORT_APP_STATE);
  const input = document.getElementById(ID_INPUT_IMPORT_APP_STATE);
  if (!btn || !input) return;

  btn.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const result = await importAppStateFromFile(file);
    if (result.ok) {
      if (typeof showToast === "function") {
        showToast(`Estado importado correctamente (${result.imported} datos actualizados).`, "success", 4);
      } else {
        alert(`Estado importado correctamente (${result.imported} datos actualizados).`);
      }
      renderUnits();
      renderConcepts();
      loadSalaryPercentage();
    } else {
      if (typeof showToast === "function") {
        showToast(result.error || "Error al importar", "danger", 4);
      } else {
        alert(result.error || "Error al importar");
      }
    }
  };
}

/**
 * Muestra la versión de la app en el elemento #appVersionText (getAppVersion en configs.js).
 * @returns {void}
 */
function setupAppVersion() {
  getAppVersion().then((ver) => {
    setLabelText(ID_APP_VERSION_TEXT, ver);
  });
}

/**
 * Muestra la versión de la app en el elemento #appVersionText (getAppVersion en configs.js).
 * @returns {void}
 */
function setupAppLastUpdate() {
  setLabelText(ID_APP_LAST_UPDATE_TEXT, APP_LAST_UPDATE);
}

/**
 * Configura los event listeners para la gestión de unidades de medida
 * @returns {void}
 */
function setupUnitsListeners() {
  const input = document.getElementById(ID_INPUT_NEW_UNIT);
  const btnAdd = document.getElementById(ID_BTN_ADD_UNIT);

  if (!input || !btnAdd) return;

  // Limpiar error al escribir
  input.oninput = () => clearUnitError();

  // Agregar al hacer clic en el botón
  btnAdd.onclick = () => addUnit();

  // Agregar al presionar Enter
  input.onkeypress = (e) => {
    if (e.key === "Enter") {
      addUnit();
    }
  };
}

/**
 * Configura los event listeners para la gestión de conceptos de gastos
 * @returns {void}
 */
function setupConceptsListeners() {
  const input = document.getElementById(ID_INPUT_NEW_CONCEPT);
  const btnAdd = document.getElementById(ID_BTN_ADD_CONCEPT);

  if (!input || !btnAdd) return;

  // Limpiar error al escribir
  input.oninput = () => clearConceptError();

  // Agregar al hacer clic en el botón
  btnAdd.onclick = () => addConcept();

  // Agregar al presionar Enter
  input.onkeypress = (e) => {
    if (e.key === "Enter") {
      addConcept();
    }
  };
}

/**
 * Agrega una nueva unidad de medida
 * @returns {void}
 */
function addUnit() {
  const input = document.getElementById(ID_INPUT_NEW_UNIT);
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    input.focus();
    return;
  }

  const units = getData("units") || [];

  // Limpiar error previo
  clearUnitError();

  // Verificar si ya existe
  if (units.some(u => u.toLowerCase() === value.toLowerCase())) {
    setUnitError("Esta unidad de medida ya existe");
    input.focus();
    return;
  }

  // Agregar
  units.push(value);
  setData("units", units);

  // Limpiar input y renderizar
  input.value = "";
  renderUnits();
  input.focus();
}

/**
 * Agrega un nuevo concepto de gastos
 * @returns {void}
 */
function addConcept() {
  const input = document.getElementById(ID_INPUT_NEW_CONCEPT);
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    input.focus();
    return;
  }

  const concepts = getData("expenseConcepts") || [];

  // Limpiar error previo
  clearConceptError();

  // Verificar si ya existe
  if (concepts.some(c => c.toLowerCase() === value.toLowerCase())) {
    setConceptError("Este concepto ya existe");
    input.focus();
    return;
  }

  // Agregar
  concepts.push(value);
  setData("expenseConcepts", concepts);

  // Limpiar input y renderizar
  input.value = "";
  renderConcepts();
  input.focus();
}

/**
 * Renderiza la lista de unidades de medida como chips
 * @returns {void}
 */
function renderUnits() {
  const container = document.getElementById(ID_UNITS_LIST);
  if (!container) return;

  const units = getData("units") || [];
  container.innerHTML = "";

  units.forEach((unit, index) => {
    const chip = createUnitChip(unit, index);
    if (chip) container.appendChild(chip);
  });
}

/**
 * Renderiza la lista de conceptos de gastos como chips
 * @returns {void}
 */
function renderConcepts() {
  const container = document.getElementById(ID_CONCEPTS_LIST);
  if (!container) return;

  const concepts = getData("expenseConcepts") || [];
  container.innerHTML = "";

  concepts.forEach((concept, index) => {
    const chip = createConceptChip(concept, index);
    if (chip) container.appendChild(chip);
  });
}

/**
 * Crea un chip para una unidad de medida (usa componente badge)
 * @param {string} unit - Nombre de la unidad
 * @param {number} index - Índice en la lista
 * @returns {HTMLElement|null} Elemento chip
 */
function createUnitChip(unit, index) {
  return createBadge({
    text: unit,
    colorClass: "bg-primary",
    showCloseButton: true,
    btnCloseWhite: true,
    onClose: () => deleteUnit(index)
  });
}

/**
 * Crea un chip para un concepto de gastos (usa componente badge)
 * @param {string} concept - Nombre del concepto
 * @param {number} index - Índice en la lista
 * @returns {HTMLElement|null} Elemento chip
 */
function createConceptChip(concept, index) {
  return createBadge({
    text: concept,
    colorClass: "bg-primary",
    showCloseButton: true,
    btnCloseWhite: true,
    onClose: () => deleteConcept(index)
  });
}

/**
 * Elimina una unidad de medida (con validación)
 * @param {number} index - Índice de la unidad a eliminar
 * @returns {void}
 */
function deleteUnit(index) {
  // Limpiar errores previos
  clearUnitError();
  clearConceptError();

  const units = getData("units") || [];
  if (index < 0 || index >= units.length) return;

  const unit = units[index];

  // Verificar si está en uso en productos
  const products = getData(PAGE_PRODUCTS) || [];
  const isInUse = products.some(p => p.um && p.um.toLowerCase() === unit.toLowerCase());

  if (isInUse) {
    setUnitError("No se puede eliminar: esta unidad está en uso en productos");
    return;
  }

  // Confirmar eliminación
  openConfirmDeleteModal("unit", index, unit);
}

/**
 * Elimina un concepto de gastos (con validación)
 * @param {number} index - Índice del concepto a eliminar
 * @returns {void}
 */
function deleteConcept(index) {
  // Limpiar errores previos
  clearUnitError();
  clearConceptError();

  const concepts = getData("expenseConcepts") || [];
  if (index < 0 || index >= concepts.length) return;

  const concept = concepts[index];

  // Verificar si está en uso en gastos
  const expenses = getData("expenses") || [];
  const isInUse = expenses.some(e => e.concept && e.concept.toLowerCase() === concept.toLowerCase());

  if (isInUse) {
    setConceptError("No se puede eliminar: este concepto está en uso en gastos");
    return;
  }

  // Confirmar eliminación
  openConfirmDeleteModal("concept", index, concept);
}

/**
 * Confirma la eliminación de una unidad de medida
 * @returns {void}
 */
function confirmDeleteUnit() {
  if (DELETE_STATE.id === null || DELETE_STATE.id === undefined) return;

  const units = getData("units") || [];
  const index = DELETE_STATE.id;

  if (index < 0 || index >= units.length) return;

  const deleted = units[index];

  // Verificar nuevamente si está en uso
  const products = getData(PAGE_PRODUCTS) || [];
  const isInUse = products.some(p => p.um && p.um.toLowerCase() === deleted.toLowerCase());

  if (isInUse) {
    setUnitError("No se puede eliminar: esta unidad está en uso en productos");
    hideConfirmModal();
    return;
  }

  // Guardar estado para undo
  UNDO_STATE.data = deleted;
  UNDO_STATE.type = "units";
  UNDO_STATE.index = index;

  // Eliminar
  units.splice(index, 1);
  setData("units", units);

  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  renderUnits();
  showSnackbar("Unidad de medida eliminada");
}

/**
 * Confirma la eliminación de un concepto de gastos
 * @returns {void}
 */
function confirmDeleteConcept() {
  if (DELETE_STATE.id === null || DELETE_STATE.id === undefined) return;

  const concepts = getData("expenseConcepts") || [];
  const index = DELETE_STATE.id;

  if (index < 0 || index >= concepts.length) return;

  const deleted = concepts[index];

  // Verificar nuevamente si está en uso
  const expenses = getData("expenses") || [];
  const isInUse = expenses.some(e => e.concept && e.concept.toLowerCase() === deleted.toLowerCase());

  if (isInUse) {
    setConceptError("No se puede eliminar: este concepto está en uso en gastos");
    hideConfirmModal();
    return;
  }

  // Guardar estado para undo
  UNDO_STATE.data = deleted;
  UNDO_STATE.type = "expenseConcepts";
  UNDO_STATE.index = index;

  // Eliminar
  concepts.splice(index, 1);
  setData("expenseConcepts", concepts);

  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  hideConfirmModal();
  renderConcepts();
  showSnackbar("Concepto de gastos eliminado");
}

/**
 * Obtiene todas las unidades de medida
 * @returns {Array<string>} Lista de unidades de medida
 */
function getUnits() {
  return getData("units") || [];
}

/**
 * Obtiene todos los conceptos de gastos
 * @returns {Array<string>} Lista de conceptos de gastos
 */
function getExpenseConcepts() {
  return getData("expenseConcepts") || [];
}

/**
 * Muestra un error debajo del campo de unidad de medida
 * @param {string} message - Mensaje de error
 * @returns {void}
 */
function setUnitError(message) {
  const input = document.getElementById(ID_INPUT_NEW_UNIT);
  const feedback = document.getElementById(ID_UNIT_ERROR_FEEDBACK);

  if (input) {
    input.classList.add("is-invalid");
  }

  if (feedback) {
    feedback.textContent = message;
    feedback.style.display = "block";
    feedback.classList.add("d-block");
  }
}

/**
 * Limpia el error del campo de unidad de medida
 * @returns {void}
 */
function clearUnitError() {
  const input = document.getElementById(ID_INPUT_NEW_UNIT);
  const feedback = document.getElementById(ID_UNIT_ERROR_FEEDBACK);

  if (input) {
    input.classList.remove("is-invalid");
  }

  if (feedback) {
    feedback.textContent = "";
    feedback.style.display = "none";
    feedback.classList.remove("d-block");
  }
}

/**
 * Muestra un error debajo del campo de concepto de gastos
 * @param {string} message - Mensaje de error
 * @returns {void}
 */
function setConceptError(message) {
  const input = document.getElementById(ID_INPUT_NEW_CONCEPT);
  const feedback = document.getElementById(ID_CONCEPT_ERROR_FEEDBACK);

  if (input) {
    input.classList.add("is-invalid");
  }

  if (feedback) {
    feedback.textContent = message;
    feedback.style.display = "block";
    feedback.classList.add("d-block");
  }
}

/**
 * Limpia el error del campo de concepto de gastos
 * @returns {void}
 */
function clearConceptError() {
  const input = document.getElementById(ID_INPUT_NEW_CONCEPT);
  const feedback = document.getElementById(ID_CONCEPT_ERROR_FEEDBACK);

  if (input) {
    input.classList.remove("is-invalid");
  }

  if (feedback) {
    feedback.textContent = "";
    feedback.style.display = "none";
    feedback.classList.remove("d-block");
  }
}

/**
 * Configura el event listener para el porcentaje de salario
 * @returns {void}
 */
function setupSalaryPercentageListener() {
  const btnSave = document.getElementById(ID_BTN_SAVE_SALARY_PERCENTAGE);
  if (!btnSave) return;

  btnSave.onclick = saveSalaryPercentage;
}

/**
 * Configura el event listener para el punto de venta
 * @returns {void}
 */
function setupSalesPointListener() {
  const btnSave = document.getElementById(ID_BTN_SAVE_SALES_POINT);
  if (!btnSave) return;

  btnSave.onclick = saveSalesPoint;
}

/**
 * Carga el punto de venta actual
 * @returns {void}
 */
function loadSalesPoint() {
  const input = document.getElementById(ID_INPUT_SALES_POINT);
  if (!input) return;

  input.value = getSalesPoint();
}

/**
 * Guarda el punto de venta
 * @returns {void}
 */
function saveSalesPoint() {
  const input = document.getElementById(ID_INPUT_SALES_POINT);
  if (!input) return;

  clearSalesPointError();

  const value = input.value.trim();
  if (!value) {
    setSalesPointError("Ingresá un nombre de punto de venta");
    input.focus();
    return;
  }

  if (value.length > 50) {
    setSalesPointError("Máximo 50 caracteres");
    input.focus();
    return;
  }

  setData(STORAGE_KEY_SALES_POINT, value);
}

/**
 * Muestra un error en el campo de punto de venta
 * @param {string} message
 * @returns {void}
 */
function setSalesPointError(message) {
  const input = document.getElementById(ID_INPUT_SALES_POINT);
  const feedback = document.getElementById(ID_SALES_POINT_ERROR_FEEDBACK);

  if (input) input.classList.add("is-invalid");
  if (feedback) {
    feedback.textContent = message;
    feedback.style.display = "block";
    feedback.classList.add("d-block");
  }
}

/**
 * Limpia el error del campo de punto de venta
 * @returns {void}
 */
function clearSalesPointError() {
  const input = document.getElementById(ID_INPUT_SALES_POINT);
  const feedback = document.getElementById(ID_SALES_POINT_ERROR_FEEDBACK);

  if (input) input.classList.remove("is-invalid");
  if (feedback) {
    feedback.textContent = "";
    feedback.style.display = "none";
    feedback.classList.remove("d-block");
  }
}

/**
 * Obtiene el punto de venta configurado
 * @returns {string}
 */
function getSalesPoint() {
  //const raw = localStorage.getItem(STORAGE_KEY_SALES_POINT);
  const raw = getData(STORAGE_KEY_SALES_POINT);
  
  if (raw === null) return "";
  return typeof raw === "string" ? raw.trim() : "";

  /*try {
    const parsed = JSON.parse(raw);
    console.log("get Sales point: ", parsed)
    return typeof parsed === "string" ? parsed.trim() : "";
    
  } catch (_) {
    console.log("get Sales point: ", "error")
    return "";
  }*/
}

/**
 * Carga el porcentaje de salario actual
 * @returns {void}
 */
function loadSalaryPercentage() {
  const input = document.getElementById(ID_INPUT_SALARY_PERCENTAGE);
  if (!input) return;

  const percentage = getData("salaryPercentage");
  input.value = percentage !== null && percentage !== undefined ? percentage : 1.7;
}

/**
 * Guarda el porcentaje de salario
 * @returns {void}
 */
function saveSalaryPercentage() {
  const input = document.getElementById(ID_INPUT_SALARY_PERCENTAGE);
  if (!input) return;

  // Limpiar error previo
  clearSalaryPercentageError();

  const value = parseFloat(input.value);
  if (isNaN(value) || value < 0 || value > 100) {
    setSalaryPercentageError("Ingresá un porcentaje válido (0-100)");
    input.focus();
    return;
  }

  setData("salaryPercentage", value);
  // No mostrar snackbar, es un valor simple de modificar
}

/**
 * Muestra un error en el campo de porcentaje de salario
 * @param {string} message - Mensaje de error a mostrar
 * @returns {void}
 */
function setSalaryPercentageError(message) {
  const input = document.getElementById(ID_INPUT_SALARY_PERCENTAGE);
  const feedback = document.getElementById(ID_SALARY_PERCENTAGE_ERROR_FEEDBACK);

  if (input) {
    input.classList.add("is-invalid");
  }

  if (feedback) {
    feedback.textContent = message;
    feedback.style.display = "block";
    feedback.classList.add("d-block");
  }
}

/**
 * Limpia el error del campo de porcentaje de salario
 * @returns {void}
 */
function clearSalaryPercentageError() {
  const input = document.getElementById(ID_INPUT_SALARY_PERCENTAGE);
  const feedback = document.getElementById(ID_SALARY_PERCENTAGE_ERROR_FEEDBACK);

  if (input) {
    input.classList.remove("is-invalid");
  }

  if (feedback) {
    feedback.textContent = "";
    feedback.style.display = "none";
    feedback.classList.remove("d-block");
  }
}

/**
 * Obtiene el porcentaje de salario configurado
 * @returns {number} Porcentaje de salario (default: 1.7)
 */
function getSalaryPercentage() {
  const percentage = getData("salaryPercentage");
  return percentage !== null && percentage !== undefined ? percentage : 1.7;
}

