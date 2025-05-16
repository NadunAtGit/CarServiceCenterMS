import axios from "axios";
import { BASE_URL } from "./Constants";

const AxiosInstance=axios.create({
    baseURL:BASE_URL,
    timeout:20000,
    headers:{
        "Content-Type":"application/json"
    }
});

AxiosInstance.interceptors.request.use(
    (config)=>{
        const accessToken=localStorage.getItem("token");
        if(accessToken){
            config.headers.Authorization=`Bearer ${accessToken}`;
        }
        return config;
    },
    (error)=>{
        return Promise.reject(error);
    }
);

export default AxiosInstance;