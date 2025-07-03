const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@trmcamp0.7libfgs.mongodb.net/?retryWrites=true&w=majority&appName=trmcamp0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("fasttrackDB");
    const parcelsCollection = database.collection("parcels");

    // Get All Parcels API
    app.get("/parcels", async (req, res) => {
      const parcels = await parcelsCollection.find().toArray();
      res.send(parcels);
    });
    // ✅ This API is created to GET parcels either for a specific user (by email) or all parcels (for admin)

    app.get("/parcels", async (req, res) => {
      try {
        const email = req.query.email;

        const parcelsCollection = client
          .db("fasttrackDB")
          .collection("parcels");

        let query = {};
        if (email) {
          query = { created_by: email }; // 🔹 If email provided → get parcels for that user only
        }

        const options = { sort: { creation_date: -1 } }; // 🔹 Sort parcels by latest first (Descending order)

        const parcels = await parcelsCollection.find(query, options).toArray();
        res.send(parcels);
      } catch (error) {
        console.error("Failed to fetch parcels:", error);
        res.status(500).send({ message: "Server error" });
      }
    });

    // Add Parcel API
    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Example route
app.get("/", (req, res) => {
  res.send("FastTrack Server is Running");
});

app.listen(port, () => {
  console.log(`🚀 FastTrack server running on  ${port}`);
});
