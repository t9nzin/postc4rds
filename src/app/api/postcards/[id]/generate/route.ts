import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from 'cloudinary';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';
import { VertexAI } from '@google-cloud/vertexai';

cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');

const predictionClient = new PredictionServiceClient({
    credentials: credentials,
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
});

// Initialize Gemini Vision
const vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT!,
    location: 'us-central1',
    googleAuthOptions: {
        credentials: credentials
    }
});

const generativeVisionModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
});

const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = 'us-central1';
const publisher = 'google';
const model = 'imagen-3.0-fast-generate-001'; 

const generatePostcardPrompt = (userDescription: string) => {
    return `${userDescription}. Exact style: vintage 1940s Curt Teich linen travel postcard, chromolithograph print, textured paper, faded colors`;
};

const negativePrompt = `modern, digital painting, vector art, contemporary, photorealistic, sharp details, HD, anime, cartoon, people, faces, text, watermark`;

// Upload your reference postcard images to Cloudinary and use their URLs
const REFERENCE_POSTCARD_URLS = [
    'https://res.cloudinary.com/dvn8fwibn/image/upload/v1767068072/postcard2_hjnxzf.jpg',
    'https://res.cloudinary.com/dvn8fwibn/image/upload/v1767068072/postcard3_hsy8ee.jpg',
    'https://res.cloudinary.com/dvn8fwibn/image/upload/v1767068073/postcard1_ke0cfc.jpg'
];

async function getBase64FromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

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

        // Get the user's uploaded photo as base64
        const userImageBase64 = await getBase64FromUrl(postcard.originalPhotoUrl);

        console.log('👁️ Analyzing photo with Gemini Vision...');

        // Use Gemini Vision to analyze the photo
        const visionPrompt = `Analyze this photo and describe:
1. Main subject/location (e.g., "Eiffel Tower in Paris", "Grand Canyon", "Beach sunset")
2. Key themes and atmosphere (e.g., "romantic, European travel", "adventure, natural wonder")
3. Notable elements or landmarks

Be concise (2-3 sentences max). Focus on what would make a great vintage postcard theme.`;

        const visionResult = await generativeVisionModel.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        text: visionPrompt
                    },
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: userImageBase64
                        }
                    }
                ]
            }]
        });

        const photoDescription = visionResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "scenic travel destination";
        console.log('✅ Photo analysis:', photoDescription);

        // Build themed postcard prompt
        const userStyle = postcard.aiPrompt || "";
        const fullPrompt = `A vintage 1940s linen travel postcard featuring: ${photoDescription}. ${userStyle}. Style: Curt Teich chromolithograph print, textured linen paper, vibrant but slightly faded colors, artistic painted quality, no text or words.`;

        console.log('🎨 Generating themed postcard with Imagen 3 Fast');
        console.log('💬 Final prompt:', fullPrompt);

        const endpoint = `projects/${project}/locations/${location}/publishers/${publisher}/models/${model}`;

        // Generate themed postcard from description (text-to-image)
        const instanceValue = helpers.toValue({
            prompt: fullPrompt
        });

        const instances = [instanceValue!];

        // Imagen 3 parameters
        const parameter = {
            sampleCount: 1,
            aspectRatio: "4:3",
            negativePrompt: negativePrompt,
            storageUri: null,
        };

        const parameters = helpers.toValue(parameter);

        const request: any = {
            endpoint,
            instances,
            parameters,
        };

        console.log('🚀 Calling Vertex AI Imagen with style reference...');

        const [response] = await predictionClient.predict(request) as any;

        if (!response || !response.predictions || response.predictions.length === 0) {
            throw new Error('No predictions returned from Vertex AI');
        }

        const prediction = response.predictions[0];
        const imageData = (prediction as any).structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (!imageData) {
            throw new Error('No image data in prediction response');
        }

        console.log('✅ Vintage postcard generated successfully');

        const base64Image = `data:image/png;base64,${imageData}`;

        console.log('☁️ Uploading to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: 'postcards/generated',
            resource_type: 'image',
        });

        console.log('✅ Uploaded to Cloudinary:', uploadResult.secure_url);

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