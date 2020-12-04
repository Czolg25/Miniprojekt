const express = require('express');

const users = require('./data');
const app = express();
const PORT = process.env.PORT || 3000;

//Mam świadomość, że favicon.iso nie działa znalazłem na google app.get('/favicon.ico', (req, res) => res.status(204)) ale też jest ten sam efekt

var path = require('path');
const { Script } = require('vm');
app.use(express.static(__dirname + '/static'));

app.use(express.urlencoded({ extended: false }));

function isAuthorized(req) {
    if (req.headers.cookie) {
        const session = req.headers.cookie.split('=').pop();
        if (users.findIndex(usr => usr.sessionID == session) > -1) {
            return true;
        }
    }
    return false;   
}

app.get('/admin', (req, res) => {
    if (isAuthorized(req)) {
        res.sendFile(`${__dirname}/sites/admin/admin.html`);
        return;
    }
    res.sendFile(`${__dirname}/sites/denied.html`);
});

app.post('/register', (req, res) => {
    const user = req.body;
    if (users.findIndex(usr => usr.login == user.login) > -1) {
        res.send('User already exists');
        return;
    }

    // Prevent XSS (I know this technique sucks :) )
    for (let key in user) {
        if (typeof user[key] == "string") {
            user[key] = user[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }

    if (user.student) {
        user.student = true;
    } else {
        user.student = false;
    }
    user.id = users.length + 1;
    users.push(user);
    res.send(`Welcome ${user.login}!`);
});

app.post('/login', (req, res) => {
    const { login, password } = req.body;
    const user = users.find(usr => usr.login == login.replace(/</g, '&lt;').replace(/>/g, '&gt;') && usr.password == password);
    if (user && login != '') {
        const sessionID = Buffer.from(`${user.login}${user.age}${user.gender}${user.id}${Math.floor(Math.random()*1000)}`).toString('hex');
        user.sessionID = sessionID;
        res.cookie('sessionID', sessionID).redirect('/admin');
    } else {
        res.send('Incorrect login');
    }
});

app.get('/logout', (req, res) => {
    const session = req.headers.cookie.split('=').pop();
    users.find(usr => usr.sessionID == session).sessionID = null;
    res.clearCookie('sessionID').redirect('/');
});

app.get('/show', (req, res) => {
    if (!isAuthorized(req)) {
        res.sendFile(`${__dirname}/sites/denied.html`);
        return;
    }

    const table = users.sort((a, b) => a.id-b.id).map(({ id, login, password, age, student, gender }) => {
        const row = `
            <td>id: ${id}</td>
            <td>user: ${login} - ${password}</td>
            <td>student: <input type="checkbox" disabled ${student ? 'checked' : ''}></td>
            <td>age: ${age}</td>
            <td>płeć: ${gender}</td>
        `;
        return `<tr>${row}</tr>`;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Main | Mini Project</title>
            <link type="text/css" rel="stylesheet" href="css/main.css">
        </head>
        <body class="dark">
            <nav class="navbar secondary">
                <a href="/sort" class="nav-item">sort</a>
                <a href="/gender" class="nav-item">gender</a>
                <a href="/show" class="nav-item">show</a>
            </nav>
            <table class="result">
                ${table.join('')}
            </table>
        </body>
        </html>
    `);
});

app.get('/gender', (req, res) => {
    if (!isAuthorized(req)) {
        res.sendFile(`${__dirname}/sites/denied.html`);
        return;
    }

    const utilizer = ({ id, gender }) => {
        const row = `
            <td>id: ${id}</td>
            <td>płeć: ${gender}</td>
        `;
        return `<tr>${row}</tr>`;
    };

    const men = users.filter(({ gender }) => gender == 'm').map(utilizer);
    const women = users.filter(({ gender }) => gender == 'w').map(utilizer);

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Main | Mini Project</title>
            <link type="text/css" rel="stylesheet" href="css/main.css">
        </head>
        <body class="dark">
            <nav class="navbar secondary">
                <a href="/sort" class="nav-item">sort</a>
                <a href="/gender" class="nav-item">gender</a>
                <a href="/show" class="nav-item">show</a>
            </nav>
            <table class="result">
                ${men.join('')}
            </table>
            <table class="result">
                ${women.join('')}
            </table>
        </body>
        </html>
    `);
});

function sortView(req, res, asc=true) {
    if (!isAuthorized(req)) {
        res.sendFile(`${__dirname}/sites/denied.html`);
        return;
    }

    const table = users.sort((a, b) => asc ? a.age - b.age : b.age - a.age).map(({ id, login, password, age }) => {
        const row = `
            <td>id: ${id}</td>
            <td>user: ${login} - ${password}</td>
            <td>age: ${age}</td>
        `;
        return `<tr>${row}</tr>`;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Main | Mini Project</title>
            <link type="text/css" rel="stylesheet" href="css/main.css">
        </head>
        <body class="dark">
            <nav class="navbar secondary">
                <a href="/sort" class="nav-item">sort</a>
                <a href="/gender" class="nav-item">gender</a>
                <a href="/show" class="nav-item">show</a>
            </nav>
            <form method="POST" onchange="this.submit()">
                <label class="thin">
                    <input type="radio" name="sort" value="asc" ${asc ? 'checked' : ''}>
                    Rosnąco
                </label>
                <label class="thin">
                    <input type="radio" name="sort" value="desc" ${asc ? '' : 'checked'}>
                    Malejąco
                </label>
            </form>
            <table class="result">
                ${table.join('')}
            </table>
        </body>
        </html>
    `);
}

app.get('/sort', (req, res) => {
    sortView(req, res);
});

app.post('/sort', (req, res) => {
    const { sort } = req.body;
    if (sort == 'desc') sortView(req, res, false);
    else sortView(req, res);
});

app.get('/:site?', (req, res) => {
    const { site } = req.params;
    if (!site) {
        if (isAuthorized(req)) {
            res.sendFile(`${__dirname}/sites/admin/index.html`);
            return;
        }

        res.sendFile(`${__dirname}/sites/index.html`);
        return;
    }
    const regex = /^[A-Za-z]+$/;
    if (regex.test(site)) {
        let isAdmin = '';
        if (isAuthorized(req)) {
            isAdmin = 'admin';
        }

        res.sendFile(`${__dirname}/sites/${isAdmin}/${site}.html`, err => {
            if (err) res.status(404).send('Not Found');
        });
    } else {
        res.status(404).send('<h1>Do not use special characters</h1>');
    }
});
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
