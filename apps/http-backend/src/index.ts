import express from 'express';
import cors from 'cors';
import { router } from './routes/user.js';

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/v1',router);

app.listen(4000, () => console.log("listening at port 4000"));