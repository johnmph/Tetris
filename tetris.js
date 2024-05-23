
// Parameters
const BlockWidthInPixel = 32;
const BlockHeightInPixel = 32;
const BoardWidthInBlock = 10;
const BoardHeightInBlock = 20;

// Shapes
const Shapes = [
    [                                           // I
        [[-2, 0], [-1, 0], [0, 0], [1, 0]],
        [[0, -2], [0, -1], [0, 0], [0, 1]]
    ],
    [                                           // O
        [[-1, 0], [0, 0], [-1, 1], [0, 1]]
    ],
    [                                           // T
        [[-2, 0], [-1, 0], [0, 0], [-1, 1]],
        [[-1, -1], [-2, 0], [-1, 0], [-1, 1]],
        [[-1, -1], [-2, 0], [-1, 0], [0, 0]],
        [[-1, -1], [-1, 0], [0, 0], [-1, 1]]
    ],
    [                                           // L
        [[-2, 0], [-1, 0], [0, 0], [-2, 1]],
        [[-2, -1], [-1, -1], [-1, 0], [-1, 1]],
        [[0, -1], [-2, 0], [-1, 0], [0, 0]],
        [[-1, -1], [-1, 0], [-1, 1], [0, 1]]
    ],
    [                                           // J
        [[-2, 0], [-1, 0], [0, 0], [0, 1]],
        [[-1, -1], [-1, 0], [-2, 1], [-1, 1]],
        [[-2, -1], [-2, 0], [-1, 0], [0, 0]],
        [[-1, -1], [0, -1], [-1, 0], [-1, 1]]
    ],
    [                                           // Z
        [[-2, 0], [-1, 0], [-1, 1], [0, 1]],
        [[0, -1], [-1, 0], [0, 0], [-1, 1]]
    ],
    [                                           // S
        [[-1, 0], [0, 0], [-2, 1], [-1, 1]],
        [[-1, -1], [-1, 0], [0, 0], [0, 1]]
    ]
];

const PlayerStartX = 5;
const PlayerStartY = 1;
const PlayerSpeedInBlockPerSecond = 10;

// Create board array
let board = new Array(BoardWidthInBlock * BoardHeightInBlock);

// Create current shape
let currentShape;
let nextShape;
let currentShapeRotation;
let playerX;
let playerY;
let currentSpeedInBlockPerSecond;
let lineCount;
let score;
let playerInput = new Set();

// Get board canvas
let canvasBoard = document.getElementById("canvasBoard");

// Set board canvas size
canvasBoard.width = BlockWidthInPixel * BoardWidthInBlock;
canvasBoard.height = BlockHeightInPixel * BoardHeightInBlock;

// Get 2d context of board canvas
let canvasBoardContext = canvasBoard.getContext("2d");

// Get next shape canvas
let canvasNextShape = document.getElementById("canvasNextShape");

// Set next shape canvas size
canvasNextShape.width = BlockWidthInPixel * 6;
canvasNextShape.height = BlockHeightInPixel * 6;

// Get 2d context of next shape canvas
let canvasNextShapeContext = canvasNextShape.getContext("2d");

// Get score elements
let scoreElement = document.getElementById("scoreData");
let lineCountElement = document.getElementById("lineCountData");
let levelElement = document.getElementById("levelData");
let nextLevelElement = document.getElementById("nextLevelData");



function resetGame() {
    // Reset board
    board.fill(false);

    // Initialize speed at 1
    currentSpeedInBlockPerSecond = 1;

    // Reset lineCount and score
    lineCount = 0;
    score = 0;

    // Call two times getNextShape to have both current and next shape random
    getNextShape();
    getNextShape();
	
	// Refresh score UI
    refreshScoreUI();
}

function canvasBoardLoop(timeStamp) {
    // Calculate deltaTime
    let deltaTimeInMs = timeStamp - lastTimeStamp;

    // Update and draw
    update(deltaTimeInMs * 0.001);
	
    drawCanvasBoard();

    // Save timestamp
    lastTimeStamp = timeStamp;

    // Loop
    window.requestAnimationFrame(canvasBoardLoop);
}

function drawCanvasBoard() {
    // Clear board canvas
    canvasBoardContext.clearRect(0, 0, canvasBoard.width, canvasBoard.height);

    // Draw board
    for (let n = 0; n < BoardWidthInBlock * BoardHeightInBlock; ++n) {
        // Get current block coordinates
        let blockX = n % BoardWidthInBlock;
        let blockY = Math.floor(n / BoardWidthInBlock);

        if (board[n] || blockIsInCurrentShape(blockX, blockY)) {
            drawBlock(canvasBoardContext, blockX, blockY);
        }
    }
}

function drawCanvasNextShape() {
    // Clear next shape canvas
    canvasNextShapeContext.clearRect(0, 0, canvasNextShape.width, canvasNextShape.height);

    let shape = Shapes[nextShape][0];

    for (let n = 0; n < 4; ++n) {
        drawBlock(canvasNextShapeContext, 3 + shape[n][0], 2 + shape[n][1]);
    }
}

function update(deltaTime) {
    // Update player rotation
    if (playerInput.has(" ")) {
        rotateShape(true);

        // Undo if collide
        if (isCurrentShapeCollide()) {
            rotateShape(false);
        }
		
        playerInput.delete(" ");//TODO: pq meme en mettant ca, si je laisse appuyé le bouton ca tourne plusieurs fois ? il y a toujours des events keydown envoyé meme si on ne relache pas le bouton ?
    }

    // Update player X position
    if (playerInput.has("ArrowLeft")) {
        playerX -= (deltaTime * PlayerSpeedInBlockPerSecond);

        // Undo if collide
        if (isCurrentShapeCollide()) {
            playerX += (deltaTime * PlayerSpeedInBlockPerSecond);
        }
    } else if (playerInput.has("ArrowRight")) {
        playerX += (deltaTime * PlayerSpeedInBlockPerSecond);

        // Undo if collide
        if (isCurrentShapeCollide()) {
            playerX -= (deltaTime * PlayerSpeedInBlockPerSecond);
        }
    }

    // Update player Y position
    if (playerInput.has("ArrowDown")) {
        playerY += (deltaTime * PlayerSpeedInBlockPerSecond);

        // Undo if collide
        if (isCurrentShapeCollide()) {
            playerY -= (deltaTime * PlayerSpeedInBlockPerSecond);
        }
    }

    // Update shape Y position
    playerY += (deltaTime * currentSpeedInBlockPerSecond);

    // Undo if collide
    if (isCurrentShapeCollide()) {
        playerY -= (deltaTime * currentSpeedInBlockPerSecond);

        // Store current shape in board
        storeCurrentShapeInBoard();

        // Check for complete lines
        checkForCompleteLines();

        // Get next shape
        getNextShape();

        // Check for end game
        checkForEndGame();
    }
}

function rotateShape(clockwise) {
    let shape = Shapes[currentShape];

    currentShapeRotation = (currentShapeRotation + ((clockwise) ? 1 : shape.length - 1)) % shape.length;
}

function browseCurrentShape(browseFunc) {
    let shape = Shapes[currentShape][currentShapeRotation];

    for (let n = 0; n < 4; ++n) {
        // Get current block coordinates
        let x = Math.floor(playerX) + shape[n][0];
        let y = Math.floor(playerY) + shape[n][1];

        // Call func and exit if return false
        if (browseFunc(x, y) === false) {
            break;
        }
    }
}

function storeCurrentShapeInBoard() {
    browseCurrentShape(function(x, y) {
        board[x + (y * BoardWidthInBlock)] = true;

        return true;
    });
}

function checkForCompleteLines() {
    let lineMap = new Map();

    browseCurrentShape(function(x, y) {
        // We don't need to check if line at position y was already check
        if (lineMap.has(y)) {
            return true;
        }

        let lineComplete = true;
        for (let n = 0; n < BoardWidthInBlock; ++n) {
            /*if (board[n + (y * BoardWidthInBlock)] === false) {
                lineComplete = false;
                break;
            }*/

            lineComplete &= board[n + (y * BoardWidthInBlock)];
        }

        lineMap.set(y, lineComplete);

        return true;
    });

    // Remove lines (we need to remove line in top bottom order (y increase order))
    let emptyLine = new Array(BoardWidthInBlock).fill(false);
    let sortedLineMapArray = new Array();
    lineMap.forEach(function(value, key) {
        if (value) {
            sortedLineMapArray.push(key);
        }
    });
    sortedLineMapArray.sort();

    sortedLineMapArray.forEach(function(value) {
        board.splice(value * BoardWidthInBlock, BoardWidthInBlock);
        board = emptyLine.concat(board);
    });

    // Update score
    updateScore(sortedLineMapArray.length);
}

function checkForEndGame() {
    // Reset game if current shape collide (and because it is called just after getNextShape it checks if we can't move the new shape)
    if (isCurrentShapeCollide()) {
        resetGame();
    }
}

function getNextShape() {
    // Current shape is next shape and next shape is taken randomly
    currentShape = nextShape;
    nextShape = Math.floor(Math.random() * Shapes.length);

    // Reset rotation
    currentShapeRotation = 0;

    // Reset player position
    playerX = PlayerStartX;
    playerY = PlayerStartY;

    // Draw canvas next shape
    drawCanvasNextShape();
}

function blockIsInCurrentShape(blockX, blockY) {
    let found = false;

    browseCurrentShape(function(x, y) {
        if ((x === blockX) && (y === blockY)) {
            found = true;
            return false;
        }

        return true;
    });

    return found;
}

function isCurrentShapeCollide() {
    let collide = false;

    browseCurrentShape(function(x, y) {
        // Check x-axis limits
        if ((x < 0) || (x >= BoardWidthInBlock)) {
            collide = true;
            return false;
        }

        // Check y-axis limits
        if (y >= BoardHeightInBlock) {
            collide = true;
            return false;
        }

        // Check with shapes already placed
        if (board[x + (y * BoardWidthInBlock)]) {
            collide = true;
            return false;
        }

        return true;
    });

    return collide;
}

function drawBlock(canvasContext, blockX, blockY) {
    let x = blockX * BlockWidthInPixel;
    let y = blockY * BlockHeightInPixel;

    canvasContext.strokeStyle = "#000000";
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(x, y, BlockWidthInPixel, BlockHeightInPixel);

    canvasContext.lineWidth = 1;
    for (let n = 0; n < BlockHeightInPixel; n += 4) {
        canvasContext.beginPath();
        canvasContext.moveTo(x, y + n);
        canvasContext.lineTo(x + BlockWidthInPixel, y + n);
        canvasContext.stroke();
    }

    for (let n = 0; n < BlockWidthInPixel; n += 4) {
        canvasContext.beginPath();
        canvasContext.moveTo(x + n, y);
        canvasContext.lineTo(x + n, y + BlockHeightInPixel);
        canvasContext.stroke();
    }
}

function updateScore(count) {
    // Update lineCount and score
    lineCount += count;
    score += 1000 * count * currentSpeedInBlockPerSecond;

    // Increment speed if lineCount reach ten
    currentSpeedInBlockPerSecond += Math.floor(lineCount / 10) - Math.floor((lineCount - count) / 10);

    // Refresh score UI
    refreshScoreUI();
}

function refreshScoreUI() {
    scoreElement.textContent = score;
    lineCountElement.textContent = lineCount;
    levelElement.textContent = Math.floor(lineCount / 10);
    nextLevelElement.value = lineCount % 10;
}



// Reset game
resetGame();

// Listen to keys
document.addEventListener("keydown", function(event) {
    playerInput.add(event.key);
});

document.addEventListener("keyup", function(event) {
    playerInput.delete(event.key);
});

// Start game loop
let lastTimeStamp = performance.now();
window.requestAnimationFrame(canvasBoardLoop);
