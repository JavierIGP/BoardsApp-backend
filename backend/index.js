const express = require('express');
const morgan = require('morgan');
const app = express();
var expressWs = require('express-ws')(app);
const router = express.Router();
const jwt = require("jsonwebtoken");

const { mongoose } = require('./database');
const { v4: uuidv4 } = require('uuid');

const websocketController = require('./controllers/websocket.controller');

// Settings
const port = 3000
const SOCKET_KEY = 'ORUvj3PTe5KqytY8kaMy';

// Middlewares
app.use(morgan('dev'))
app.use(express.json())
app.use(express.static('public'));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// Routes

app.use('/',require('./routes/boards.routes'))

app.listen(port, () => {
    console.log(`Backend listening at port ${port}`)
})
app.disable('etag');

var sockets = {};
var cardsLock = {};
var intervals = {};
var onlineUsers = {};
var activeUsers = {};
var colors = ['blue', 'green', 'black', 'purple', 'red', 'orange', 'lightblue', 'lightgreen', 'lightpink', 'lightcoral'];
var userColors = {};

router.ws('/:id', function(ws, req) {

  /* register ws */
  ws.id = uuidv4();
  ws.isAlive = true;

  if (sockets[req.params.id] === undefined || sockets[req.params.id] == []) {
    sockets[req.params.id] = [ws];
    cardsLock[req.params.id] = {}
    onlineUsers[req.params.id] = [];
    userColors[req.params.id] = [0];
  } else {
    sockets[req.params.id] = sockets[req.params.id].concat([ws]);
  }

  console.log('OPENED WS: ' + ws.id);


  intervals[ws.id] = setInterval(function ping() {
    if (ws.isAlive === false) {
      var index = sockets[req.params.id].indexOf(ws);
      sockets[req.params.id].splice(index, 1);

      const userColorIndex = userColors[req.params.id].findIndex(el => el[0] === activeUsers[ws.id])
      userColors[req.params.id][userColorIndex] = 0
      
      sockets[req.params.id].forEach((socket) => {
        try {
          socket.send(JSON.stringify({
            type: 'USER_OFFLINE',
            email: activeUsers[ws.id],
            userColors: userColors[req.params.id],
          }));
        } catch {
            console.log(`Error sending payload to socket on id: ${req.params.id}`)
        }
      }); 

      for (let card of Object.keys(cardsLock[req.params.id])) {
        if (cardsLock[req.params.id][card] === activeUsers[ws.id]) {
          delete cardsLock[req.params.id][card]
          sockets[req.params.id].forEach((socket) => {
            try {
              socket.send(JSON.stringify({
                type: 'UNLOCK',
                cardId: {
                  cardId: card,
                }
              }));
                
            } catch {
                console.log(`Error sending unlock card to socket on id: ${req.params.id}`)
            }
        });
        }
      }
      const userIndex = onlineUsers[req.params.id].findIndex(el => el === activeUsers[ws.id]);
      onlineUsers[req.params.id].splice(userIndex, 1);
      
      clearInterval(intervals[ws.id]);
      console.log('CLOSING CONNECTION ON WS: ' + ws.id + ' DUE HEARTBEAT TIMEOUT')
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.send(JSON.stringify({
      type: 'heartbeat',
      kind: 'ping',
    }));
  }, 5000);


  ws.on('message', function(msg) {
    if (JSON.parse(msg).type !== 'heartbeat'){
      websocketController.handle(msg, req, sockets, ws, cardsLock, onlineUsers, activeUsers, colors, userColors);
    }
    else {
      msg = JSON.parse(msg)
      if (msg.kind === 'pong') {
        ws.isAlive = true;
      }
    }
  });

  /* unregister ws */
  ws.on('close', function() {
    console.log('CLOSED WS: ' + ws.id);
    clearInterval(intervals[ws.id]);
    var index = sockets[req.params.id].indexOf(ws);
    sockets[req.params.id].splice(index, 1);

    const userColorIndex = userColors[req.params.id].findIndex(el => el[0] === activeUsers[ws.id])
    userColors[req.params.id][userColorIndex] = 0
    
    sockets[req.params.id].forEach((socket) => {
        try {
          socket.send(JSON.stringify({
            type: 'USER_OFFLINE',
            email: activeUsers[ws.id],
            userColors: userColors[req.params.id],
          }));
        } catch {
            console.log(`Error sending payload to socket on id: ${req.params.id}`)
        }
    });

    for (let card of Object.keys(cardsLock[req.params.id])) {
      if (cardsLock[req.params.id][card] === activeUsers[ws.id]) {
        delete cardsLock[req.params.id][card]
        sockets[req.params.id].forEach((socket) => {
          try {
            socket.send(JSON.stringify({
              type: 'UNLOCK',
              cardId: {
                cardId: card,
              }
            }));
          } catch {
              console.log(`Error sending unlock card to socket on id: ${req.params.id}`)
          }
      });
      }
    }
    const userIndex = onlineUsers[req.params.id].findIndex(el => el === activeUsers[ws.id]);
    onlineUsers[req.params.id].splice(userIndex, 1);
  })
})

app.use('/ws', router)

