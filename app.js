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
let currentMode = 'classic';
let logoDataUrl = null;

// === Счётчик AI-генераций ===
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

// === Сжатие изображения ===
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const maxSize = 512;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG с качеством 0.7 для сильного сжатия
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedDataUrl);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// === AI Art QR (QuickChart с POST-запросом) ===
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

    statusMsg.textContent = '✨ Compressing and generating AI art...';
    qrResult.innerHTML = '<p style="color: #00ffff;">🎨 AI is creating your art QR...</p>';
    downloadBtn.style.display = 'none';

    try {
        // Сжимаем изображение
        const compressedImage = await compressImage(imageInput.files[0]);

        // Используем POST-запрос к QuickChart с телом JSON
        const response = await fetch('https://api.quickchart.io/v1/qr-art', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: text,
                image: compressedImage,
                size: 512,
                format: 'png',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('QuickChart error:', errorText);
            statusMsg.textContent = '❌ API error. Trying fallback...';
            // Пробуем GET-запрос как запасной вариант
            await generateAIQRFallback(text, compressedImage);
            return;
        }

        const blob = await response.blob();
        const resultUrl = URL.createObjectURL(blob);

        qrResult.innerHTML = '';
        const img = document.createElement('img');
        img.src = resultUrl;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '10px';
        qrResult.appendChild(img);

        logoDataUrl = resultUrl;
        statusMsg.textContent = '✅ AI art QR generated!';
        incrementAIUsage();
        downloadBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('Error:', error);
        statusMsg.textContent = '❌ ' + error.message;
    }
}

// === Запасной GET-запрос ===
async function generateAIQRFallback(text, compressedImage) {
    try {
        const encodedText = encodeURIComponent(text);
        // Берём только base64-часть, без data:image/jpeg;base64,
        const base64Data = compressedImage.split(',')[1];
        const encodedImage = encodeURIComponent(base64Data);

        const url = `https://api.quickchart.io/v1/qr-art?url=${encodedText}&image=${encodedImage}&size=512&format=png`;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;

        img.onload = function() {
            qrResult.innerHTML = '';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '10px';
            qrResult.appendChild(img);

            logoDataUrl = url;
            statusMsg.textContent = '✅ AI art QR generated!';
            incrementAIUsage();
            downloadBtn.style.display = 'inline-block';
        };

        img.onerror = function() {
            statusMsg.textContent = '❌ Generation failed. Please try another image.';
            qrResult.innerHTML = '<p style="color: red;">Unable to generate AI art.</p>';
        };
    } catch (error) {
        statusMsg.textContent = '❌ Fallback also failed.';
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

    fetch(logoDataUrl)
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'ai-qr-art.png';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        })
        .catch(() => {
            statusMsg.textContent = '❌ Right-click the image and select Save.';
        });
}

// === Инициализация ===
updateAICounter();
