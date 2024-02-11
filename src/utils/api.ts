import axios from "axios";

const api = axios.create({
  baseURL: "http://206.189.24.117:3005/api/",
  timeout: 10000,
});

export default api;
