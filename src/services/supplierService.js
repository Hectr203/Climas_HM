import httpService from "./httpService";

const SupplierService = {
  async createSupplier(data) {
    try {
      const response = await httpService.post("proveedores/crear", data);
      return response.data;
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  },

  // ✅ LISTADO (requiere el endpoint GET /proveedores en backend)
  async getSuppliers() {
    try {
      const response = await httpService.get("proveedores");
      return response.data; // ✅ consistente
    } catch (error) {
      console.error("Error obteniendo proveedores:", error);
      throw error;
    }
  },

  // ✅ coincide con route: proveedores/obtener/{id}
  async getSupplierById(id) {
    try {
      const response = await httpService.get(`proveedores/obtener/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo proveedor por ID:", error);
      throw error;
    }
  },

  // ✅ coincide con route: proveedores/actualizar/{id}
  async updateSupplier(id, data) {
    try {
      const response = await httpService.put(`proveedores/actualizar/${id}`, data);
      return response.data;
    } catch (error) {
      console.error("Error actualizando proveedor:", error);
      throw error;
    }
  },

  // ✅ coincide con route: proveedores/eliminar/{id}
  async deleteSupplier(id) {
    try {
      const response = await httpService.delete(`proveedores/eliminar/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error eliminando proveedor:", error);
      throw error;
    }
  },
};

export default SupplierService;
