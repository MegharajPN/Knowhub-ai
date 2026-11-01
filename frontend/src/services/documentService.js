
import api from "./api";

const documentService = {
  getDocuments: async () => {
    const response = await api.get("documents/");
    return response.data;
  },

  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
  
    console.log("Uploading PDF:", file.name, file.size, file.type);
  
    const response = await api.post("documents/", formData);
  
    return response.data;
  },

  deleteDocument: async (id) => {
    const response = await api.delete(`documents/${id}/`);
    return response.data;
  },
};

export default documentService;