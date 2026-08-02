const generateBtn = document.getElementById('generate-btn');
const downloadBtn = document.getElementById('download-btn');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const qrResult = document.getElementById('qr-result');

// Добавляем поле выбора цвета
const colorPicker = document.createElement('input');
colorPicker.type = 'color';
colorPicker.value = '#00ffff';
colorPicker.id = 'color-picker';
colorPicker.style.cssText = `
    display: block;
    margin: 15px auto 0;
    width: 60px;
    height: 40px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #0d0d0d;
    cursor: pointer;
`;
generateBtn.parentNode.insertBefore(colorPicker, generateBtn);

const colorLabel = document.createElement('label');
colorLabel.textContent = 'QR color:';
colorLabel.style.cssText = 'display: block; margin-top: 15px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: #aaaaaa;';
colorPicker.parentNode.insertBefore(colorLabel, colorPicker);

// Переменная для хранения URL логотипа (нужна при скачивании)
let logoDataUrl = null;

generateBtn.addEventListener('click', function() {
    const text = textInput.value.trim();

    if (text === '') {
        alert('Please enter text or a link!');
        return;
    }

    qrResult.innerHTML = '';
    logoDataUrl = null;

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
});

downloadBtn.addEventListener('click', function() {
    const qrCanvas = qrResult.querySelector('canvas');
    if (!qrCanvas) {
        alert('Generate a QR code first!');
        return;
    }

    // Если есть логотип — рисуем его на canvas перед скачиванием
    if (logoDataUrl) {
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = qrCanvas.width;
        mergedCanvas.height = qrCanvas.height;
        const ctx = mergedCanvas.getContext('2d');

        // Рисуем QR
        ctx.drawImage(qrCanvas, 0, 0);

        // Рисуем логотип по центру
        const logoImg = new Image();
        logoImg.onload = function() {
            const logoSize = 60;
            const x = (mergedCanvas.width - logoSize) / 2;
            const y = (mergedCanvas.height - logoSize) / 2;

            // Белая подложка под логотип
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.roundRect(x - 4, y - 4, logoSize + 8, logoSize + 8, 8);
            ctx.fill();

            // Сам логотип
            ctx.drawImage(logoImg, x, y, logoSize, logoSize);

            // Скачиваем
            const link = document.createElement('a');
            link.download = 'qr-code.png';
            link.href = mergedCanvas.toDataURL('image/png');
            link.click();
        };
        logoImg.src = logoDataUrl;
    } else {
        // Без логотипа — просто скачиваем canvas
        const link = document.createElement('a');
        link.download = 'qr-code.png';
        link.href = qrCanvas.toDataURL('image/png');
        link.click();
    }
});

// Стили для кнопки скачивания
downloadBtn.style.cssText = `
    display: none;
    margin-top: 15px;
    background: linear-gradient(45deg, #ff00ff, #00ffff);
    border: none;
    color: #000;
    font-weight: bold;
    padding: 12px 25px;
    border-radius: 30px;
    font-size: 1rem;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: 0.3s;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.4);
`;
downloadBtn.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.05)';
});
downloadBtn.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
});
