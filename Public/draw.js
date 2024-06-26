const canvas = document.getElementById('drawArea');
const ctx = canvas.getContext('2d');
let drawing = false;
const socket = io();
let mode = 'brush'; // Pode ser 'brush', 'eraser' ou 'fill'
let drawingHistory = [];

// Inicializa com valores padrão
ctx.strokeStyle = '#000000';
ctx.lineWidth = 5;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);

document.getElementById('colorPicker').addEventListener('change', (e) => {
    ctx.strokeStyle = e.target.value;
    if (mode === 'eraser') {
        mode = 'brush'; // Volta para o modo pincel se a cor for alterada
    }
    console.log(`Cor alterada para: ${ctx.strokeStyle}`);
});

document.getElementById('brushSize').addEventListener('change', (e) => {
    ctx.lineWidth = e.target.value;
    console.log(`Largura do pincel alterada para: ${ctx.lineWidth}`);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        undoLastAction();
    }
});

function startDrawing(e) {
    if (mode === 'fill') {
        const x = e.clientX - canvas.offsetLeft;
        const y = e.clientY - canvas.offsetTop;
        fillArea(x, y, ctx.strokeStyle);
        return;
    }
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

    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    
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
    drawingHistory = []; // Limpar o histórico
}

function toggleBrush() {
    mode = 'brush';
    console.log('Modo pincel ativado');
}

function toggleEraser() {
    mode = 'eraser';
    console.log('Modo borracha ativado');
}

function toggleFill() {
    mode = 'fill';
    console.log('Modo balde de tinta ativado');
}

function fillArea(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const targetColor = getColorAtPixel(data, x, y);
    
    if (!colorsMatch(targetColor, hexToRgb(fillColor))) {
        floodFill(data, x, y, targetColor, hexToRgb(fillColor));
        ctx.putImageData(imageData, 0, 0);
        saveState();
        socket.emit('fill', { x, y, color: fillColor });
    }
}

function floodFill(data, x, y, targetColor, fillColor) {
    const stack = [[x, y]];
    const width = canvas.width;
    const height = canvas.height;

    while (stack.length) {
        const [currentX, currentY] = stack.pop();
        const currentPos = (currentY * width + currentX) * 4;

        if (colorsMatch(getColorAtPixel(data, currentX, currentY), targetColor)) {
            setColorAtPixel(data, currentX, currentY, fillColor);

            if (currentX > 0) stack.push([currentX - 1, currentY]);
            if (currentX < width - 1) stack.push([currentX + 1, currentY]);
            if (currentY > 0) stack.push([currentX, currentY - 1]);
            if (currentY < height - 1) stack.push([currentX, currentY + 1]);
        }
    }
}

function getColorAtPixel(data, x, y) {
    const pos = (y * canvas.width + x) * 4;
    return [data[pos], data[pos + 1], data[pos + 2], data[pos + 3]];
}

function setColorAtPixel(data, x, y, color) {
    const pos = (y * canvas.width + x) * 4;
    data[pos] = color[0];
    data[pos + 1] = color[1];
    data[pos + 2] = color[2];
    data[pos + 3] = color[3];
}

function colorsMatch(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b, 255];
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

socket.on('fill', (data) => {
    fillArea(data.x, data.y, data.color);
});
