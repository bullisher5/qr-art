// Ищем элементы на странице по их id
const generateBtn = document.getElementById('generate-btn'); // кнопка
const textInput = document.getElementById('text-input');     // поле ввода
const qrResult = document.getElementById('qr-result');       // контейнер для QR

// Когда кнопка нажата, выполняем функцию
generateBtn.addEventListener('click', function() {
    // 1. Получаем текст, который ввёл пользователь
    const text = textInput.value.trim(); // trim() убирает пробелы по краям

    // 2. Проверяем: если поле пустое — показываем предупреждение и выходим
    if (text === '') {
        alert('Пожалуйста, введи текст или ссылку!');
        return; // останавливаем функцию
    }

    // 3. Очищаем контейнер от предыдущего QR-кода (если был)
    qrResult.innerHTML = '';

    // 4. Создаём новый QR-код
    // QRCode.js ожидает, что мы передадим HTML-элемент, куда поместить код
    new QRCode(qrResult, {
        text: text,         // что зашифровать
        width: 256,         // размер картинки в пикселях
        height: 256,
        colorDark: '#00ffff',  // цвет тёмных модулей (неон циан)
        colorLight: '#0d0d0d', // цвет фона (тёмный)
        correctLevel: QRCode.CorrectLevel.H // высокий уровень коррекции ошибок
    });

    // Дополнительно: убираем надпись-заглушку, если она была
    // Но мы уже очистили innerHTML, так что всё ок.
});