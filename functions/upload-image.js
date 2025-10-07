// File: /functions/upload-image.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) return new Response('File not found', { status: 400 });

        const s3Client = new S3Client({
            region: "auto",
            endpoint: env.TIGRIS_ENDPOINT_URL_S3,
            credentials: {
                accessKeyId: env.TIGRIS_ACCESS_KEY_ID,
                secretAccessKey: env.TIGRIS_SECRET_ACCESS_KEY,
            },
        });

        const uniqueFileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
        
        await s3Client.send(
            new PutObjectCommand({
                Bucket: env.TIGRIS_BUCKET_NAME,
                Key: uniqueFileName,
                Body: await file.arrayBuffer(), // Use arrayBuffer for Cloudflare Workers
                ContentType: file.type,
            })
        );

        // ❗ IMPORTANT: Construct the public URL for your Tigris bucket
        const publicUrl = `https://${env.TIGRIS_BUCKET_NAME}.fly.storage.tigris.dev/${uniqueFileName}`;

        return new Response(JSON.stringify({ url: publicUrl }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Upload Error:", error.toString());
        return new Response('Error uploading file.', { status: 500 });
    }
}
