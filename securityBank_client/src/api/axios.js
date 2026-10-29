import axios from 'axios'

const HTTPS_PORT = import.meta.env.VITE_HTTPS_PORT || '8443'

const api = axios.create({
    baseURL: `https://localhost:${HTTPS_PORT}/api`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    } else {
        delete config.headers.Authorization
    }

    return config
})

export default api
