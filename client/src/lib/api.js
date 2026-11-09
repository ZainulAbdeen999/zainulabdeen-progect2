import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 25000
});

export function apiMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

export function apiCode(error) {
  return error?.response?.data?.error?.code;
}

export function apiDetails(error) {
  return error?.response?.data?.error?.details || [];
}
