import { io } from 'socket.io-client';

let socketInstance = null;

export const initializeSocket = ({ projectId }) => {
    let token = localStorage.getItem('token');
    socketInstance = io(import.meta.env.VITE_API_URL, {
        auth: {
            token: token
        },
        query: {
            projectId: projectId
        }
    });
    return socketInstance;
};

export const getSocket = () => socketInstance;

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) {
        console.warn(`[Socket] Attempted to listen to '${eventName}' before socketInstance was initialized.`);
        return;
    }
    socketInstance.on(eventName, cb);
};

export const sendMessage = (eventName, data, ack) => {
    if (!socketInstance && data?.project) {
        initializeSocket({ projectId: data.project });
    }
    if (!socketInstance) {
        console.warn(`[Socket] Attempted to send '${eventName}' before socketInstance was initialized.`);
        return;
    }
    if (ack) {
        socketInstance.emit(eventName, data, ack);
    } else {
        socketInstance.emit(eventName, data);
    }
};