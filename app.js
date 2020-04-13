const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const gowebauthn = require('go-webauthn-js');

// Start webauthn
gowebauthn.initialize({
    RPDisplayName: "Foobar Corp.",
    RPID:          'localhost',
    RPOrigin:      'http://localhost:3000',
    RPIcon:        "https://foobar.corp/logo.png",
}, console.log);

// Set up the express server
const app = express();

// Setup sessions
app.use(session({
    resave: true,
    saveUninitialized: false,
    secret: 'this is just stupid',
}));

// Parse body
app.use(bodyParser.json());

// Globals
const users = {};

// Routes
app.get('/api/reg/begin/:username', (req, res, next) => {
    const username = req.params.username;

    // Generate user
    if (!users[username]) users[username] = {
        id: Math.floor(Math.random() * 1000000000),
        name: username,
        displayName: username,
        credentials: [],
    };
    console.log(users);

    const user = users[username];

    gowebauthn.beginRegistration(user, (err, data) => {
        req.session.registrationSessionData = data.registrationSessionData;
        res.json(data.credentialCreationOptions);
        next();
    });
});

app.post('/api/reg/finish/:username', (req, res, next) => {
    const username = req.params.username;

    // Check if user exists
    if (!users[username]) {
        res.status(404).json({ error: 'No such user' });
        return next();
    }

    // Get user
    const user = users[username];

    console.log(req.body);

    gowebauthn.finishRegistration(user, req.session.registrationSessionData, req.body, (err, data) => {
        delete req.session.registrationSessionData;
        user.credentials.push(data);
        res.json({'message': 'Success'});
        next();
    });
});

app.get('/api/login/begin/:username', (req, res, next) => {
    const username = req.params.username;

    // Check if user exists
    if (!users[username]) {
        res.status(404).json({ error: 'No such user' });
        return next();
    }
    console.log(users);

    const user = users[username];

    gowebauthn.beginLogin(user, (err, data) => {
        console.log(data);
        req.session.authenticationSessionData = data.authenticationSessionData;
        res.json(data.credentialRequestOptions);
        next();
    });
});

app.post('/api/login/finish/:username', (req, res, next) => {
    const username = req.params.username;

    // Check if user exists
    if (!users[username]) {
        res.status(404).json({ error: 'No such user' });
        return next();
    }

    // Get user
    const user = users[username];

    console.log(req.body);

    gowebauthn.finishLogin(user, req.session.authenticationSessionData, req.body, (err, data) => {
        if (err) {
            res.status(401).json({'error': JSON.stringify(err)});
            return;
        }
        delete req.session.authenticationSessionData;
        res.json({'message': 'Success'});
        next();
    });
});

// Static files
app.use('/', express.static('./'));

// Listen
app.listen(3000, '0.0.0.0');
console.log('Listening on 0.0.0.0:3000');
