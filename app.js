import {createServer} from 'node:http';
import next from 'next';

const hostname = process.env.HOSTNAME || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const app = next({dev: false, hostname, port});
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
 handle(req, res);
}).listen(port, hostname);
