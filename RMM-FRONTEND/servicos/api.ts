import axios from "axios";

const link = 'http://localhost:2500'

const api = axios.create({
    baseURL: link,
});

export default api
