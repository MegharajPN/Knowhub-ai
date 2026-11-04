import api from "./api";

const askQuestion = async (question, topK = 5) => {
  const response = await api.post("documents/ask/", {
    question,
    top_k: topK,
  });

  return response.data;
};

export default askQuestion;