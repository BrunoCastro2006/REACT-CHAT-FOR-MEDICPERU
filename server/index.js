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

let arrayResponde = [];

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

let entrada = [];

io.on("connection", (socket) => {
  socket.on("message", async (body) => {
    //datos de entrada:
    entrada = entrada
      .concat({
        role: "assistant",
        content: contextRes[0].content,
      })
      .concat({
        role: "user",
        content: body,
      });

    try {
      console.log(
        "======================INCIO",
        entrada,
        "======================FIN"
      );
      const chatCompletion = await openai.chat.completions.create({
        messages: entrada,
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        presence_penalty: 0.5, // Reduciendo la penalización por presencia para evitar repetición excesiva
      });
      const choice = chatCompletion.choices;
      contextRes = [
        {
          role: "system",
          content: choice[0].message.content,
        },
      ];
      let citaMedicaString = choice[0].message.content;

      let validar = extraerJSONDesdeTexto(citaMedicaString);

      if (validar) {
        io.emit("message", {
          body: "Cita agendada con exito, te llegara una notificacion al correo mencionado.",
          from: socket.id.slice(8),
        });

        // JSON:
        console.log("FORMATO JSON: ", validar);
      } else {
        console.log("RESPUESTA NORMAL: ", choice[0].message.content);
        //emite mensaje
        io.emit("message", {
          body: choice[0].message.content,
          from: socket.id.slice(8),
        });
      }
    } catch (error) {
      console.error("Error fallo el init:", error);
    }
  });
});

function extraerJSONDesdeTexto(texto) {
  console.log("entro a la funcion");

  const regex = /{[^}]*}/g; // Expresión regular para encontrar JSON en el texto
  console.log("este es el texto antes de formatearlo: " + texto);

  const jsonMatches = texto.match(regex); // Encuentra todas las coincidencias de JSON en el texto

  if (jsonMatches) {
    console.log("entro al if");
    console.log(jsonMatches);

    const jsonObjects = jsonMatches.map((match) => JSON.parse(match)); // Parsea cada coincidencia a objeto JSON
    console.log("retorno esto:" + jsonObjects);

    return jsonObjects;
  } else {
    console.log("no encontro json en el texto");

    return null; // Retorna null si no se encontró ningún JSON en el texto
  }
}
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
