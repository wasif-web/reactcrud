
import express from "express";
import { customAlphabet } from 'nanoid';
import { MongoClient, ObjectId } from "mongodb";
import cors from 'cors';
import path from 'path';
import { PineconeClient } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// MongoDB URI
const mongodbURI = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.9ha3mra.mongodb.net/?retryWrites=true&w=majority`;

// Initialize MongoDB client
const client = new MongoClient(mongodbURI);


const pinecone = new PineconeClient();

const app = express();


app.use(express.json());
app.use(cors({
  origin: [
    //"http://localhost:3001",
    "*"
  ]
}));


app.use(express.static(path.join( "./web/build")));
app.use("/", express.static(path.join( "./web/build")));
app.use('/static', express.static(path.join('static')));

// Routes
app.get("/api/v1/stories", async (req, res) => {
  try {
    const queryText = "retreated";

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: queryText,
    });

    const vector = response?.data[0]?.embedding;
    console.log("vector: ", vector);

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const queryResponse = await index.query({
      queryRequest: {
        vector: vector,
        topK: 100,
        includeValues: true,
        includeMetadata: true,
        namespace: process.env.PINECONE_NAME_SPACE
      }
    });

    queryResponse.matches.map(eachMatch => {
      console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
    });

    console.log(`${queryResponse.matches.length} records found `);

    res.send(queryResponse.matches);
  } catch (error) {
    console.error("Error fetching stories:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.post("/api/v1/story", async (req, res) => {
  try {
    console.log("req.body: ", req.body);

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${req.body?.title} ${req.body?.body}`,
    });
    console.log("response?.data: ", response?.data);
    const vector = response?.data[0]?.embedding;
    console.log("vector: ", vector);

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const upsertRequest = {
      vectors: [
        {
          id: nanoid(),
          values: vector,
          metadata: {
            title: req.body?.title,
            body: req.body?.body,
          }
        }
      ],
      namespace: process.env.PINECONE_NAME_SPACE,
    };

    const upsertResponse = await index.upsert(upsertRequest);
    console.log("upsertResponse: ", upsertResponse);

    res.send({
      message: "Story created successfully"
    });
  } catch (e) {
    console.error("Error creating story:", e);
    res.status(500).send({ message: "Failed to create story, please try later" });
  }
});


app.use((req, res) => {
  res.status(404).send("Not Found");
});


const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});


client.connect()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err);
  });


pinecone.init({
  environment: process.env.PINECONE_ENVIRONMENT,
  apiKey: process.env.PINECONE_API_KEY,
})
  .then(() => {
    console.log("Connected to Pinecone");
  })
  .catch((err) => {
    console.error("Error connecting to Pinecone:", err);
  });
