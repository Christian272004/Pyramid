const socket = io('http://localhost:8180', {upgrade: true});

const sizePlayers = 15;
const baseSize = 100;
const velocidad = 1.5;
let canvasHeight;
let canvasWidth;
let pisos;
let players = {};
let piedras = [];
let currentPlayer = {};
let gameConfigured = false;
let isUpdating = false;
let bases ;
let carryingPiedra = null;
let moving = {up: false, down: false, left: false, right: false};
let gameStarted = false;


// Rebre l'ID del jugador des del servidor
socket.on('CurrentPlayer', (data) => {
    console.log('CurrentPlayer', data);
    currentPlayer = data.player;
    if (Object.values(data.config).length != 0) {
        console.log('dentro');
        canvasHeight = data.config.height;
        canvasWidth = data.config.width;
        canvasWidth = data.config.width;

        document.getElementById('canvas').setAttribute('height', data.config.height);
        document.getElementById('canvas').setAttribute('width', data.config.width);
        document.getElementById('canvas').setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
        document.getElementById('pisos').value = data.config.pisos;

        pisos = data.config.pisos;
        bases = data.config.teams;
        gameStarted = data.gameStarted;
        gameConfigured = true;
        drawBases();
        update();
    }
    
});

// Rebre l'estat del joc (jugadors i pedres) quan es connecta
socket.on('gameState', (state) => {
    players = state.players;
    piedras = state.piedras || [];
    console.log(gameStarted);
    if (gameConfigured && gameStarted) {
        drawPlayers();
        drawPiedras();
       
    }
});

socket.on('gameStart', (data) => {
    gameStarted = data;
    update();
    alert('El joc ha començat');
});



socket.on('configuracion',(config) =>{
    console.log('configuracion',config);
    canvasHeight = config.height;
    canvasWidth = config.width;
    canvasWidth = config.width;

    document.getElementById('canvas').setAttribute('height', config.height);
    document.getElementById('canvas').setAttribute('width', config.width);
    document.getElementById('canvas').setAttribute('viewBox', `0 0 ${canvasWidth} ${canvasHeight}`);
    document.getElementById('pisos').value = config.pisos;

    pisos = config.pisos;
    bases = config.teams;
    gameConfigured = true;
    // bases = [
    //     {x: 0 - 15, y: 0 - 15, color: 'red', team: 'team1'},
    //     {x: (config.width - baseSize), y: (config.height - baseSize), color: 'blue', team: 'team2'},
    // ];
    drawBases();
    update();
});

socket.on('updatePyramid', (config) => {
    const allStones = [...config.teams['team1'].stones, ...config.teams['team2'].stones];
    console.log('updatePyramid 1', allStones);
    //const { team, stones } = data;
    //console.log('updatePyramid', team, stones);
    allStones.forEach(stone => {
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '../assets/ladrillo.png');
        img.setAttribute('x', stone.x);
        img.setAttribute('y', stone.y);
        img.setAttribute('width', '8'); // Tamaño ajustado
        img.setAttribute('height', '8');
        document.getElementById('pyramid').appendChild(img);
      });
    
    
  });
  
  // Nuevo evento para fin del juego
socket.on('gameOver', (data) => {
    alert(`Equipo ${data.team} ha ganado!`);
    // Reiniciar juego o mostrar pantalla de victoria
  });



document.addEventListener('keydown', (event) =>{
    if (['w', 'ArrowUp'].includes(event.key)) moving.up = true;
    if (['s', 'ArrowDown'].includes(event.key)) moving.down = true;
    if (['a', 'ArrowLeft'].includes(event.key)) moving.left = true;
    if (['d', 'ArrowRight'].includes(event.key)) moving.right = true;
    if ([' ', 'Enter'].includes(event.key)) handleAction();
    movePlayer();
});

document.addEventListener('keyup', (event) =>{
    if (['w', 'ArrowUp'].includes(event.key)) moving.up = false;
    if (['s', 'ArrowDown'].includes(event.key)) moving.down = false;
    if (['a', 'ArrowLeft'].includes(event.key)) moving.left = false;
    if (['d', 'ArrowRight'].includes(event.key)) moving.right = false;
});

// Función para manejar la acción de recoger o soltar una piedra
function handleAction() {
    if (carryingPiedra) {
      // Soltar la piedra en la base
      if (checkBaseCollision()) {

        carryingPiedra = null;
      }
    } else {
      // Recoger una piedra
      checkCollisions();
    }
  }



function movePlayer() {
    let newX = currentPlayer.x;
    let newY = currentPlayer.y;

    if (moving.up) newY = Math.max(0, currentPlayer.y - velocidad);
    if (moving.down) newY = Math.min(canvasHeight - sizePlayers, currentPlayer.y + velocidad);
    if (moving.left) newX = Math.max(0, currentPlayer.x - velocidad);
    if (moving.right) newX = Math.min(canvasWidth - sizePlayers, currentPlayer.x + velocidad); 

    // Verificar colisiones con otros jugadores
    let colision = false;
    for (const id in players) {
        if (id !== socket.id) {
            const otherPlayer = players[id];
            const distancia = Math.sqrt(
                Math.pow(newX - otherPlayer.x, 2) + Math.pow(newY - otherPlayer.y, 2)
            );

            if (distancia < 15) {
                colision = true;
                break;
            }
        }
    }

    if (!colision) {
        // Si las coordenadas han cambiado, enviarlas al servidor
        if (newX !== currentPlayer.x || newY !== currentPlayer.y) {
            currentPlayer.x = newX;
            currentPlayer.y = newY;
            socket.emit('move', currentPlayer);
        }
    }
}

// Funcion para dibujar a los jugadores
function drawPlayers(  ) {
    const svg = document.getElementById('players');
    svg.innerHTML = "";
    


    for (const id in players) {
        const player = players[id];
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', player.x);
        rect.setAttribute('y', player.y);
        rect.setAttribute('width', sizePlayers);
        rect.setAttribute('height', sizePlayers);
        rect.setAttribute('fill', player.team === 'team1' ? 'red' : 'blue');
        rect.setAttribute('stroke', 'black');
        svg.appendChild(rect);
    }
    if (gameConfigured) {
        drawPiedras();
    }
}

function drawBases() {
    const svg = document.getElementById('bases');
    svg.innerHTML = "";

    Object.values(bases).forEach(base => {
       
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', base.x);
        rect.setAttribute('y', base.y);
        rect.setAttribute('width', baseSize);
        rect.setAttribute('height', baseSize);
        rect.setAttribute('fill-opacity', 0.5);
        rect.setAttribute('fill', base.color);
        rect.setAttribute('stroke', 'red');
        svg.appendChild(rect);
    });
}


function drawPiedras() {
    const svg = document.getElementById('stones');
    svg.innerHTML = ""; // Limpiar el canvas antes de dibujar
    piedras.forEach((piedra) => {
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '../assets/ladrillo.png');
        image.setAttribute('x', piedra.x);
        image.setAttribute('y', piedra.y);
        image.setAttribute('width', 20);
        image.setAttribute('height', 20);
        svg.appendChild(image);
    });
}

// Detectar colisiones con piedras
function checkCollisions() {
    for (let i = 0; i < piedras.length; i++) {
        const piedra = piedras[i];

        if (
            currentPlayer.x < piedra.x + 20 &&
            currentPlayer.x + 15 > piedra.x &&
            currentPlayer.y < piedra.y + 20 &&
            currentPlayer.y + 15 > piedra.y
        ) {
            // Si el jugador esta enciam de una piedra y le ha dado al espacio o al intro agarra la piedra
            if (carryingPiedra === null) {
                carryingPiedra = piedra;
                piedras.splice(i, 1); // Eliminar piedra del cliente
                // Emitir evento al servidor para eliminar la piedra
                socket.emit('removePiedra', piedra);
            }
            return
        }
    }
}

function checkBaseCollision() {
    const team = currentPlayer.team;
    const base = bases[team];
    
    if (
      currentPlayer.x < base.x + baseSize &&
      currentPlayer.x + 15 > base.x &&
      currentPlayer.y < base.y + baseSize &&
      currentPlayer.y + 15 > base.y
    ) {
        console.log('Base collision');
      socket.emit('dropPiedra', { team: team });
      carryingPiedra = null;
      return true;
    }
    return false;
  }




function update() {
  if (!isUpdating) {
    isUpdating = true;
    requestAnimationFrame(() => {
      movePlayer();
      drawPlayers();
      isUpdating = false;
      update(); // Llamar a update() solo después de completar el frame
    });
  }
}