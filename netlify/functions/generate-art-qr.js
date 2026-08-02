const fetch = require('node-fetch');

exports.handler = async (event) => {
    // Разрешаем только POST-запросы
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        const { text, image } = JSON.parse(event.body);

        if (!text || !image) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text and image are required' }),
            };
        }

        // Отправляем запрос к Replicate
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: 'zylim0702/qr_code_controlnet',
                input: {
                    url: text,
                    image: image,
                },
            }),
        });

        const prediction = await response.json();

        // Если результат ещё не готов, ждём до 30 секунд
        if (prediction.status === 'processing' || prediction.status === 'starting') {
            const result = await waitForCompletion(prediction.urls.get);
            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(prediction),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

// Функция ожидания завершения генерации
async function waitForCompletion(getUrl) {
    let attempts = 0;
    const maxAttempts = 15; // 15 попыток по 2 секунды = 30 секунд максимум

    while (attempts < maxAttempts) {
        const response = await fetch(getUrl, {
            headers: {
                'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
            },
        });
        const data = await response.json();

        if (data.status === 'succeeded') {
            return data;
        }
        if (data.status === 'failed') {
            throw new Error('AI generation failed');
        }

        // Ждём 2 секунды перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
    }

    throw new Error('Generation timed out. Please try again.');
}
