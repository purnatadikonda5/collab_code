import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
    query: { projectId: '6859018f864b6b537c3a250f' }
});

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('project-message', {
        project: '6859018f864b6b537c3a250f',
        message: '@ai hi'
    });
});

socket.on('agent:thought', (data) => console.log('Thought:', data));
socket.on('agent:tool_call', (data) => console.log('Tool:', data));
socket.on('agent:final_answer', (data) => {
    console.log('Final Answer:', data);
    process.exit(0);
});
socket.on('agent:error', (data) => {
    console.log('Error:', data);
    process.exit(1);
});
socket.on('project-message', (data) => console.log('Project Message:', data));

setTimeout(() => {
    console.log('Timeout');
    process.exit(1);
}, 15000);
