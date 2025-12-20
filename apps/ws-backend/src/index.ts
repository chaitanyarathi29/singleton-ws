import { WebSocketServer } from 'ws';
import { User } from './User.js';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(ws,req) {
  const params = new URLSearchParams(req.url?.split('/')[1]);
  const token = params.get('token');
  if(!token){
    ws.close();
    throw new Error( 'not authorized');
  }
  ws.on('error', console.error);
  
  let user = new User(ws,token);
});