const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



// gNxXYrZGwP5ggGZF
// travel_bangla

const uri = "mongodb+srv://travel_bangla:gNxXYrZGwP5ggGZF@travel-bangla-cluster-0.dqjbkyt.mongodb.net/?appName=travel-bangla-cluster-0";


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db("Travel_Bangla");
        const haiku = database.collection("TravelPost");
        const Admin = database.collection("Admin");
        const admintravelposts = database.collection("admintravelposts");
        const reviews = database.collection("reviews");
        const userdetails = database.collection("userdetails");


        app.get('/travelPosts', async (req, res) => {
            const cursor = haiku.find(); // Use TravelPost collection
            const result = await cursor.toArray();
            res.send(result);
        });

        // Admin route for login (using GET)
        app.get("/travelBangla/admin", async (req, res) => {
            const { userName, userPassword } = req.query;
            console.log("UserName:", userName, "Password:", userPassword);

            try {
                const query = { userName };
                const user = await Admin.findOne(query);

                if (!user) {
                    return res.send({ valid: false, message: "User not found" });
                }

                if (user.userPassword === userPassword) {
                    return res.send({ valid: true });

                } else {
                    return res.send({ valid: false, message: "Incorrect password" });
                }
            } catch (error) {
                console.error("Login error:", error);
                return res.status(500).send({ valid: false, message: "Internal server error" });
            }
        });

        await haiku.createIndex({ expiryAt: 1 }, { expireAfterSeconds: 0 });
        app.post('/travelpostadd', async (req, res) => {
            // const data = req.body;
            const { expirySeconds, ...traveldetails } = req.body;
            // console.log(data);

            const document = {
                ...traveldetails,
                createdAt: new Date(),
                expiryAt: new Date(Date.now() + expirySeconds * 1000)
            };
            console.log("Travel Post:", document);

            const result = await haiku.insertOne(document);
            res.send(result);
        })



        // For Admin page...........................
        app.get('/admin/travelposts', async (req, res) => {
            const cursor = admintravelposts.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.post('/admin/travelposts', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await admintravelposts.insertOne(data);
            res.send(result)
        })

        app.post('/admin/reviews', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await reviews.insertOne(data);
            res.send(result)
        })

        app.get('/admin/reviews', async (req, res) => {
            const cursor = reviews.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/travelpostdetails/:_id', async (req, res) => {
            try {
                const _id = req.params._id;

                // Check if the _id is a valid ObjectId
                if (!ObjectId.isValid(_id)) {
                    return res.status(400).json({ message: 'Invalid ID format' });
                }

                // Convert the string _id to ObjectId
                const query = { _id: new ObjectId(_id) };
                const movie = await admintravelposts.findOne(query);

                // Check if movie exists
                if (!movie) {
                    return res.status(404).json({ message: 'Travel post not found' });
                }

                // Send the movie data as the response
                res.send(movie);

            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'An error occurred while fetching the travel post' });
            }
        });

        app.delete('/admin/review/:_id', async (req, res) => {
            const _id = req.params._id
            const query = { _id: new ObjectId(_id) };
            const result = await reviews.deleteOne(query);
            res.send(result)

        })

        // USer Details................
        app.post('/userdetails', async (req, res) => {
            try {
                const userData = req.body;

                const query = { uid: userData.uid };
                const existingUser = await userdetails.findOne(query);

                if (existingUser) {
                    const result = await userdetails.insertOne(userData);
                    return (res.status(200).send({ message: 'User already exits', user: existingUser.displayName }))
                }

                const result = await userdetails.insertOne(userData);
                res.status(201).json({ message: 'User created successfully', result });
            } catch (error) {
                console.error("Error inserting user : ", error)
                res.status(500).json({ message: 'Internal server error' });
            }
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);









app.get('/', (req, res) => {
    res.send("Travel Bangla server is running...");
});

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
