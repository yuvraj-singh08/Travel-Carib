import axios from "axios";

const baseURL = "https://ssl00.kiusys.com/ws3/index.php";

const axiosInstance = axios.create({
    baseURL: `${baseURL}`, // Base URL for all requests
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded' // Default content type
    }
})

export default axiosInstance;