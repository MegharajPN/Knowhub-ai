import api from "./api";

export const getConversations = async () => {
  const response = await api.get("conversations/");
  return response.data;
};

export const createConversation = async (title = "New Chat") => {
  const response = await api.post("conversations/", { title });
  return response.data;
};

export const getConversation = async (conversationId) => {
  const response = await api.get(`conversations/${conversationId}/`);
  return response.data;
};

export const askConversation = async (
  conversationId,
  question,
  topK = 5
) => {
  const response = await api.post(
    `conversations/${conversationId}/ask/`,
    {
      question,
      top_k: topK,
    }
  );

  return response.data;
};

export const deleteConversation = async (conversationId) => {
  await api.delete(`conversations/${conversationId}/`);
};