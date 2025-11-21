import express from 'express';
import dotenv from 'dotenv';
import userRoutes from './routes/user';
import cityRoutes from './routes/city';
import tripRoutes from './routes/trip';


export const app = express();
dotenv.config();

app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/trip", tripRoutes);

