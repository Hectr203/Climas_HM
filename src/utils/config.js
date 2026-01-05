
// Configuración centralizada de variables de entorno para Vite
// Solo la URL del backend

class EnvConfig {
  static get API_URL() {
    return import.meta.env.VITE_API_URL || "https://climasapi-fhfsgfedgsb7a5he.mexicocentral-01.azurewebsites.net/api";
  }

  // Validación básica
  static validateRequiredEnvVars() {
    const required = ["VITE_API_URL"];
    const missing = required.filter((envVar) => !import.meta.env[envVar]);
    if (missing.length > 0) {
      console.warn("⚠️ Falta la variable de entorno requerida:", missing);
    }
    return missing.length === 0;
  }

  // Debug helper
  static logConfig() {
    console.group("🔧 Configuración de entorno");
  // console.log eliminado
    console.groupEnd();
  }
}

// Validar al importar
EnvConfig.validateRequiredEnvVars();

export default EnvConfig;
