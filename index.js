const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors(
    {
        origin: [
            'http://localhost:5173',
            'https://travel-bangla-4e034.web.app',
            'https://travel-bangla-4e034.firebaseapp.com'

        ],
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.MON_USER_NAME}:${process.env.MON_PASSWORD}@travel-bangla-cluster-0.dqjbkyt.mongodb.net/?appName=travel-bangla-cluster-0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const tokenVerified = (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token);

    if (!token) {
        return res
            .status(401)
            .send({ message: 'Unauthorized, Token not found, Are you froud ?' })

    }

    jwt.verify(token, process.env.JWT_SECRET,
        function (err, decoded) {
            // console.log(decoded)
            if (err) {
                return res
                    .status(401)
                    .send({ message: 'Unauthorize, Invalid token' })
            }
            // console.log(decoded.email);
            req.user = decoded.email;
            next();
        });
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db("Travel_Bangla");
        const haiku = database.collection("TravelPost");
        const Admin = database.collection("Admin");
        const admintravelposts = database.collection("admintravelposts");
        const reviews = database.collection("reviews");
        const userdetails = database.collection("userdetails");
        const tourbookedlist = database.collection("tourbookedlist");
        const favoritelist = database.collection("favoritelist");



        app.get('/travelPosts', async (req, res) => {
            const currentPage = parseInt(req.query.page) || 0
            const limit = parseInt(req.query.limit) || 6
            const skip = currentPage * limit

            // console.log(currentPage, limit);
            const cursor = haiku.find(); // Use TravelPost collection
            const result = await cursor.skip(skip).limit(limit).toArray();
            res.send(result);
        });
        app.get('/travelPostscount', async (req, res) => {
            const count = await haiku.estimatedDocumentCount();
            // console.log(count);
            res.send(count);
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
            const page = parseInt(req.query.page) || 1;   // default to 0
            const limit = parseInt(req.query.limit) || 6; // default to 6
            const skip = (page - 1) * limit
            const cursor = admintravelposts.find();
            const result = await cursor.skip(skip).limit(limit).toArray();
            res.send(result)
        })

        app.get('/admin/travelpostsCount', async (req, res) => {
            const count = await admintravelposts.estimatedDocumentCount()
            res.send(count)
        })


        app.post('/admin/travelposts', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await admintravelposts.insertOne(data);
            res.send(result)
        })
        //////////////////////////Boked list///////////////
        app.post('/admin/travelposts/Booked', async (req, res) => {
            const data = req.body;

            try {
                // Check if this user already booked this post
                const existingBooking = await tourbookedlist.findOne({
                    postId: data.postId,
                    userId: data.userId
                });

                if (existingBooking) {
                    return res.status(400).send({ success: false, message: "Already booked" });
                }

                // Add a timestamp (optional but useful)
                data.createdAt = new Date();

                const result = await tourbookedlist.insertOne(data);
                res.send({ success: true, message: "Booking successful", insertedId: result.insertedId });

            } catch (error) {
                console.error("Booking error:", error);
                res.status(500).send({ success: false, message: "Server error" });
            }
        });
        //////////////////////Favorite List full details(Aggrigrate) ///////////////
        app.get('/bookedlist', async (req, res) => {
            try {
                const email = req.query.email;
                const result = await tourbookedlist.aggregate([
                    {
                        $match: { userEmail: email }
                    },
                    {
                        $addFields: {
                            postObjId: { $toObjectId: "$postId" }
                        }
                    },
                    {
                        $lookup: {
                            from: 'admintravelposts', // Matches your travel post collection
                            localField: 'postObjId',
                            foreignField: '_id',
                            as: 'postDetails'
                        }
                    },
                    {
                        $unwind: "$postDetails"
                    },
                    {
                        $replaceRoot: { newRoot: "$postDetails" }
                    }
                ]).toArray();
                console.log(result);

                res.send(result);

            } catch (error) {
                console.error("Error fetching favorite posts:", error);
                res.status(500).send({ error: "Failed to fetch favorite list" });
            }
        });


        ///////////////////////////////Favorite List/////////////////
        app.post('/admin/travelposts/favorite', async (req, res) => {
            const data = req.body;

            try {
                // Check if this user already booked this post
                const existingBooking = await favoritelist.findOne({
                    postId: data.postId,
                    userId: data.userId
                });

                if (existingBooking) {
                    return res.status(400).send({ success: false, message: "Already in favorite list" });
                }

                // Add a timestamp (optional but useful)
                data.createdAt = new Date();

                const result = await favoritelist.insertOne(data);
                res.send({ success: true, message: "Add favorite successful ", insertedId: result.insertedId });

            } catch (error) {
                console.error("Booking error:", error);
                res.status(500).send({ success: false, message: "Server error" });
            }
        });
        //////////////////////Favorite List full details(Aggrigrate) ///////////////
        app.get('/favoritelist', async (req, res) => {
            try {
                const email = req.query.email;
                const result = await favoritelist.aggregate([
                    {
                        $match: { userEmail: email }
                    },
                    {
                        $addFields: {
                            postObjId: { $toObjectId: "$postId" }
                        }
                    },
                    {
                        $lookup: {
                            from: 'admintravelposts', // Matches your travel post collection
                            localField: 'postObjId',
                            foreignField: '_id',
                            as: 'postDetails'
                        }
                    },
                    {
                        $unwind: "$postDetails"
                    },
                    {
                        $replaceRoot: { newRoot: "$postDetails" }
                    }
                ]).toArray();

                res.send(result);

            } catch (error) {
                console.error("Error fetching favorite posts:", error);
                res.status(500).send({ error: "Failed to fetch favorite list" });
            }
        });


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

        // USer Details.....................................
        app.post('/userdetails', async (req, res) => {
            try {
                const userData = req.body;

                const query = { uid: userData.uid };
                const existingUser = await userdetails.findOne(query);

                if (existingUser) {
                    return (res.status(200).send({ message: 'User already exits', user: existingUser.displayName }))
                }

                const result = await userdetails.insertOne(userData);
                res.status(201).json({ message: 'User created successfully', result });
            } catch (error) {
                console.error("Error inserting user : ", error)
                res.status(500).json({ message: 'Internal server error' });
            }
        })



        // get user details by email , tokenVerified
        app.get('/userdetails', async (req, res) => {
            const email = req.query.email

            // if (req.user !== email) {
            //     console.log('assss');
            //     return res.send({ message: 'Unauthorized, Token email not matched , Are you Fraud ???????' })
            // }
            const query = { email: email };
            const result = await userdetails.findOne(query)
            res.send(result)
        })

        app.get('/userOwnPost', async (req, res) => {
            const email = req.query.email

            // if (req.user !== email) {
            //     return res.status(401).send({ message: 'Unauthorized, Token not matched , Are you Fraud ???????' });


            // }

            const query = { postOwner: email };
            const cursor = haiku.find(query);
            const result = await cursor.toArray();
            res.send(result)

        })

        // JWt token manage.................
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // Create jwt Token
            const token = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: '1h'
            })
            // Store Jwt token 
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
                })
                .send({ message: 'Cookie store successfull' })
        })
        // Remove token when user signout

        app.post('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
                })
                .send({ message: 'Logout, JWT token cleared' })
        })

        // User Profile Update
        app.put('/userdetails/update', async (req, res) => {
            const { email, gender, location, phone } = req.body;
            const result = await userdetails.updateOne(
                { email },
                {
                    $set: {
                        gender,
                        location,
                        phone,
                    }
                }
            );
            res.send(result);
        });


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