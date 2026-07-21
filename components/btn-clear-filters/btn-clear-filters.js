/**
 * Configura y muestra los controles del módulo
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @param {function} renderFn - Función de renderización de la lista de elementos
 * @returns {void}
 */
function setupBtnClearFilters(moduleName, renderFn) {
  // 6. Configurar botón limpiar filtros (siempre visible, limpia todo)


  // obtener elementos del DOM
  const btnClearFilters = document.getElementById(ID_CONTROL_BTN_CLEAR_FILTERS);
  if (btnClearFilters) {
    if (renderFn && typeof renderFn === "function") {
      // Configurar el listener del btn clear filters
      btnClearFilters.onclick = async () => {
        console.log(`Clear filters clicked`);

        // Limpiar buscador
        await clearSearchInput(moduleName);

        // Limpiar ordenamiento (si existe)
        await clearOrderBy(moduleName);

        // Limpiar filtro de fecha (si existe)
        await clearDateFilter(moduleName);

        // Limpiar chips (si existen)
        await clearChipsFilter(moduleName);

        await linkDateAndChipsFilters(moduleName, CONTROL_DATE_FILTER);

        // Llamar a la función de renderizado
        renderFn();
      };
    } else {
      console.error(`Render function not found for module: ${moduleName}`);
    }
  } else {
    console.error(`Btn clear filters not found for module: ${moduleName}`);
  }
}




/**
 * Limpiar buscador
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @returns {void}
 */
async function clearSearchInput(moduleName) {
  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  const searchInput = document.getElementById(ID_CONTROL_SEARCH_INPUT);
  const btnClearSearch = document.getElementById(ID_CONTROL_CLEAR_SEARCH);
  if (searchInput && btnClearSearch) {
    console.log(
      `Search input and btn clear search found for module: ${moduleName}`
    );
    // Limpiar buscador
    searchInput.value = "";

    // Ocultar botón de limpiar buscador
    btnClearSearch.classList.add("d-none");

    // Actualizar estado del moduleState para el buscador
    moduleState.searchText = "";
  }
}

/**
 * Limpiar ordenamiento
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @returns {void}
 */
async function clearOrderBy(moduleName) {
  // obtener el config del módulo
  let config = getModuleConfig(moduleName);

  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  // obtener los elementos del DOM
  const orderBy = document.getElementById(ID_CONTROL_ORDER_BY);
  const orderDir = document.getElementById(ID_CONTROL_ORDER_DIR);
  const orderDirIcon = document.getElementById(ID_CONTROL_ORDER_DIR_ICON);
  if (orderBy && orderDir && orderDirIcon) {
    console.log(
      `Order by, order dir and order dir icon found for module: ${moduleName}`
    );

    // Limpiar ordenamiento
    orderBy.value = "";

    // Actualizar icono del ordenamiento
    orderDirIcon.classList.add("bi-sort-alpha-down");
    orderDirIcon.classList.remove("bi-sort-alpha-up");

    // Actualizar estado del moduleState para el ordenamiento
    moduleState.orderBy = config.sortOptions[0]?.value || "";
    moduleState.orderDir = "desc";
  } else {
    console.error(
      `Order by, order dir or order dir icon not found for module: ${moduleName}`
    );
  }
}


/**
 * Limpiar el filtro de fecha
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @returns {void}
 */
async function clearDateFilter(moduleName) {
  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  const dateFilter = document.getElementById(ID_CONTROL_DATE_FILTER);
  if (dateFilter) {
    console.log(`Date filter found for module: ${moduleName}`);
    // Limpiar filtro de fecha
    let dateValue = "";
    let filterValue = null;
    if (moduleName === PAGE_INVENTORY || moduleName === PAGE_ACCOUNTING || moduleName === PAGE_FINANCES) {
      dateValue = getToday();
      filterValue = dateValue;
    }
    // Establecer valor del campo del filtro de fecha
    dateFilter.value = dateValue;
    // Establecer valor del estado del moduleState para el filtro de fecha
    moduleState.filterDate = filterValue;
  } else {
    console.error(`Date filter not found for module: ${moduleName}`);
  }
}


/**
 * Limpiar los chips filtrados
 * @param {string} moduleName - Nombre del módulo ("products", "movements", "inventory", "expenses")
 * @returns {void}
 */
async function clearChipsFilter(moduleName) {
  // obtener el estado del modulo
  let moduleState = getModuleState(moduleName);

  const chips = document.querySelectorAll(
    `.${CLASS_CONTROL_CHIPS_FILTER_BUTTON}`
  );
  console.log(`Chips encontrados: ${moduleName}`, chips);
  if (chips && chips.length > 0) {
    console.log(`Chips found for module: ${moduleName}`);
    // Limpiar chips
    chips.forEach((chip) => {
      if (chip) {
        // Remover clase active del chip
        chip.classList.remove("active");
      }
    });

    // Actualizar estado de los chips filtrados
    moduleState.chipFiltered = null;
  } else {
    console.warn(
      `No hay chips configurados para el módulo: ${moduleName}`
    );
  }
}
