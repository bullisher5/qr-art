// === DOM элементы ===
const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const qrResult = document.getElementById('qr-result');
const statusMsg = document.getElementById('status-message');
const colorPicker = document.getElementById('color-picker');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');

// Обновляем значение слайдера
opacitySlider.addEventListener('input', function() {
    opacityValue.textContent = opacitySlider.value;
});

// === Генерация ===
generateBtn.addEventListener('click', async function() {
    const text = textInput.value.trim();

    if (text === '') {
        statusMsg.textContent = 'Please enter text or a link!';
        return;
    }

    statusMsg.textContent = '✨ Generating...';
    qrResult.innerHTML = '';
    downloadBtn.style.display = 'none';

    try {
        await generateArtQR(text);
        statusMsg.textContent = '✅ Done!';
        downloadBtn.style.display = 'inline-block';
    } catch (error) {
        statusMsg.textContent = '❌ Error. Please try again.';
        console.error(error);
    }
});

// === Art QR: фон + код + логотип ===
async function generateArtQR(text) {
    return new Promise(async (resolve, reject) => {
        const hasImage = imageInput.files && imageInput.files[0];
        const selectedColor = colorPicker.value;
        const opacity = parseInt(opacitySlider.value) / 100;

        // Создаём общий canvas 600x600
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');

        // 1. Рисуем фон (тёмный)
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(0, 0, 600, 600);

        // 2. Если есть картинка — рисуем её как фон с прозрачностью
        if (hasImage) {
            await drawBackgroundImage(ctx, imageInput.files[0], opacity);
        }

        // 3. Генерируем QR-код во временный canvas
        const qrCanvas = await generateQRCanvas(text, selectedColor);

        // 4. Рисуем QR поверх фона
        ctx.drawImage(qrCanvas, 150, 150, 300, 300);

        // 5. Если есть картинка — рисуем логотип в центре
        if (hasImage) {
            await drawLogoInCenter(ctx, imageInput.files[0]);
        }

        // 6. Показываем результат
        qrResult.innerHTML = '';
        canvas.style.maxWidth = '100%';
        canvas.style.borderRadius = '12px';
        qrResult.appendChild(canvas);

        // Сохраняем для скачивания
        canvas._downloadUrl = canvas.toDataURL('image/png');
        resolve();
    });
}

// === Рисуем фоновое изображение ===
function drawBackgroundImage(ctx, file, opacity) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Сохраняем текущее состояние
                ctx.save();
                // Устанавливаем прозрачность
                ctx.globalAlpha = opacity;
                // Рисуем картинку на весь canvas, обрезая по центру (cover)
                const scale = Math.max(600 / img.width, 600 / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (600 - w) / 2;
                const y = (600 - h) / 2;
                ctx.drawImage(img, x, y, w, h);
                // Восстанавливаем состояние
                ctx.restore();
                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// === Генерируем QR-код на временном canvas ===
function generateQRCanvas(text, color) {
    return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        const qr = new QRCode(tempDiv, {
            text: text,
            width: 300,
            height: 300,
            colorDark: color,
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        // Даём время на рендеринг
        setTimeout(() => {
            const qrCanvas = tempDiv.querySelector('canvas');
            resolve(qrCanvas);
        }, 100);
    });
}

// === Рисуем логотип в центре ===
function drawLogoInCenter(ctx, file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const logoSize = 80;
                const x = (600 - logoSize) / 2;
                const y = (600 - logoSize) / 2;

                // Белая подложка с закруглением
                ctx.fillStyle = 'white';
                ctx.beginPath();
                roundRect(ctx, x - 6, y - 6, logoSize + 12, logoSize + 12, 12);
                ctx.fill();

                // Логотип
                ctx.drawImage(img, x, y, logoSize, logoSize);

                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Вспомогательная функция для закруглённых прямоугольников
function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// === Скачивание ===
downloadBtn.addEventListener('click', function() {
    const canvas = qrResult.querySelector('canvas');
    if (!canvas || !canvas._downloadUrl) {
        statusMsg.textContent = 'Generate a QR first!';
        return;
    }

    const link = document.createElement('a');
    link.download = 'art-qr.png';
    link.href = canvas._downloadUrl;
    link.click();
});
