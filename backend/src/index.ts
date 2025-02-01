import express, {Request} from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { Pool } from "pg";
import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Elasticsearch Connection
const esClient = new Client({ 
    node: process.env.ELASTICSEARCH_URL, 
 });

app.use(cors());
app.use(bodyParser.json());

const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL Connected Successfully!");
    client.release();
  } catch (error) {
    console.error("PostgreSQL Connection Error:", error);
  }
};
testDbConnection();

const testElasticSearch = async () => {
  try {
    const health = await esClient.cluster.health();
    console.log("Elasticsearch Health:", health.status);
  } catch (error) {
    console.error("Elasticsearch Connection Error:", error);
  }
};

testElasticSearch();

app.post("/messages", async (req : Request, res: any) => {
    console.log(res);
  const { sender_name, message } = req.body;
  if (!sender_name || !message) return res.status(400).json({ error: "Missing fields" });
  try {
    const timestamp = new Date().toISOString();
    const result = await pool.query(
      "INSERT INTO messages (sender_name, message) VALUES ($1, $2) RETURNING *",
      [sender_name, message]
    );
    
    // Sync with Elasticsearch
    await esClient.index({
      index: "messages",
      document: { sender_name, message, timestamp }
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/messages", async (_, res) => {
  try {
    const result = await pool.query("SELECT * FROM messages ORDER BY timestamp DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

// Search messages from Elasticsearch
app.get("/search", async (req: any, res: any) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });
  
    try {
      const response = await esClient.search({
        index: "messages",
        query: {
          bool: {
            should: [
                { wildcard: { message: `*${query}*` } },
                { match_phrase_prefix: { message: query } },
                { match: { sender_name: query } }
            ],
            minimum_should_match: 1
          }
        },
        highlight: {
          fields: {
            message: {},
            sender_name: {}
          }
        },
        size: 10
      });
  
      res.json(response.hits.hits.map(hit => ({
        id: hit._id,
        ...hit._source as Object,
        highlight: hit.highlight
      })));
    } catch (error) {
      res.status(500).json({ error: "Search error", details: error });
    }
  }
);
  

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
