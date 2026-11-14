import api from "./api";

const webSourceService = {
  getWebSources: async () => {
    const response = await api.get("documents/web-sources/");
    return response.data;
  },

  createWebSource: async (rootUrl, maxPages = 5) => {
    const response = await api.post("documents/web-sources/", {
      root_url: rootUrl,
      max_pages: maxPages,
    });

    return response.data;
  },

  getWebSource: async (id) => {
    const response = await api.get(`documents/web-sources/${id}/`);
    return response.data;
  },

  deleteWebSource: async (id) => {
    const response = await api.delete(`documents/web-sources/${id}/`);
    return response.data;
  },
};

export default webSourceService;