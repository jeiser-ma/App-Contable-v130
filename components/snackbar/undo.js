//#region Constants
const ID_BTN_UNDO = "btnUndo";
const ID_SNACKBAR = "snackbar";
const ID_SNACKBAR_TEXT = "snackbarText";
const ID_SNACKBAR_CLOSE = "snackbarClose";

//#endregion

// Estado de la pantalla de productos (unificado)
const UNDO_STATE = {
  data: null,
  type: null,
  index: null, // Para unidades y conceptos (guardar posición original)
  buttonListener: null,
  timer: null
};

/**
 * Muestra el snackbar con el texto especificado
 * Activa el event listener del botón undo solo cuando el snackbar está visible
 * @param {string} text - Texto a mostrar en el snackbar
 * @returns {void}
 */
function showSnackbar(text) {
  const bar = document.getElementById(ID_SNACKBAR);
  const btnUndo = document.getElementById(ID_BTN_UNDO);
  const btnClose = document.getElementById(ID_SNACKBAR_CLOSE);
  
  if (!bar || !btnUndo || !btnClose) return;

  document.getElementById(ID_SNACKBAR_TEXT).textContent = text;
  bar.classList.remove("d-none");

  // Agregar event listener solo cuando el snackbar está visible
  if (!UNDO_STATE.buttonListener) {
    UNDO_STATE.buttonListener = () => undoDelete();
    btnUndo.addEventListener("click", UNDO_STATE.buttonListener);
  }

  clearTimeout(UNDO_STATE.timer);
  UNDO_STATE.timer = setTimeout(() => {
    hideSnackbar();
    clearUndoState();
  }, 5000);
}

/**
 * Limpia el estado de deshacer
 * @returns {void}
 */
function clearUndoState() {
  UNDO_STATE.data = null;
  UNDO_STATE.type = null;
  UNDO_STATE.index = null;
}

/**
 * Oculta el snackbar y remueve el event listener del botón undo
 * @returns {void}
 */
function hideSnackbar() {
  const bar = document.getElementById(ID_SNACKBAR);
  const btnUndo = document.getElementById(ID_BTN_UNDO);
  
  if (bar) {
    bar.classList.add("d-none");
  }

  // Remover event listener cuando el snackbar se oculta
  if (btnUndo && UNDO_STATE.buttonListener) {
    btnUndo.removeEventListener("click", UNDO_STATE.buttonListener);
    UNDO_STATE.buttonListener = null;
  }
}

/**
 * Deshace la eliminación de un elemento
 * Restaura el elemento eliminado según su tipo
 * @returns {void}
 */
function undoDelete() {
  if (!UNDO_STATE.data || !UNDO_STATE.type) return;

  // Manejar unidades de medida y conceptos de gastos (tienen índice)
  if (UNDO_STATE.type === "units" || UNDO_STATE.type === "expenseConcepts") {
    const data = getData(UNDO_STATE.type);
    const index = UNDO_STATE.index !== undefined ? UNDO_STATE.index : data.length;
    
    // Insertar en la posición original
    data.splice(index, 0, UNDO_STATE.data);
    setData(UNDO_STATE.type, data);
    
    // Renderizar
    if (UNDO_STATE.type === "units" && typeof renderUnits === "function") {
      renderUnits();
    } else if (UNDO_STATE.type === "expenseConcepts" && typeof renderConcepts === "function") {
      renderConcepts();
    }
  } else {
    // Manejar otros tipos (productos, movimientos, etc.)
    const data = getData(UNDO_STATE.type);
    data.push(UNDO_STATE.data);
    setData(UNDO_STATE.type, data);

    // Renderizar según el tipo
    if (UNDO_STATE.type === PAGE_PRODUCTS && typeof renderProducts === "function") {
      renderProducts();
    } else if (UNDO_STATE.type === PAGE_MOVEMENTS && typeof renderMovements === "function") {
      renderMovements();
    } else if (UNDO_STATE.type === PAGE_INVENTORY && typeof renderInventory === "function") {
      renderInventory();
    } else if (UNDO_STATE.type === PAGE_EXPENSES && typeof renderExpenses === "function") {
      renderExpenses();
    } else if (UNDO_STATE.type === PAGE_STORES && typeof renderStores === "function") {
      renderStores();
    }
  }

  hideSnackbar(); // Esta función ya remueve el listener
  clearUndoState();
}


// Delegación: el snackbar se carga después en components-container
document.getElementById(ID_COMPONENTS_CONTAINER)?.addEventListener("click", (e) => {
  if (e.target.id === ID_SNACKBAR_CLOSE) {
    hideSnackbar();
  }
});