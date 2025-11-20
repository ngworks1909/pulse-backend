import express from "express";
import {PrismaClient} from '.prisma/client';

const app = express();

const prisma = new PrismaClient();

app.use(express.json());

app.get("/", async(req, res) => {
  const data = await prisma.user.findMany();
  res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});