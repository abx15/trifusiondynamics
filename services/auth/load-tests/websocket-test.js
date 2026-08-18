const io = require('socket.io-client');
const axios = require('axios');

async function run() {
  console.log('--- WEBSOCKET TESTING ---');
  const CLIENT_COUNT = 10;
  const MESSAGES_PER_CLIENT = 5;
  const TOKEN = 'test_admin_token';
  let connectedClients = 0;
  let deliveredMessages = 0;

  const clients = [];

  for (let i = 0; i < CLIENT_COUNT; i++) {
    const socket = io('http://localhost:3000/chat', {
      auth: { token: TOKEN },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      connectedClients++;
      const ticketId = `ticket_${i % 3}`; // Share some rooms
      
      // Join room
      socket.emit('joinRoom', { ticketId });

      // Listen for messages
      socket.on('newMessage', (msg) => {
        if (msg.ticketId === ticketId) {
          deliveredMessages++;
        }
      });

      // Send messages
      for (let j = 0; j < MESSAGES_PER_CLIENT; j++) {
        setTimeout(() => {
          socket.emit('sendMessage', {
            ticketId: ticketId,
            content: `Message ${j} from client ${i}`
          });
        }, Math.random() * 5000);
      }
    });

    socket.on('connect_error', (err) => {
      console.error(`Client ${i} connect error:`, err.message);
    });

    clients.push(socket);
  }

  // Wait 10 seconds for all messages
  setTimeout(() => {
    console.log(`Connected Clients: ${connectedClients}/${CLIENT_COUNT}`);
    // Delivered messages should be CLIENT_COUNT * MESSAGES_PER_CLIENT times the number of users in that room.
    console.log(`Delivered Messages Count: ${deliveredMessages}`);
    
    clients.forEach(c => c.disconnect());
    process.exit(0);
  }, 10000);
}

run();
