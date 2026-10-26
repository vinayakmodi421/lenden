export const api_url = "http://localhost:5000/api";
import { io } from "socket.io-client";

export const socket = io("http://localhost:5000",{
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

socket.on("connect_error", async (error) => {
    console.log("error" , error)
    if (error.message === "ACCESS_TOKEN_EXPIRED" || error.message === "Invalid token" || error.message === "Access token missing") {
        try {
            const response = await fetch(
                "http://localhost:5000/api/refresh",
                {
                    method: "POST",
                    credentials: "include"
                }
            );
            if (!response.ok) {
                throw new Error("Refresh failed");
            }
            socket.connect();
        } catch (error) {
            console.log("Session expired");
        }
    }
});

const storedUser = localStorage.getItem("user");
if (!storedUser) {
    socket.io.engine.on("ping", () => {
        console.log("PING");
    });
    
    socket.io.engine.on("pong", () => {
      console.log("PONG");
    });
};

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const requestOptions: RequestInit = {
        ...options,
        credentials: "include",
    };
    try {
        const response: any = await fetch(`${api_url}${endpoint}`, requestOptions);

        if (response.status == 401) {
            try {
                const response1 = await fetch(
                    "http://localhost:5000/api/refresh",
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );

                if (!response1.ok) {
                    throw new Error("Refresh failed");
                }

            } catch (error) {
                // console.log("Session expired");
                localStorage.removeItem("user");
                if (window.location.pathname !== "/login") {
                    console.log("remove user");
                    window.location.assign("/login");
                }
            }
        }

        return response;
    } catch (error) {
        console.log("error", error);
        throw error;
    }
}

export function getStoredAdminId() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return "";
  try {
    const parsedUser = JSON.parse(storedUser)
    return parsedUser.id 
  } catch {
    return "";
  }
}

export function getStoredAdminUsername() {
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return "";
  try {
    const parsedUser = JSON.parse(storedUser)
    return parsedUser.username
  } catch {
    return "";
  }
}

export function debounce(callback: Function, delay: number) {   
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {    
      clearTimeout(timer);
      timer = setTimeout(() => {     
          callback(...args);
        }, delay);
    };
}
