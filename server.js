const express = require('express');
const bodyParser = require('body-parser');
const { admin, db } = require('./firebase'); 
const path = require('path');
const passwordHash = require('password-hash');
const request = require('request');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('login');
});

app.get('/signup', (req, res) => {
    res.render('signup');
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userRef = db.collection('users').doc(email);
        const doc = await userRef.get();
        if (!doc.exists) {
            return res.send('No such user. Please Signup!!!');
        }
        const userData = doc.data();
        if (!passwordHash.verify(password, userData.password)) {
            return res.send('Incorrect password. Please try again.');
        }
        res.render('welcome', { username: userData.userName, celebrity: null, error: null });
    } catch (error) {
        res.send('Error logging in');
    }
});

app.post('/signupSubmit', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const usersData = await db.collection('users')
            .where('email', '==', email)
            .get();

        if (!usersData.empty) {
            return res.send('Hey! This account already exists...');
        }

        await db.collection('users').doc(email).set({
            userName: username,
            email: email,
            password: passwordHash.generate(password)
        });

        res.render('login', { message: 'Signup successful! Please log in.' });
    } catch (error) {
        res.send('Something went wrong...');
    }
});

app.post('/getCelebrity', (req, res) => {
    const { celebrity } = req.body;

    request.get({
        url: `https://api.api-ninjas.com/v1/celebrity?name=${encodeURIComponent(celebrity)}`,
        headers: {
            'X-Api-Key': 'l4eaoiHBZHClB2QSKa3Taw==MtPh11YAAwkJbOVL'
        },
    }, function (error, response, body) {
        if (error) {
            return res.render('welcome', { username: req.body.username, error: 'Request failed: ' + error, celebrity: null });
        } else if (response.statusCode !== 200) {
            return res.render('welcome', { username: req.body.username, error: 'Error: ' + response.statusCode, celebrity: null });
        } else {
            try {
                const obj = JSON.parse(body);
                if (obj && obj[0]) {
                    return res.render('welcome', {
                        username: req.body.username,
                        celebrity: obj[0],
                        error: null
                    });
                } else {
                    return res.render('welcome', { username: req.body.username, error: 'No data found', celebrity: null });
                }
            } catch (parseError) {
                return res.render('welcome', { username: req.body.username, error: 'Error parsing JSON response: ' + parseError.message, celebrity: null });
            }
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
