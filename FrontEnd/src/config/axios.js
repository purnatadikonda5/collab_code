import axios from 'axios';

const axiosinstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,  // Ensures cookies are sent with every request
    headers: {
        "Authorization": `Bearer ${localStorage.getItem('token')}`
    },
});

export default axiosinstance;
