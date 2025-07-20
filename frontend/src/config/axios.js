import axios from 'axios';

// Use backend URL for API calls
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000', // Default to localhost:5000
  headers: {
    "Authorization": `Bearer ${localStorage.getItem('token')}`
  }
});


// const instance = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL,
//   withCredentials: true,
// });

export default axiosInstance;
