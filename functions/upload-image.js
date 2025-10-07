// File: /functions/upload-image.js

import { sign } from 'aws4';

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: 'File not provided.' }), { status: 400 });
        }

        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        const url = new URL(env.TIGRIS_ENDPOINT_URL_S3);
        const body = await file.arrayBuffer();

        // Prepare the request for signing
        const requestOptions = {
            method: 'PUT',
            host: url.hostname,
            path: `/${env.TIGRIS_BUCKET_NAME}/${uniqueFileName}`,
            service: 's3',
            region: 'auto',
            headers: {
                'Content-Type': file.type,
                'Content-Length': body.byteLength,
            },
            body: body,
        };

        // Sign the request with your Tigris credentials from Cloudflare environment variables
        const signedRequest = sign(requestOptions, {
            accessKeyId: env.TIGRIS_ACCESS_KEY_ID,
            secretAccessKey: env.TIGRIS_SECRET_ACCESS_KEY,
        });

        // Perform the upload using the standard fetch API
        const uploadResponse = await fetch(`https://${signedRequest.host}${signedRequest.path}`, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: signedRequest.body,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Tigris upload failed: ${errorText}`);
        }

        // Construct the public URL for your Tigris bucket
        const publicUrl = `https://fly.storage.tigris.dev/${env.TIGRIS_BUCKET_NAME}/${uniqueFileName}`;

        return new Response(JSON.stringify({ url: publicUrl }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Upload Function Error:", error.toString());
        return new Response(JSON.stringify({ error: 'Error uploading file.' }), { status: 500 });
    }
}
