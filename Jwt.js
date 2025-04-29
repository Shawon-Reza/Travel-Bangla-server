/*
Steps to use JWT Token..........

1) 
   npm install jsonwebtoken
2)
  const jwt = require('jsonwebtoken')
  const cookieParser = require('cookie-parser');
3)
  app.use(cookieParser())
4) 
app.use(cors(
    {
        origin:'http://localhost:5173/userProfile',
        credentials: true
    }
));

5)token Create ......
6) store token
7) varify token with middleware

*/
// create and Store : 
app.post('/jwt', (req, res) => {
    const user = req.body;

    const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: '1h'
    })

    res
        .cookie('token', token, {
            httpOnly: true,
            secure: false
        })
        .send({ message: 'Cookie store successfull' })
})

// Token Verify.............
const tokenVerified = (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token);

    if (!token) {
        return res
            .send({ message: 'Unauthorized, Token not found, Are you froud ?' })
            .status(401)
    }

    jwt.verify(token, process.env.JWT_SECRET,
        function (err, decoded) {
            console.log(decoded)
            if (err) {
                return res.send({ message: 'Unauthorize, Invalid token' })
            }
            req.user = decoded;
            next();
        });
}

// get user details by email
app.get('/userdetails', tokenVerified, async (req, res) => {
    const email = req.query.email

    if (req.user !== email) {
        console.log('assss');
        return res.send({ message: 'Unauthorized, Token email not matched , Are you Froud ???????' })
    }
    const query = { email: email };
    const result = await userdetails.findOne(query)
    res.send(result)
})
