"use client";
import { SocketContextProvider } from "@/context/SocketContext";
const SocketProvider = ({ children }) => {
    return <SocketContextProvider>{children}</SocketContextProvider>;
};
export default SocketProvider;
