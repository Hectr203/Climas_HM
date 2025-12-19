import httpService from "./httpService";

const SupplierService = {
  async createSupplier(data) {
    const response = await httpService.post("/proveedores/crear", data);
    return response.data;
  },

  async getSuppliers() {
    const response = await httpService.get("/proveedores");
    return response.data;
  },

  async getSupplierById(id) {
    const response = await httpService.get(`/proveedores/obtener/${id}`);
    return response.data;
  },

  async updateSupplier(id, data) {
    const response = await httpService.put(`/proveedores/actualizar/${id}`, data);
    return response.data;
  },

  async deleteSupplier(id) {
    const response = await httpService.delete(`/proveedores/eliminar/${id}`);
    return response.data;
  },

  /* =========================
     OCUPACIONES (NUEVO)
  ========================= */
  async createOccupation(data) {
    // data = { nombre: string }
    const response = await httpService.post(
      "/ocupacionesProveedores/crear",
      data
    );
    return response.data;
  },

  async getOccupations() {
    const response = await httpService.get("/ocupacionesProveedores");
    return response.data;
  },
};

export default SupplierService;
