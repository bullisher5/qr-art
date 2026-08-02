// Ищем элементы на странице по их id
const generateBtn = document.getElementById('generate-btn');
const textInput = document.getElementById('text-input');
const imageInput = document.getElementById('image-input');
const qrResult = document.getElementById('qr-result');

// Когда кнопка нажата, выполняем функцию
generateBtn.addEventListener('click', function() {
    const text = textInput.value.trim();

    // Проверяем текст
    if (text === '') {
        alert('Пожалуйста, введи текст или ссылку!');
        return;
    }

    // Очищаем контейнер
    qrResult.innerHTML = '';

    // Создаём QR-код
    new QRCode(qrResult, {
        text: text,
        width: 300,
        height: 300,
        colorDark: '#00ffff',
        colorLight: '#0d0d0d',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Если загружена картинка — вставляем её в центр QR
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.position = 'absolute';
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.borderRadius = '8px';
            img.style.top = '50%';
            img.style.left = '50%';
            img.style.transform = 'translate(-50%, -50%)';
            img.style.background = 'white';
            img.style.padding = '4px';
            img.style.boxShadow = '0 0 10px rgba(0,255,255,0.5)';

            qrResult.style.position = 'relative';
            qrResult.appendChild(img);
        };
        reader.readAsDataURL(imageInput.files[0]);
    }
});
