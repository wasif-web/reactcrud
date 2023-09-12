import express from "express";
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('1234567890', 20);
import { MongoClient } from "mongodb";
import cors from 'cors';
import path from 'path';
import { PineconeClient } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const mongodbURI = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.9ha3mra.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(mongodbURI);
const database = client.db('ecom');
const productsCollection = database.collection('products');

const pinecone = new PineconeClient();

(async () => {
  await pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT,
    apiKey: process.env.PINECONE_API_KEY,
  });

  const app = express();
  app.use(express.json());
  app.use(cors(`*`));

  app.get("/api/v1/stories", async (req, res) => {
    const queryText = "";

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
        includeValues: false,
        includeMetadata: true,
        // namespace: process.env.PINECONE_NAME_SPACE
      }
    });

    queryResponse.matches.map(eachMatch => {
      console.log(`score ${eachMatch.score.toFixed(1)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
    });
    console.log(`${queryResponse.matches.length} records found `);

    res.send(queryResponse.matches);
  });

  app.get("/api/v1/search", async (req, res) => {
    const queryText = req.query.q;

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
        topK: 20,
        includeValues: false,
        includeMetadata: true,
        // namespace: process.env.PINECONE_NAME_SPACE
      }
    });

    queryResponse.matches.map(eachMatch => {
      console.log(`score ${eachMatch.score.toFixed(3)} => ${JSON.stringify(eachMatch.metadata)}\n\n`);
    });
    console.log(`${queryResponse.matches.length} records found `);

    res.send(queryResponse.matches);
  });

  app.post("/api/v1/story", async (req, res) => {
    const startTime = new Date();
    console.log("req.body: ", req.body);

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${req.body?.title} ${req.body?.body}`,
    });
    const vector = response?.data[0]?.embedding;

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
      // namespace: process.env.PINECONE_NAME_SPACE,
    };
    try {
      const upsertResponse = await index.upsert({ upsertRequest });
      const responseTime = new Date() - startTime;
      console.log("pinecone responseTime: ", responseTime);

      res.send({
        message: "story created successfully"
      });
    } catch (e) {
      console.log("error: ", e);
      res.status(500).send({
        message: "failed to create story, please try later"
      });
    }
  });

  app.put("/api/v1/story/:id", async (req, res) => {
    console.log("req.params.id: ", req.params.id);
    console.log("req.body: ", req.body);

    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: `${req.body?.title} ${req.body?.body}`,
    });
    const vector = response?.data[0]?.embedding;

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const upsertRequest = {
      vectors: [
        {
          id: req.params.id,
          values: vector,
          metadata: {
            title: req.body?.title,
            body: req.body?.body,
          }
        }
      ],
      // namespace: process.env.PINECONE_NAME_SPACE,
    };
    try {
      const upsertResponse = await index.upsert({ upsertRequest });
      res.send({
        message: "story updated successfully"
      });
    } catch (e) {
      console.log("error: ", e);
      res.status(500).send({
        message: "failed to create story, please try later"
      });
    }
  });

  app.delete("/api/v1/story/:id", async (req, res) => {
    try {
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
      const deleteResponse = await index.delete1({
        ids: [req.params.id],
        // namespace: process.env.PINECONE_NAME_SPACE
      });
      console.log("deleteResponse: ", deleteResponse);
      res.send({
        message: "story deleted successfully"
      });
    } catch (e) {
      console.log("error: ", e);
      res.status(500).send({
        message: "failed to create story, please try later"
      });
    }
  });

  // app.use(express.static(path.join(__dirname, "./web/build")));
  // app.use("/", express.static(path.join(__dirname, "./web/build")));

  // app.use('/static', express.static(path.join(__dirname, 'static')));

  app.use((req, res) => {
    res.status(404).send("not found");
  });

  const port = process.env.PORT || 5001;
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
})();
