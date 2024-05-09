import express from "express";
import http from "http";
import morgan from "morgan";
import { Server as SocketServer } from "socket.io";
import { resolve, dirname } from "path";
import { PORT, OPENAI_API_KEY, context } from "./config.js"; // Asegúrate de tener una variable para tu clave de API de OpenAI
import cors from "cors";
import OpenAI from "openai";

// Initializations
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

let contextRes = [];

// console.log('ia peluchin', openai)

// Middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

app.use(express.static(resolve("frontend/dist")));

// const init = () => {

//   // io.off()
// }

// init()
contextRes = [{ role: "system", content: context }];
io.on("connection", (socket) => {
  socket.on("message", async (body) => {
    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: contextRes, //peluchin
        model: "gpt-3.5-turbo",
      });
      const choice = chatCompletion.choices;
      contextRes.push(
        {
          role: "system",
          content: choice[0].message.content,
        },
        {
          role: "user",
          content: body,
        }
      );
      io.emit("message", {
        body: choice[0].message.content,
        from: socket.id.slice(8),
      });
    } catch (error) {
      console.error("Error fallo el init:", error);
    }
  });
});

/*
io.on("connection", (socket) => {
  console.log(socket.id)
  socket.on("message", async (body) => {
    console.log('body',body)
    try {
      const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: body }],
        model: 'gpt-3.5-turbo',
      });
      const choice =  chatCompletion.choices
      console.log('respuesta de la ia',choice[0].message.content)
      io.emit("message", {
        body: choice[0].message.content,
        from: socket.id.slice(8),
      });
    } catch (error) {
      console.error('Error al generar respuesta de OpenAI:', error);
    }
  });
});
*/
server.listen(PORT);
console.log(`Servidor en puerto ${PORT}`);
