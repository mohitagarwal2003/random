import express, { text } from "express";
import { Storage } from "@google-cloud/storage";
import multer from "multer";
// import { app } from "./app.js";
import connectdb from "../backend/db/index.js";
import routes from "./routes/posts.js";
import dotenv from "dotenv";
import fs from "fs";
import pdfParse from "pdf-parse";
// import pdfParse from "pdf-parse/lib/pdf-parse";
import axios from "axios";
import bcrypt from "bcryptjs";

import { PDFText } from "./models/pdfText.js";
import authRoutes from "./routes/auth.js";

dotenv.config({
  path: "./.env",
});
console.log("test" + process.env.MONGODB_URI);

const app = express();
app.use(
  express.json({
    verify: (req, res, buf, encoding) => {
      req.rawBody = buf.toString(encoding || "utf8");
    },
  })
);

app.use(express.static("dist"));
// app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRoutes);
//-------------------connection with db-----------
connectdb()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

// const newUser = new User({
//   name: "karan",
//   email: "karan@example.com",
//   password: "karan.in", // This will be hashed before saving
// });
//   console.log('User added');
//  newUser.save();

// Twilio configuration
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = new Twilio(accountSid, authToken);

// // Endpoint to receive WhatsApp messages
// app.post("/whatsapp", (req, res) => {
//   const incomingMessage = req.body.Body; // WhatsApp message body
//   const from = req.body.From; // User's WhatsApp number

//   // Process the user query with ChatGPT
//   handleUserQuery(incomingMessage).then((responseMessage) => {
//     // Send response back to WhatsApp user
//     client.messages
//       .create({
//         body: responseMessage,
//         from: "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER, // Your Twilio WhatsApp number
//         to: "whatsapp:" + 8440900140, //from, // User's WhatsApp number
//       })
//       .then((message) => console.log(`Message sent: ${message.sid}`))
//       .catch((error) => console.error("Error sending message:", error));
//   });

//   res.sendStatus(200);
// });

// // Function to process user query using ChatGPT
// async function handleUserQuery(query) {
//   const apiKey = process.env.OPENAI_API_KEY;

//   try {
//     const response = await axios.post(
//       "https://api.openai.com/v1/chat/completions",
//       {
//         model: "gpt-3.5-turbo",
//         messages: [{ role: "user", content: query }],
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${apiKey}`,
//         },
//       }
//     );
//     return response.data.choices[0].message.content; // ChatGPT's response
//   } catch (error) {
//     console.error("Error calling ChatGPT API:", error);
//     return "Sorry, I could not process your request.";
//   }
// }

app.get("/api/health", (req, res) => {
  res.send("server is ready");
});

app.use("/", routes);

const upload = multer({ storage: multer.memoryStorage() });

const storage = new Storage({
  keyFilename: "key.json",
});

const bucketName = "mohitagarwal";
const bucket = storage.bucket(bucketName);

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("file not uploaded");
  }

  const fileName = Date.now() + "-" + file.originalname;

  const blob = bucket.file(fileName);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });
  blobStream.on("error", (err) => {
    console.error("Error uploading file:", err); // Log the error
    return res.status(500).send(err);
  });
  blobStream.on("finish", async () => {
    // Automatically parse the PDF after upload
    try {
      // console.log(fileName);
      const localFilePath = await downloadPDF(fileName); // Download the PDF locally
      // console.log(localFilePath);
      const dataBuffer = fs.readFileSync(localFilePath); // Read the local file
      // console.log(dataBuffer);
      const pdfData = await pdfParse(dataBuffer); // Parse the PDF
      // console.log("wht mongodb is ->");
      // console.log(fileName);
      // const pdfData = await pdfParse(dataBuffer); // Parse the PDF
      // if (pdfData && pdfData.text) {
      //   console.log("Parsed PDF text:", pdfData.text); // Log the extracted text
      // } else {
      //   console.error(
      //     "Failed to extract text from the PDF. Parsed data:",
      //     pdfData
      //   );
      // }
      // Store text in MongoDB
      const pdfRecord = new PDFText({
        fileName: fileName,
        text: pdfData.text,
      });

      await pdfRecord.save(); // Save the parsed text to MongoDB

      res.json({
        message: "PDF uploaded, parsed, and text stored.",
        id: pdfRecord._id,
      });
    } catch (error) {
      console.error("Error parsing or storing PDF text:", error);
      res.status(500).send("Error processing PDF.");
    }
  });
  blobStream.end(file.buffer);
});

// New Route: Fetch text from MongoDB and send it to ChatGPT
app.get("/api/process-pdf", async (req, res) => {
  try {
    const pdfRecord = await PDFText.findOne().sort({ createdAt: -1 }); // Get latest parsed PDF text
    if (!pdfRecord)
      return res.status(404).send("No PDF text found in database");

    const gptResponse = await sendToChatGPT(pdfRecord.text); // Send text to ChatGPT API
    res.json({ message: "Success", gptResponse });
  } catch (error) {
    res.status(500).send("Error processing text.");
  }
});

// Function to send text to ChatGPT
const sendToChatGPT = async (text) => {
  const apiKey = process.env.OPENAI_API_KEY;
  // console.log(apiKey);
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      { model: "gpt-3.5-turbo", messages: [{ role: "user", content: text }] },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling ChatGPT API:", error);
    throw new Error("ChatGPT API failed");
  }
};

// Route to get all files
app.get("/api/files", async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const fileNames = files.map((file) => file.name);
    res.json(fileNames);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).send("Error fetching files from storage.");
  }
});

// Route to download a file
app.get("/api/download/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  console.log(fileName);

  const file = bucket.file(fileName);

  try {
    file
      .createReadStream()
      .on("error", (err) => {
        console.error("Error reading file:", err);
        res.status(500).send("Error downloading file.");
      })
      .pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).send("Error downloading file.");
  }
});

// Route to delete a file
app.post("/api/delete", async (req, res) => {
  const fileName = req.body.fileName;

  if (!fileName) {
    return res.status(400).send("Filename is required.");
  }

  const file = bucket.file(fileName);

  try {
    await file.delete();
    res.send("File deleted");
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).send("Error deleting file.");
  }
});

// <---------- PARSING PDF --------------->

// app.post("/api/parse-pdf", async (req, res) => {
//   const { fileName } = req.body;
//   console.log(fileName);

//   if (!fileName) {
//     return res.status(400).send("No file name provided.");
//   }

//   try {
//     // Download PDF
//     const localFilePath = await downloadPDF(fileName);

//     // Parse PDF
//     const dataBuffer = fs.readFileSync(localFilePath);
//     const pdfData = await pdfParse(dataBuffer);

//     // Store text using Mongoose
//     const pdfRecord = new PDFText({
//       fileName: fileName,
//       text: pdfData.text,
//     });

//     await pdfRecord.save();

//     res
//       .status(200)
//       .send({ message: "PDF parsed and text stored.", id: pdfRecord._id });
//   } catch (error) {
//     console.error("Error parsing or storing PDF text:", error);
//     res.status(500).send("Error processing PDF.");
//   }
// });

async function downloadPDF(fileName) {
  const file = bucket.file(fileName);
  const localFilePath = `./${fileName}`; // Define the local path to store the PDF
  await file.download({ destination: localFilePath });
  console.log(`Downloaded ${fileName} from GCS to ${localFilePath}.`);
  return localFilePath; // Return the local file path for parsing
}
// app.post("*", async (req, res) => {
//   console.log("Hit the wildcard route");
//   console.log("Request Body in * route:", req.body);
//   res.send("Hello from wildcard route");
// });
// app.get("*", async (req, res) => {
//   res.send("Hello Get");
// });
// Add a webhook for Telegram to receive messages
app.post("/webhook", async (req, res) => {
  console.log("Webhook hit"); // Log the hit
  console.log("Raw body:", req.rawBody);
  console.log("Webhook received:", req.body); // Log the entire request body
  // res.send("Hello from wildcard route");
  const message = req.body.message;

  if (message && message.text) {
    const chatId = message.chat.id;
    const userQuery = message.text;
    
    // Call OpenAI API with the user's query
    const openAiResponse = await getOpenAIResponse(userQuery);

    // Send the response back to Telegram
    await sendMessageToTelegram(chatId, openAiResponse);
    res.sendStatus(200); // Acknowledge Telegram we received the message
  } else {
    console.log("No message found in request");
    res.sendStatus(200); // Acknowledge Telegram, but no message found
  }
});

// Function to get response from OpenAI API
const getOpenAIResponse = async (userQuery) => {
  try {
    // Fetch latest PDF text from MongoDB
    const pdfRecord = await PDFText.findOne().sort({ createdAt: -1 });
    const contextText = pdfRecord ? pdfRecord.text : "";
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: userQuery }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content; // Extract the AI response
  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    return "Sorry, I could not process your request.";
  }
};

// Function to send message back to Telegram
const sendMessageToTelegram = async (chatId, text) => {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  console.log("ok we are in send message function");
  try {
    await axios.post(url, {
      chat_id: chatId,
      text: text,
    });
    console.log("Sending message to chat ID:", chatId);
  } catch (error) {
    console.error("Error sending message to Telegram:", error.response.data);
    throw error; // Re-throw the error to be caught in the webhook handler
  }
};
