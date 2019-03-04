/* Importation des packets pour le serveur web */
const http = require('http'), fs = require('fs');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

/* Importation du Logger */
const Logger = require("./src/Logger");

/* Variables */
var serve = serveStatic("./content/");
var ligneslist = require("./data/lignes.json");

/* Mise en place du serveur */
var server = http.createServer(function(req, res) {
  if(req.url == "/api/lignes") {
      res.writeHead(200, {'Content-type':'application/json'});
      res.write(JSON.stringify(ligneslist));
      res.end();
  } else if(req.url.startsWith("/api/ligne/")) {
    if (fs.existsSync("./data/ligne/" + req.url.replace("/api/ligne/", "") + ".json")) {
      var ligne = require("./data/ligne/" + req.url.replace("/api/ligne/", ""));
      
      res.writeHead(200, {'Content-type':'application/json'});
      
      res.write(JSON.stringify(ligne));
      
      res.end();
    } else {
      res.writeHead(200, {'Content-type':'application/json'});
      
      res.write(JSON.stringify({
        error: "La ligne spécifiée n'est pas stockée sur le serveur !"
      }));
      
      res.end();
    }
  } else {
      var done = finalhandler(req, res);
      serve(req, res, done);
  }
});

/* Mise en place du serveur de websockets */
var io = require('socket.io').listen(server);

io.on('connection', function(socket) {
  Logger.debug("Connexion entrante depuis l'IP " + socket.request.connection._peername.address.replace("::ffff:", ""));
  socket.emit('verify', { success: true, id: socket.id });

  socket.on("set_arret", data => {
    socket.arret = data.arret;
  });
  
  socket.on("presence", data => {
    io.emit("notifypresence", {
      arret: socket.arret,
      ligne: data.ligne
    });
    Logger.debug("Le serveur vient de recevoir l'event \"presence\" de " + socket.arret + ", la ligne spécifiée est : " + data.ligne);
  });

  socket.on("location", data => {
    io.emit("location_update", {
      lat: data.loc.lat,
      lng: data.loc.long,
      arret: socket.arret,
      ligne: data.ligne
    });
    Logger.debug("Le serveur vient de recevoir l'event \"location\" contenant " + JSON.stringify(data.loc) + " de la part de la ligne : " + data.ligne);
  });
});

server.listen(80);
