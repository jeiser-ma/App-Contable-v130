/**
 * Módulo de importación - App Contable
 * Carga un archivo JSON de estado (exportado por exports.js) y actualiza los datos de la app.
 */

// Mismas claves que en exports.js; solo se importan estas para no sobrescribir otros datos (ej. credentials)
const IMPORT_STATE_KEYS = typeof APP_STATE_KEYS !== "undefined"
  ? APP_STATE_KEYS
  : [
      "products",
      "movements",
      "inventory",
      "expenses",
      "accounting",
      "stores",
      "finances",
      "units",
      "expenseConcepts",
      "salaryPercentage"
    ];

/**
 * Importa el estado de la app desde un string JSON.
 * Solo actualiza las claves permitidas (IMPORT_STATE_KEYS); ignora _exportedAt, _appVersion, etc.
 * @param {string} jsonString - Contenido del archivo JSON
 * @returns {{ ok: boolean, error?: string, imported?: number }}
 */
function importAppStateFromJson(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (_) {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "El contenido del archivo no es un objeto." };
  }

  let imported = 0;
  for (const key of IMPORT_STATE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      try {
        setData(key, parsed[key]);
        imported++;
      } catch (_) {
        // Si falla una clave, seguimos con el resto
      }
    }
  }

  return { ok: true, imported };
}

/**
 * Lee un archivo File y ejecuta importAppStateFromJson con su contenido.
 * @param {File} file - Archivo seleccionado (ej. desde <input type="file">)
 * @returns {Promise<{ ok: boolean, error?: string, imported?: number }>}
 */
function importAppStateFromFile(file) {
  return new Promise((resolve) => {
    if (!file || !file.name.toLowerCase().endsWith(".json")) {
      resolve({ ok: false, error: "Selecciona un archivo .json" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        resolve({ ok: false, error: "No se pudo leer el archivo." });
        return;
      }
      resolve(importAppStateFromJson(text));
    };
    reader.onerror = () => resolve({ ok: false, error: "Error al leer el archivo." });
    reader.readAsText(file, "UTF-8");
  });
}
