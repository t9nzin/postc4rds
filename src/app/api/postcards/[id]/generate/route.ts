import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from 'cloudinary';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';


cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

// Parse credentials from environment variable
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');

// Initialize Vertex AI client
const predictionClient = new PredictionServiceClient({
    credentials: credentials,
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = 'us-central1';
const publisher = 'google';
const model = 'imagegeneration@006'; // Imagen 2

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch postcard from database
        const postcard = await prisma.postcard.findUnique({
            where: { id },
        });

        if (!postcard) {
            return NextResponse.json(
                { error: "Postcard not found" },
                { status: 404 }
            );
        }

        if (!postcard.originalPhotoUrl) {
            return NextResponse.json(
                { error: "No image to transform" },
                { status: 400 }
            );
        }

        // Build the prompt
        const basePrompt = "Transform this photo into a beautiful vintage postcard style image. Add warm tones, slight vignetting, and a nostalgic aesthetic.";
        const userPrompt = postcard.aiPrompt || "";
        const fullPrompt = userPrompt ? `${basePrompt} ${userPrompt}` : basePrompt;

        console.log('🎨 Generating image with prompt:', fullPrompt);
        console.log('📸 Original image URL:', postcard.originalPhotoUrl);

        // Prepare the request for Vertex AI Imagen
        const endpoint = `projects/${project}/locations/${location}/publishers/${publisher}/models/${model}`;

        const instanceValue = helpers.toValue({
            prompt: fullPrompt,
        });

        const instances = [instanceValue!];

        const parameter = {
            sampleCount: 1,
            aspectRatio: "4:3", // Postcard ratio
            negativePrompt: "blurry, low quality, distorted",
            addWatermark: false,
        };

        const parameters = helpers.toValue(parameter);

        const request: any = {
            endpoint,
            instances,
            parameters,
        };

        console.log('🚀 Calling Vertex AI Imagen...');

        // Call Vertex AI
        const [response] = await predictionClient.predict(request) as any;

        if (!response || !response.predictions || response.predictions.length === 0) {
            throw new Error('No predictions returned from Vertex AI');
        }

        // Extract the generated image (base64 encoded)
        const prediction = response.predictions[0];
        const imageData = (prediction as any).structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (!imageData) {
            throw new Error('No image data in prediction response');
        }

        console.log('✅ Image generated successfully');

        // Convert base64 to data URL for Cloudinary upload
        const base64Image = `data:image/png;base64,${imageData}`;

        // Upload generated image to Cloudinary
        console.log('☁️ Uploading to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: 'postcards/generated',
            resource_type: 'image',
        });

        console.log('✅ Uploaded to Cloudinary:', uploadResult.secure_url);

        // Update postcard in database
        const updatedPostcard = await prisma.postcard.update({
            where: { id },
            data: {
                generatedImageUrl: uploadResult.secure_url,
                status: "generated",
            },
        });

        return NextResponse.json(
            {
                success: true,
                generatedImageUrl: uploadResult.secure_url,
                postcard: updatedPostcard,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("❌ Error generating postcard:", error);
        return NextResponse.json(
            {
                error: "Failed to generate postcard",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
