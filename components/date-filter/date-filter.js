/**
 * Configura el botón de agregar
 * @param {object} moduleState - Estado del módulo
 * @param {function} renderFn - Función para renderizar la lista
 * @returns {void}
 */
function setupDateFilter(moduleName, renderFn) {
  console.log(`Setting up date filter`);

  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  // obtener elementos del DOM
  const dateFilter = document.getElementById(ID_CONTROL_DATE_FILTER);

  if (dateFilter) {
    console.log(`Date filter found`);

    // Establecer fecha de hoy por defecto
    const today = getToday();
    dateFilter.value = today;
    moduleState.filterDate = today;
    renderFn();

    // Configurar el listener de cambio de fecha
    dateFilter.onchange = async () => {
      if (renderFn && typeof renderFn === "function") {
        moduleState.filterDate = dateFilter.value || null;
        console.log(`Date filter changed: ${moduleState.filterDate}`);
        await linkDateAndChipsFilters(moduleName, CONTROL_DATE_FILTER);
        // if (moduleName === PAGE_ACCOUNTING) {
        //   clearChipsFilter(moduleName, moduleState);
        // }
        renderFn();
      }
    };
  }
}

/**
 * Enlaza el filtro de fecha con los chips de filtro (hoy | ayer)
 * @param {string} moduleName - Nombre del módulo
 * @param {string} controlName - Nombre del control que se activo
 * @returns {void}
 */
async function linkDateAndChipsFilters(moduleName, controlName) {
  console.warn("linkDateAndChipsFilters>>>>>: " + controlName + " ---> " + moduleName);

  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  // Verificar si el modulo es uno de los que tiene chips de fecha
  const hasModuleChipsDate = [PAGE_ACCOUNTING, PAGE_INVENTORY, PAGE_EXPENSES, PAGE_FINANCES].includes(moduleName);
  // Validar que sea un modulo con chips de fecha
  if (hasModuleChipsDate) {

    // Si hay una fecha filtrada, activar el chip correspondiente
    if (controlName === CONTROL_DATE_FILTER && moduleState.filterDate) {
      // primero limpiar los chips filtrados
      clearChipsFilter(moduleName, moduleState);

      // obtener la lista de chips del modulo
      let chipList = getModuleConfig(moduleName).chips;

      // Si la fecha es hoy, activar el chip de hoy
      if (moduleState.filterDate === getToday()) {
        activateChip(chipList.find(chip => chip.value === "today").id, moduleState);
        // Si la fecha es ayer, activar el chip de ayer
      } else if (moduleState.filterDate === getYesterday(getToday())) {
        activateChip(chipList.find(chip => chip.value === "yesterday").id, moduleState);
      }
    }
    
    // Si hay un chip filtrado, actualizar la fecha en el DOM segun la fecha de los chips
    if (controlName === CONTROL_CHIPS_FILTER && moduleState.chipFiltered) {

      // actualizar la fecha en el estado del modulo segun la fecha de los chips
      moduleState.filterDate = moduleState.chipFiltered === "today" ? getToday() : getYesterday(getToday());
      //console.log("moduleState.filterDate: " + moduleState.filterDate);
  
      // actualizar el campo de fecha en el DOM segun la fecha de los chips
      const dateFilter = document.getElementById(ID_CONTROL_DATE_FILTER);
      if (dateFilter) {
        dateFilter.value = moduleState.filterDate;
      }
    }

    
  }
}



/**
 * Navega a la página especificada con una fecha filtrada
 * @param {string} page - Nombre de la página
 * @param {string} date - Fecha YYYY-MM-DD
 * @returns {void}
 */
async function navigateToPageWithDateFilter(page, date) {
  console.log("navigateToPageWithDateFilter execution>>>>>> ", page, date);
  if (typeof loadPage === "function") {
    // Cargar la página
    await loadPage(page);

    // Establecer la fecha en el filtro de la página
    // obtener el control de fecha de la página
    const dateFilter = document.getElementById(ID_CONTROL_DATE_FILTER);
    // dispara el evento change para cargar la página con la fecha seleccionada
    if (dateFilter) {
      dateFilter.value = date;
      dateFilter.onchange();
    }
  }
}