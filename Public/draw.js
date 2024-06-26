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

canvas.addEventListener('mousedown', (e) => {
    if (mode === 'fill') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        floodFill(x, y, hexToRgb(ctx.strokeStyle));
        saveState();
        socket.emit('fill', { x, y, color: ctx.strokeStyle });
    } else {
        startDrawing(e);
    }
});
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);

function updateColorPreview(color) {
    document.getElementById('colorPreview').style.backgroundColor = color;
    ctx.strokeStyle = color;
}

document.getElementById('colorPicker').addEventListener('change', (e) => {
    updateColorPreview(e.target.value);
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

socket.on('fill', (data) => {
    floodFill(data.x, data.y, hexToRgb(data.color));
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

function floodFill(x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const targetColor = getColorAtPixel(data, x, y);
    
    if (!colorsMatch(targetColor, fillColor)) {
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

        ctx.putImageData(imageData, 0, 0);
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
    data[pos + 3] = 255; // Full opacity
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

function saveDrawing() {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'desenho.png';
    link.click();
}
