/**
 * Claves centralizadas de localStorage
 * Fuente única para getData / setData / export-import
 */
const STG_KEYS = {
  // Datos operativos / módulos (coinciden con PAGE_* donde aplica)
  PRODUCTS: "products",
  MOVEMENTS: "movements",
  INVENTORY: "inventory",
  EXPENSES: "expenses",
  ACCOUNTING: "accounting",
  STORES: "stores",
  FINANCES: "finances",
  STOCK: "stock",

  // Config global
  UNITS: "units",
  CURRENCIES: "currencies",
  EXPENSE_CONCEPTS: "expenseConcepts",
  SALARY_PERCENTAGE: "salaryPercentage",
  SALES_POINT: "salesPoint",

  // Auth (no se incluyen en APP_STATE_KEYS)
  CREDENTIALS: "credentials",
  LOGGED: "logged",
};

/**
 * Obtiene un dato del localStorage
 * @param {string} k - Clave del dato
 * @returns {Object} - Valor del dato
 */
function getData(k) {
  return JSON.parse(localStorage.getItem(k) || "[]");
}

/**
 * Guarda un dato en el localStorage
 * @param {string} k - Clave del dato
 * @param {Object} v - Valor del dato
 * @returns {void}
 */
function setData(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}

/**
 * Guarda un dato en el localStorage por su id
 * Si el dato ya existe, se actualiza, si no, se crea
 * @param {string} k - Clave del dato
 * @param {Object} v - Valor del dato
 * @returns {void}
 */
function setDataById(k, v) {
  if (!k || !v) return;

  const allData = getData(k) || [];
  const index = allData.findIndex(a => a.id === v.id);

  if (index >= 0) {
    allData[index] = v;
  } else {
    allData.push(v);
  }

  setData(k, allData);
}

/**
 * Obtiene un dato del localStorage por su id
 * @param {string} k - Clave del dato (ej: STG_KEYS.PRODUCTS)
 * @param {string} id - ID del dato
 * @returns {Object} - Valor del dato encontrado o null si no se encuentra
 */
function getDataById(k, id) {
  if (!k || !id) return;

  const allData = getData(k) || [];
  const data = allData.find(a => a.id === id);

  return data;
}
