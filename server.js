// server.js

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  // Xử lý sự kiện khi nhận được dữ liệu từ client
  ws.on('message', function incoming(message) {
    console.log('Received:', message);

    // Xử lý dữ liệu nhận được và gửi kết quả trở lại cho client
    const result = processData(message); // Hàm processData() xử lý dữ liệu
    ws.send(JSON.stringify(result));
  });
});
