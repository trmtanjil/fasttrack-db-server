const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//stripe secret key 
const stripe = require('stripe')(process.env.PAYMENT_GETWAY_KEY);



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
    const paymentsCollection= database.collection("payments")

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

    // ✅ Get Single Parcel by ID
    app.get("/parcels/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const parcel = await parcelsCollection.findOne(query);
      if (!parcel) {
        return res.status(404).send({ message: "Parcel Not Found" });
      }
      res.send(parcel);
    });

    // Add Parcel API
    app.post("/parcels", async (req, res) => {
      const parcel = req.body;
      const result = await parcelsCollection.insertOne(parcel);
      res.send(result);
    });




    //start mayment system emplyment


    app.post("/create-payment-intent", async (req, res) => {
      const amountInCents = req.body.amountInCents
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents, // Amount in cents
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

 

app.post('/payments', async (req, res) => {
  try {
    // ✅ Destructure incoming payment data from request body
    const { parcelId: parchelId, amount, transactionId, email,paymentMethod } = req.body;


     // 2️⃣ Update parcel's payment_status to 'paid'
    const parcelResult = await parcelsCollection.updateOne(
      { _id: new ObjectId(parchelId) },

      {
         $set: { 
          payment_status: 'paid' 

         }
         }
    );


    // ✅ Create paymentDoc to store in payments collection
    const paymentDoc = {
      parcelId: parchelId,
      amount: amount,
      transactionId: transactionId,
      email: email,
      paymentMethod:paymentMethod,
      payment_date: new Date().toISOString(),
     
    };

    // 1️⃣ Save payment to payments collection
    const paymentResult = await paymentsCollection.insertOne(paymentDoc);

   

    res.send({
      success: true,
      message: 'Payment processed successfully',
      paymentId: paymentResult.insertedId,
      parcelUpdated: parcelResult.modifiedCount > 0,
      paymentDoc: paymentDoc
    });

  } catch (error) {
    console.error('Payment Processing Error:', error);
    res.status(500).send({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
});


 
app.get('/payments', async (req, res) => {
  try {
    const email = req.query.email;


    let query = {};
    if (email) {
      query = { email };  // Filter by user email
    }

    const payments = await paymentsCollection.find(query).sort({ payment_date: -1 }).toArray();
    res.send(payments);

  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Failed to fetch payments', error });
  }
});











    // ✅ DELETE Parcel API
    // Endpoint: DELETE /parcels/:id
    app.delete("/parcels/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await parcelsCollection.deleteOne(query);

      if (result.deletedCount > 0) {
        res.send({ success: true, deletedCount: result.deletedCount });
      } else {
        res.status(404).send({ success: false, message: "Parcel not found" });
      }
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
