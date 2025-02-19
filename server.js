import express from 'express';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';

// Crear la aplicación de Express
const app = express();
const server = createServer(app);
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configurar Passport
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://pyramid.railway.internal/auth/google/callback'
},
(accessToken, refreshToken, profile, done) => {
  if (profile._json.hd === 'sapalomera.cat') {
    return done(null, profile);
  } else {
    return done(null, false, { message: 'Unauthorized domain' });
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configurar Express
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Rutas de autenticación
app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email'] })
);

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/?error=No autorizado' }),
  (req, res) => {
    res.redirect('/games');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Middleware para proteger rutas
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

// Rutas del servidor
app.get('/', (req, res) => {
  res.redirect('http://pyramid.ctorres.cat/index.html');
});

app.get('/games', ensureAuthenticated, (req, res) => {
  res.redirect('http://pyramid.ctorres.cat/games.html');
});

app.get('/admin', ensureAuthenticated, (req, res) => {
  res.redirect('http://pyramid.ctorres.cat/admin.html');
});

app.get('/jugar', ensureAuthenticated, (req, res) => {
  res.redirect('http://pyramid.ctorres.cat/player.html');
});


// Iniciar el servidor http
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});


//##############################################################################################//
//                                                                                              //
//                                           Socket.io                                          //
//                                                                                              //
//##############################################################################################//

// Crear servidor HTTP para Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const users = {};
const players = {};

// Manejo de eventos de conexión
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  socket.on("rol", (rol) => {
    users[socket.id] = rol;
    console.log("Nuevo usuario:", socket.id, "con rol:", rol);
  });



  if (users[socket.id] === "Admin") {
    
  } else {
    players[socket.id] = { x: Math.random() * 625, y: Math.random() * 465, id: socket.id };
    socket.emit('Players', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);
  }

  // Escuchar mensajes de configuración
  socket.on("config", (data) => {
    console.log("Configuración recibida:", data)
    if (users[socket.id] === "Admin") {
      io.emit("configuracion", data); // Reenviar a todos los clientes
    }
    
  });

 
  // Escuchar mensajes desde el cliente
  socket.on("mensaje", (data) => {
    console.log("Mensaje recibido:", data);
    io.emit("mensaje", data); // Reenviar a todos los clientes
  });

  

  // Manejo de desconexión
  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    delete players[socket.id];
    socket.broadcast.emit('Playerdisconnect', socket.id);

});
});
