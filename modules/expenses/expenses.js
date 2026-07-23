//#region Constants
// IDs de botones y elementos
const BTN_ID_ADD_EXPENSE = "btnAddExpense";
const BTN_ID_CONFIRM_EXPENSE = "btnConfirmExpense";

const ID_EXPENSES_LIST = "expensesList";
const ID_EXPENSE_CARD_TEMPLATE = "expenseCardTemplate";

const ID_EXPENSE_CONCEPT = "expenseConcept";
const ID_EXPENSE_AMOUNT = "expenseAmount";
const ID_EXPENSE_DATE = "expenseDate";
const ID_EXPENSE_NOTE = "expenseNote";

const ID_EXPENSE_TITLE = "expenseTitle";
const ID_EXPENSE_ICON = "expenseIcon";
//#endregion

// Estado de la pantalla de gastos (unificado)
const EXPENSES_STATE = {
  searchText: "",
  filterDate: null,
  orderBy: "date",
  orderDir: "desc",
  chipFiltered: null, // "concept" | "date" | null
  elementToEdit: null,
};

// Exponer el estado globalmente para module-controls.js
window.EXPENSES_STATE = EXPENSES_STATE;

/**
 * Hook que llama el router cuando se carga la página de gastos
 * @returns {void}
 */
async function onExpensesPageLoaded() {
  console.log("onExpensesPageLoaded execution");

  // Cargar modal de gastos
  console.log("Loading expense-modal");
  await loadModal(MODAL_EXPENSES, PAGE_EXPENSES);

  // Inicializar el modal después de cargarlo
  initModalModule(MODAL_EXPENSES);
  // Cargar conceptos de gastos en el select 
  loadExpenseConceptsIntoSelect();


  // Configurar controles del módulo (buscador, ordenamiento, fecha, botón agregar)
  await setupExpensesControls();

  // Configurar botón de confirmar del modal
  const btnConfirm = document.getElementById(BTN_ID_CONFIRM_EXPENSE);
  if (btnConfirm) {
    btnConfirm.onclick = saveExpenseFromModal;
  }

  // Renderizar la lista de gastos
  renderExpenses();
}


/**
 * Configura los controles del módulo de gastos
 * @param {string} pageName - Nombre de la página
 * @returns {void}
 */
async function setupExpensesControls() {
  // Limpiar el contenido de los controles del módulo
  clearModuleControlsContent();

  // Mostrar los controles del módulo
  showModuleControls();


  // Cargar el control de búsqueda
  await loadModuleControl(CONTROL_SEARCH_INPUT);
  // Configurar el control de búsqueda
  setupSearchInput(PAGE_EXPENSES, renderExpenses);


  // Cargar el control de botón de agregar
  await loadModuleControl(CONTROL_BTN_ADD);
  // Configurar el botón de agregar
  setupBtnAdd(openAddExpenseModal);


  // Cargar el control de filtro de fecha
  await loadModuleControl(CONTROL_DATE_FILTER);
  // Configurar el filtro de fecha
  setupDateFilter(PAGE_EXPENSES, renderExpenses);


  // cargar el control de ordenamiento
  await loadModuleControl(CONTROL_ORDER_BY);
  // Configurar el control de ordenamiento
  setupOrderBy(PAGE_EXPENSES, renderExpenses);


  // cargar el control de chips filter
  await loadModuleControl(CONTROL_CHIPS_FILTER);
  // Configurar el control de chips filter
  await setupChipsFilter(PAGE_EXPENSES, renderExpenses);

  // Para los modulos con chips de fecha, inicializar el chip today por defecto al cargar la pagina
  await linkDateAndChipsFilters(PAGE_EXPENSES, CONTROL_DATE_FILTER);


  // Cargar el control de contador de elementos
  await loadModuleControl(CONTROL_LIST_COUNTER);
  // No es necesario configurarle comportamiento, 
  // se actualizará automáticamente al renderizar la lista


  // cargar el control de limpiar filtros
  await loadModuleControl(CONTROL_BTN_CLEAR_FILTERS);
  // Configurar el control de limpiar filtros
  setupBtnClearFilters(PAGE_EXPENSES, renderExpenses);

}



/**
 * Abre el formulario para nuevo gasto
 * @returns {void}
 */
function openAddExpenseModal() {
  // Resetear el estado de edición porque es un nuevo gasto y no hay gasto para editar
  EXPENSES_STATE.elementToEdit = null;

  // definir el header del modal para nuevo gasto
  setModalHeader(MODAL_EXPENSES, false);
  // Limpiar errores de validación anteriores del modal
  clearExpenseModalErrors();

  // Establecer el valor del input de concepto
  setInputValue(ID_EXPENSE_CONCEPT, "");
  // Establecer el valor del input de cantidad
  setInputValue(ID_EXPENSE_AMOUNT, "");
  // Establecer el valor del input de fecha
  setInputValue(ID_EXPENSE_DATE, EXPENSES_STATE.filterDate || new Date().toISOString().split("T")[0]);
  // Establecer el valor del input de observaciones
  setInputValue(ID_EXPENSE_NOTE, "");

  // Mostrar el modal
  showModalModules();
}

/**
 * Limpia los errores de validación del formulario de gastos
 * @returns {void}
 */
function clearExpenseModalErrors() {
  clearInputErrors([ID_EXPENSE_CONCEPT, ID_EXPENSE_AMOUNT, ID_EXPENSE_DATE, ID_EXPENSE_NOTE]);
}

/**
 * Guarda un gasto desde el modal (crear o editar)
 * @returns {void}
 */
function saveExpenseFromModal() {
  // Obtener los valores de los inputs
  const concept = getInputValue(ID_EXPENSE_CONCEPT).trim();
  const amount = parseFloat(getInputValue(ID_EXPENSE_AMOUNT));
  const date = getInputValue(ID_EXPENSE_DATE);
  const note = getInputValue(ID_EXPENSE_NOTE).trim() || "";

  // Validar que se ingresó un concepto
  if (!concept) {
    setInputError(ID_EXPENSE_CONCEPT, "Seleccioná un concepto");
    return;
  }

  // Validar que se ingresó una cantidad válida
  if (Number.isNaN(amount) || amount <= 0) {
    setInputError(ID_EXPENSE_AMOUNT, "Ingresá una cantidad válida");
    return;
  }

  // Validar que se ingresó una fecha
  if (!date) {
    setInputError(ID_EXPENSE_DATE, "Seleccioná una fecha");
    return;
  }

  const amountRounded = roundTo2(amount);

  // Si se está editando un gasto, actualizar el gasto
  // de lo contrario, crear un nuevo gasto
  if (EXPENSES_STATE.elementToEdit) {
    // Editar
    const expenseToEdit = getDataById(PAGE_EXPENSES, EXPENSES_STATE.elementToEdit);
    if (!expenseToEdit) {
      setInputError(ID_EXPENSE_CONCEPT, "El gasto no existe");
      return;
    }
    const updatedExpense = {
      ...expenseToEdit,
      concept,
      amount: amountRounded,
      date,
      note,
    };
    setDataById(PAGE_EXPENSES, updatedExpense);
  } else {
    // Crear
    const newExpense = {
      id: crypto.randomUUID(),
      concept,
      amount: amountRounded,
      date,
      note,
      createdAt: new Date().toISOString(),
    };
    setDataById(PAGE_EXPENSES, newExpense);
  }

  // Cerrar el modal
  hideModalModules();
  // Renderizar la lista de gastos
  renderExpenses();
}

/**
 * Abre el modal para editar un gasto existente
 * @param {string} id - ID del gasto a editar
 * @returns {void}
 */
function openEditExpenseModal(id) {
  const expense = getDataById(PAGE_EXPENSES, id);
  if (!expense) return;

  EXPENSES_STATE.elementToEdit = id;

  // definir el header del modal
  setModalHeader(MODAL_EXPENSES, true);

  // Limpiar errores de validación anteriores del modal
  clearExpenseModalErrors();

  // Establecer el valor del input de concepto
  setInputValue(ID_EXPENSE_CONCEPT, expense.concept);
  // Establecer el valor del input de cantidad
  setInputValue(ID_EXPENSE_AMOUNT, formatTo2(expense.amount));
  // Establecer el valor del input de fecha
  setInputValue(ID_EXPENSE_DATE, expense.date);
  // Establecer el valor del input de observaciones
  setInputValue(ID_EXPENSE_NOTE, expense.note || "");

  // Mostrar el modal
  toggleModalModules();
}

/**
 * Carga los conceptos de gastos en el select del modal
 * @returns {void}
 */
function loadExpenseConceptsIntoSelect() {
  const select = document.getElementById(ID_EXPENSE_CONCEPT);
  if (!select) return;

  // Limpiar opciones existentes (excepto la primera)
  const firstOption = select.querySelector('option[value=""]');
  select.innerHTML = "";
  if (firstOption) {
    select.appendChild(firstOption);
  } else {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Seleccioná un concepto...";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);
  }

  // Obtener conceptos de gastos
  const concepts = getExpenseConcepts();

  // Agregar opciones
  concepts.forEach(concept => {
    const option = document.createElement("option");
    option.value = concept;
    option.textContent = concept;
    select.appendChild(option);
  });
}

/**
 * Abre el modal de confirmación para eliminar un gasto
 * @param {string} id - ID del gasto a eliminar
 * @returns {void}
 */
function openDeleteExpenseModal(id) {
  const expenses = getData(PAGE_EXPENSES) || [];
  const expense = expenses.find((e) => e.id === id);
  if (!expense) return;

  DELETE_STATE.type = "expense";
  DELETE_STATE.id = id;

  openConfirmDeleteModal("expense", id, expense.concept);
}

/**
 * Confirma la eliminación de un gasto
 * @returns {void}
 */
function confirmDeleteExpense() {
  if (!DELETE_STATE.id) return;

  const expenses = getData(PAGE_EXPENSES) || [];
  const deleted = expenses.find((e) => e.id === DELETE_STATE.id);
  if (!deleted) return;

  // Guardar estado para undo
  UNDO_STATE.data = deleted;
  UNDO_STATE.type = STG_KEYS.EXPENSES;

  const updated = expenses.filter((e) => e.id !== DELETE_STATE.id);
  setData(PAGE_EXPENSES, updated);

  DELETE_STATE.type = null;
  DELETE_STATE.id = null;

  // Cerrar modal de confirmación reutilizable
  hideConfirmModal();
  renderExpenses();
  showSnackbar("Gasto eliminado");
}

// ===============================
// Filtrado y Ordenamiento
// ===============================

/**
 * Filtra gastos usando los criterios de EXPENSES_STATE
 * @param {Array} expenses - Lista de gastos a filtrar
 * @returns {Array} Lista de gastos filtrados
 */
function filterExpenses(expenses) {
  let filtered = [...expenses];

  // Filtro por texto de búsqueda (concepto)
  if (EXPENSES_STATE.searchText) {
    filtered = filtered.filter((e) =>
      e.concept.toLowerCase().includes(EXPENSES_STATE.searchText.toLowerCase())
    );
  }

  // Filtro por fecha
  if (EXPENSES_STATE.filterDate) {
    filtered = filtered.filter((e) => e.date === EXPENSES_STATE.filterDate);
  }

  return filtered;
}

/**
 * Ordena gastos usando los criterios de EXPENSES_STATE
 * @param {Array} expenses - Lista de gastos a ordenar
 * @returns {Array} Lista de gastos ordenados
 */
function sortExpenses(expenses) {
  return [...expenses].sort((a, b) => {
    let v1 = a[EXPENSES_STATE.orderBy];
    let v2 = b[EXPENSES_STATE.orderBy];

    // Para fechas, comparar directamente
    if (EXPENSES_STATE.orderBy === "date") {
      if (v1 < v2) return EXPENSES_STATE.orderDir === "asc" ? -1 : 1;
      if (v1 > v2) return EXPENSES_STATE.orderDir === "asc" ? 1 : -1;
      return 0;
    }

    // Normalizar strings para comparación
    if (typeof v1 === "string") {
      v1 = v1.toLowerCase();
      v2 = v2.toLowerCase();
    }

    if (v1 < v2) return EXPENSES_STATE.orderDir === "asc" ? -1 : 1;
    if (v1 > v2) return EXPENSES_STATE.orderDir === "asc" ? 1 : -1;
    return 0;
  });
}

// ===============================
// Render
// ===============================

/**
 * Renderiza la lista de gastos en el DOM
 * @param {Array} expenses - Lista de gastos a renderizar
 * @returns {void}
 */
function renderExpensesList(expenses) {
  const list = document.getElementById(ID_EXPENSES_LIST);
  const template = document.getElementById(ID_EXPENSE_CARD_TEMPLATE);

  if (!list || !template) return;

  list.innerHTML = "";

  if (expenses.length === 0) {
    const placeholder = createEmptyStatePlaceholder("No se encontraron gastos");
    if (placeholder) list.appendChild(placeholder);
    return;
  }

  expenses.forEach((e) => {
    const node = template.content.cloneNode(true);

    const conceptEl = node.querySelector(".expense-concept");
    const metaEl = node.querySelector(".expense-meta");

    if (conceptEl) conceptEl.textContent = e.concept;

    const dateObj = new Date(e.date + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    if (metaEl) {
      metaEl.innerHTML = `<i class="bi bi-calendar"></i> ${formattedDate} • <i class="bi bi-currency-dollar"></i> ${formatTo2(e.amount)}`;
    }

    const btnEdit = node.querySelector(".btn-edit-expense");
    const btnDelete = node.querySelector(".btn-delete-expense");
    if (btnEdit) btnEdit.onclick = () => openEditExpenseModal(e.id);
    if (btnDelete) btnDelete.onclick = () => openDeleteExpenseModal(e.id);

    list.appendChild(node);
  });
}

/**
 * Función principal que renderiza los gastos
 * Filtra, ordena y renderiza usando EXPENSES_STATE
 * @returns {void}
 */
function renderExpenses() {
  const allExpenses = getData(PAGE_EXPENSES) || [];

  const filtered = filterExpenses(allExpenses);
  const sorted = sortExpenses(filtered);

  updateListCounter(sorted.length, allExpenses.length, PAGE_EXPENSES);
  renderExpensesList(sorted);
}


