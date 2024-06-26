const socket = io(); // Certifique-se de declarar 'socket' apenas uma vez

// Variáveis globais
const canvas = document.getElementById('drawArea');
const ctx = canvas.getContext('2d');
let drawing = false;
let mode = 'brush';
let drawingHistory = [];

ctx.strokeStyle = '#000000';
ctx.lineWidth = 5;

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    redraw();
}

function redraw() {
    for (let state of drawingHistory) {
        ctx.putImageData(state, 0, 0);
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);

document.getElementById('colorPicker').addEventListener('change', (e) => {
    ctx.strokeStyle = e.target.value;
    if (mode === 'eraser') {
        mode = 'brush';
    }
});

document.getElementById('brushSize').addEventListener('change', (e) => {
    ctx.lineWidth = e.target.value;
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        undoLastAction();
    }
});

function startDrawing(e) {
    drawing = true;
    draw(e);
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath();
    saveState();
}

function draw(e) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = document.getElementById('brushSize').value;
    ctx.lineCap = 'round';

    if (mode === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
    } else {
        ctx.strokeStyle = document.getElementById('colorPicker').value;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    socket.emit('drawing', { x, y, color: ctx.strokeStyle, width: ctx.lineWidth });
}

socket.on('drawing', (data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
});

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = [];
}

function toggleBrush() {
    mode = 'brush';
}

function toggleEraser() {
    mode = 'eraser';
}

function toggleFill() {
    mode = 'fill';
}

function saveState() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawingHistory.push(imageData);
}

function undoLastAction() {
    if (drawingHistory.length > 0) {
        drawingHistory.pop();
        if (drawingHistory.length > 0) {
            ctx.putImageData(drawingHistory[drawingHistory.length - 1], 0, 0);
        } else {
            clearCanvas();
        }
    }
}
