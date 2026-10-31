
import api from "./api";

const register = async (userData) => {
  const response = await api.post("auth/register/", userData);
  return response.data;
};

const login = async (email, password) => {
  const response = await api.post("auth/login/", {
    username: email,
    password,
  });

  localStorage.setItem("access_token", response.data.access);
  localStorage.setItem("refresh_token", response.data.refresh);

  return response.data;
};

const getCurrentUser = async () => {
  const response = await api.get("auth/me/");
  return response.data;
};

const logout = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
};

const authService = {
  register,
  login,
  getCurrentUser,
  logout,
};

export default authService;