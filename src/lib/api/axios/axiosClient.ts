import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const axiosClient = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosClient;
