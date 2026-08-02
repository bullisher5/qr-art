// Netlify Function для генерации AI Art QR через Replicate
// Используем нативный fetch (Node.js 18+), node-fetch больше не нужен

exports.handler = async (event) => {
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

        if (!process.env.REPLICATE_API_TOKEN) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API token not configured on server' }),
            };
        }

        console.log('Sending request to Replicate...');
        console.log('Text:', text);
        console.log('Image length:', image.length);

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
        console.log('Replicate initial response:', JSON.stringify(prediction).substring(0, 500));

        if (prediction.error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Replicate error: ' + prediction.error }),
            };
        }

        if (prediction.detail) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Replicate detail: ' + prediction.detail }),
            };
        }

        if (prediction.status === 'processing' || prediction.status === 'starting') {
            console.log('Waiting for completion...');
            const result = await waitForCompletion(prediction.urls.get);
            return {
                statusCode: 200,
                body: JSON.stringify(result),
            };
        }

        if (prediction.status === 'succeeded') {
            return {
                statusCode: 200,
                body: JSON.stringify(prediction),
            };
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Unexpected status: ' + prediction.status,
                fullResponse: prediction 
            }),
        };

    } catch (error) {
        console.error('Function error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

async function waitForCompletion(getUrl) {
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
        console.log(`Polling attempt ${attempts + 1}...`);
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
            throw new Error('AI generation failed: ' + JSON.stringify(data));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
    }

    throw new Error('Generation timed out after 30 seconds');
}
