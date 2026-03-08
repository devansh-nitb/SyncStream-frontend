import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api/auth' });

// Add token to requests if it exists
API.interceptors.request.use((req) => {
  if (localStorage.getItem('token')) {
    req.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  }
  return req;
});

export default API;