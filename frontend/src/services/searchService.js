import api from "./api";

const searchDocuments = async (query, topK = 5) => {
  const response = await api.post("documents/search/", {
    query,
    top_k: topK,
  });

  return response.data;
};

export default searchDocuments;