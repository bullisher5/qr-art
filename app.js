// === DOM элементы ===
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const qrResult = document.getElementById('qr-result');
const statusMsg = document.getElementById('status-message');
const colorSection = document.getElementById('color-section');
const colorPicker = document.getElementById('color-picker');
const classicModeBtn = document.getElementById('classic-mode-btn');
const aiModeBtn = document.getElementById('ai-mode-btn');
const aiCounter = document.getElementById('ai-counter');
const countRemaining = document.getElementById('count-remaining');

// === Состояние ===
let currentMode = 'classic'; // 'classic' или 'ai'
let logoDataUrl = null;

// === Счётчик AI-генераций (localStorage) ===
function getAIUsage() {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem('ai-usage') || '{}');
    if (stored.date !== today) {
        return { date: today, count: 0 };
    }
    return stored;
}

function incrementAIUsage() {
    const usage = getAIUsage();
    usage.count += 1;
    localStorage.setItem('ai-usage', JSON.stringify(usage));
    updateAICounter();
}

function updateAICounter() {
    const usage = getAIUsage();
    const remaining = Math.max(0, 3 - usage.count);
    countRemaining.textContent = remaining;
    if (remaining <= 0 && currentMode === 'ai') {
        generateBtn.disabled = true;
        generateBtn.style.opacity = '0.5';
        statusMsg.textContent = 'Free AI limit reached. Come back tomorrow!';
    } else {
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';
    }
}

// === Переключение режимов ===
classicModeBtn.addEventListener('click', function() {
    currentMode = 'classic';
    classicModeBtn.classList.add('active');
    aiModeBtn.classList.remove('active');
    colorSection.style.display = 'block';
    aiCounter.style.display = 'none';
    statusMsg.textContent = '';
    generateBtn.textContent = 'Generate QR Code';
    qrResult.innerHTML = '<p>Your QR code will appear here</p>';
    downloadBtn.style.display = 'none';
    logoDataUrl = null;
});

aiModeBtn.addEventListener('click', function() {
    currentMode = 'ai';
    aiModeBtn.classList.add('active');
    classicModeBtn.classList.remove('active');
    colorSection.style.display = 'none';
    aiCounter.style.display = 'block';
    updateAICounter();
    statusMsg.textContent = '';
    generateBtn.textContent = 'Generate AI Art QR';
    qrResult.innerHTML = '<p>Your AI art QR will appear here</p>';
    downloadBtn.style.display = 'none';
    logoDataUrl = null;
});

// === Генерация ===
generateBtn.addEventListener('click', async function() {
    const text = textInput.value.trim();

    if (text === '') {
        statusMsg.textContent = 'Please enter text or a link!';
        return;
    }

    if (currentMode === 'classic') {
        generateClassicQR(text);
    } else {
        await generateAIQR(text);
    }
});

// === Classic QR ===
function generateClassicQR(text) {
    qrResult.innerHTML = '';
    logoDataUrl = null;
    statusMsg.textContent = '';

    const selectedColor = colorPicker.value;
    new QRCode(qrResult, {
        text: text,
        width: 300,
        height: 300,
        colorDark: selectedColor,
        colorLight: '#0d0d0d',
        correctLevel: QRCode.CorrectLevel.H
    });

    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            logoDataUrl = e.target.result;
            const img = document.createElement('img');
            img.src = logoDataUrl;
            img.style.cssText = `
                position: absolute;
                width: 60px;
                height: 60px;
                border-radius: 8px;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 4px;
                box-shadow: 0 0 10px ${selectedColor}80;
            `;
            qrResult.style.position = 'relative';
            qrResult.appendChild(img);
        };
        reader.readAsDataURL(imageInput.files[0]);
    }

    downloadBtn.style.display = 'inline-block';
}

// === AI Art QR ===
async function generateAIQR(text) {
    const usage = getAIUsage();
    if (usage.count >= 3) {
        statusMsg.textContent = 'Free AI limit reached. Come back tomorrow!';
        return;
    }

    if (!imageInput.files || !imageInput.files[0]) {
        statusMsg.textContent = 'Please choose an image for AI style!';
        return;
    }

    statusMsg.textContent = '✨ Generating AI art... This may take up to 30 seconds.';
    qrResult.innerHTML = '<p style="color: #00ffff;">🎨 AI is creating your art QR...</p>';
    downloadBtn.style.display = 'none';

    // Конвертируем картинку в base64
    const file = imageInput.files[0];
    const base64Image = await toBase64(file);

    try {
        const response = await fetch('/.netlify/functions/generate-art-qr', {
            method: 'POST',
            body: JSON.stringify({
                text: text,
                image: base64Image,
            }),
        });

        const data = await response.json();

        // Показываем детальную ошибку для отладки
        if (data.error) {
            statusMsg.textContent = '❌ ' + data.error;
            qrResult.innerHTML = '<p style="color: red;">Error details above. Try a different image or text.</p>';
            console.error('Server error:', data);
            return;
        }

        if (data.output && data.output.length > 0) {
            // Показываем AI-арт
            qrResult.innerHTML = `<img src="${data.output[0]}" alt="AI QR Art" style="max-width: 100%; border-radius: 10px;">`;
            statusMsg.textContent = '✅ AI art QR generated!';
            incrementAIUsage();
            downloadBtn.style.display = 'inline-block';
            // Сохраняем URL картинки для скачивания
            logoDataUrl = data.output[0];
        } else if (data.status === 'processing') {
            statusMsg.textContent = '⏳ Still processing... Click Generate again.';
        } else {
            statusMsg.textContent = '❌ Unexpected response. Check console.';
            console.error('Full response:', data);
        }
    } catch (error) {
        statusMsg.textContent = '❌ Network error: ' + error.message;
        console.error(error);
    }
}

// === Скачивание ===
downloadBtn.addEventListener('click', function() {
    if (currentMode === 'classic') {
        downloadClassicQR();
    } else {
        downloadAIQR();
    }
});

function downloadClassicQR() {
    const qrCanvas = qrResult.querySelector('canvas');
    if (!qrCanvas) {
        statusMsg.textContent = 'Generate a QR code first!';
        return;
    }

    if (logoDataUrl) {
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = qrCanvas.width;
        mergedCanvas.height = qrCanvas.height;
        const ctx = mergedCanvas.getContext('2d');
        ctx.drawImage(qrCanvas, 0, 0);

        const logoImg = new Image();
        logoImg.onload = function() {
            const logoSize = 60;
            const x = (mergedCanvas.width - logoSize) / 2;
            const y = (mergedCanvas.height - logoSize) / 2;

            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 8);
            ctx.fill();
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);

            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = mergedCanvas.toDataURL('image/png');
            link.click();
        };
        logoImg.src = logoDataUrl;
    } else {
        const link = document.createElement('a');
        link.download = 'qr-code.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    }
}

function downloadAIQR() {
    if (!logoDataUrl) {
        statusMsg.textContent = 'Generate an AI QR first!';
        return;
    }
    const link = document.createElement('a');
    link.download = 'ai-qr-art.png';
    link.href = logoDataUrl;
    link.click();
}

// === Вспомогательные функции ===
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
}

// === Инициализация ===
updateAICounter();
