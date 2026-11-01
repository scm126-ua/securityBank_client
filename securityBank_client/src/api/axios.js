import axios from 'axios'

// La sesión viaja en una cookie HttpOnly que el navegador envía solo a la API:
// el token no es accesible desde JavaScript.
const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
})

export default api
