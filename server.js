import express from "express";

import pkg from 'mongodb';
const { MongoClient, ObjectId } = pkg;

import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;

// 1. Middleware
app.use(express.json());

// Manual CORS Middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 2. Serve static files (lesson images) from "images" folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/images", (req, res) => {
  res.status(404).send("Image not found. Please check the URL.");
});
// 3. MongoDB connection
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://syedisrar:israr@cluster0.zf7pg.mongodb.net/";
const client = new MongoClient(uri);

let collectionForLessons;
let collectionForOrders;

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db("webstore");
    collectionForLessons = database.collection("lessons");
    collectionForOrders = database.collection("orders");

    app.get("/", (req, res) => {
      res.send(`
    <h1>Welcome to the Backend Server</h1>
    <ul>
      <li><a href="/orders">Go to Orders</a></li>
      <li><a href="/lessons">Go to lessons</a></li>
    </ul>
  `);
    });

    // GET /lessons – return raw docs (with native _id)
    app.get("/lessons", async function(request, response) {
        try {
            const allLessons = await collectionForLessons.find({}).toArray();
            response.status(200).send(allLessons);
        } catch (err) {
            console.log("Error retrieving lessons:", err);
            response.status(500).send({ error: "Unable to retrieve lessons" });
        }
    });

    // GET /orders – return all orders
    app.get("/orders", async (req, res) => {
      try {
        const orders = await collectionForOrders.find({}).toArray();
        res.json(orders);
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
      }
    });

    // POST /orders – create a new order
    app.post("/orders", async (req, res) => {
      try {
        const order = req.body;
        const result = await collectionForOrders.insertOne(order);
        res.status(201).json({ message: "Order created", orderId: result.insertedId });
      } catch (error) {
        console.error("Order error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // PUT /lessons/ – update a lesson (optional for admin)
    app.put("/lessons", async (req, res) => {
      try {
        const updateData = req.body;
        delete updateData._id;

        const result = await collectionForLessons.updateOne(
            { id: updateData.id },
            { $set: updateData }
        );

        res.json({ message: "Lesson updated" });
      } catch (error) {
        console.error("Error updating lesson:", error);
        res.status(500).json({ error: "Failed to update lesson" });
      }
    });

    // GET /search - Full text search on LessonName, Location, Price, Space
    app.get("/search", async (req, res) => {
      const query = (req.query.src || "").trim();

      try {
        // Return all lessons if search query is empty
        if (!query) {
          const lessons = await collectionForLessons.find({}).toArray();
          return res.json(lessons);
        }

        const regex = new RegExp(query, "i"); // case-insensitive regex

        const results = await collectionForLessons
          .find({
            $or: [
              { name: regex },
              { location: regex },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$cost" },
                    regex: query,
                    options: "i",
                  },
                },
              },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$availableinventory" },
                    regex: query,
                    options: "i",
                  },
                },
              },
            ],
          })
          .toArray();

        res.json(results);
      } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed." });
      }
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
  }
}

run().catch(console.dir);