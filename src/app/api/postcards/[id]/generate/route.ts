import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from 'cloudinary';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';
import { VertexAI } from '@google-cloud/vertexai';
import { generationRateLimit, getClientIP, reserveBudget, releaseBudget } from "@/lib/ratelimit";

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
    return `${userDescription}. Exact style: vintage 1940s Curt Teich linen travel postcard, chromolithograph print, textured paper, faded colors, do not add borders to the postcard`;
};

const negativePrompt = `modern, digital painting, vector art, contemporary, photorealistic, sharp details, HD, anime, cartoon, people, faces, text, watermark`;

async function getBase64FromUrl(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
}

// Helper to update progress
async function updateProgress(id: string, progress: number, status: string) {
    await prisma.postcard.update({
        where: { id },
        data: {
            generationProgress: progress,
            generationStatus: status,
        },
    });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Track budget state outside try block for proper cleanup
    let budgetReserved = false;
    let budgetConsumed = false;

    try {
        // Safety: Check if generation is disabled
        if (process.env.DISABLE_GENERATION === 'true') {
            return NextResponse.json(
                { error: "Generation is temporarily unavailable. Please try again later." },
                { status: 503 }
            );
        }

        // Rate limiting FIRST (before reserving budget) - prevents budget leak on rate limit
        const ip = getClientIP(req);
        const { success, limit, remaining, reset } = await generationRateLimit.limit(ip);

        if (!success) {
            const resetDate = new Date(reset);
            return NextResponse.json(
                {
                    error: "Rate limit exceeded. You can generate up to 3 postcards per hour.",
                    retryAfter: resetDate.toISOString()
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                        "X-RateLimit-Reset": reset.toString(),
                    }
                }
            );
        }

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

        // HARD STOP: Reserve budget right before API calls (after all validation)
        const budget = await reserveBudget();
        if (!budget.allowed) {
            console.error(`BUDGET LIMIT REACHED: $${budget.newTotalCents / 100} spent of $${budget.limitCents / 100} limit`);
            return NextResponse.json(
                { error: "Generation is temporarily unavailable. Please try again later." },
                { status: 503 }
            );
        }
        budgetReserved = true;

        // Update: Starting
        await updateProgress(id, 10, 'Preparing your image...');

        // Get the user's uploaded photo as base64
        const userImageBase64 = await getBase64FromUrl(postcard.originalPhotoUrl);

        // Update: Analyzing
        await updateProgress(id, 25, 'Analyzing your photo with AI...');
        console.log('Analyzing photo with Gemini Vision...');

        // Use Gemini Vision to analyze the photo
        const visionPrompt = `Analyze this photo and identify the location/destination for a vintage travel postcard:

1. What location or destination is shown? (e.g., "Paris, France", "Beach resort", "Mountain town")
2. What's the general vibe/activity type? (e.g., "romantic city exploration", "beach relaxation", "outdoor adventure")

Respond briefly with the location and vibe. This will be used to generate a DIFFERENT scene at the same location.

Format: "[Location] - [vibe/activity type]"
Example: "Paris, France - romantic city life" or "Tropical beach - leisure and relaxation"`;

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

        const locationTheme = visionResult.response.candidates?.[0]?.content?.parts?.[0]?.text || "scenic travel destination";
        console.log('Location theme extracted:', locationTheme);

        // Update: Generating
        await updateProgress(id, 50, 'Creating your vintage postcard...');

        // Build diverse postcard prompt - same location, DIFFERENT scene
        const userCustomization = postcard.aiPrompt || "";

        // Make user's custom request the PRIMARY instruction if provided
        let fullPrompt;
        if (userCustomization) {
            // User's request comes FIRST as the main subject
            fullPrompt = `${userCustomization}, in the style of a vintage 1940s Curt Teich linen travel postcard of ${locationTheme}.

IMPORTANT: Fulfill the specific user request above. The location "${locationTheme}" is just context - prioritize the user's creative direction.

Style: Chromolithograph print with artistic painted quality, vibrant but slightly faded colors, textured linen paper finish.`;
        } else {
            // Default: varied scene of the location
            fullPrompt = `A vintage 1940s linen travel postcard depicting ${locationTheme}.

Create a DIFFERENT scene than a typical tourist photo - show a unique perspective, different activity, or varied composition of this location. Can include people engaging in activities, but make it artistic and varied.

Style: Curt Teich chromolithograph print with painted artistic quality, vibrant but slightly faded colors, textured linen paper finish. Capture the essence and atmosphere of the destination in a fresh, creative way.`;
        }

        console.log('Generating themed postcard with Imagen 3 Fast');
        console.log('Final prompt:', fullPrompt);

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

        console.log('Calling Vertex AI Imagen with style reference...');

        const [response] = await predictionClient.predict(request) as any;

        // API call succeeded - budget is now consumed
        budgetConsumed = true;

        if (!response || !response.predictions || response.predictions.length === 0) {
            throw new Error('No predictions returned from Vertex AI');
        }

        const prediction = response.predictions[0];
        const imageData = (prediction as any).structValue?.fields?.bytesBase64Encoded?.stringValue;

        if (!imageData) {
            throw new Error('No image data in prediction response');
        }

        console.log('Vintage postcard generated successfully');

        // Update: Uploading
        await updateProgress(id, 80, 'Finalizing your postcard...');

        const base64Image = `data:image/png;base64,${imageData}`;

        console.log('Uploading to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: 'postcards/generated',
            resource_type: 'image',
        });

        console.log('Uploaded to Cloudinary:', uploadResult.secure_url);

        const updatedPostcard = await prisma.postcard.update({
            where: { id },
            data: {
                generatedImageUrl: uploadResult.secure_url,
                status: "generated",
                generationProgress: 100,
                generationStatus: 'Complete!',
            },
        });

        console.log('Generation completed, budget consumed');

        return NextResponse.json(
            {
                success: true,
                generatedImageUrl: uploadResult.secure_url,
                postcard: updatedPostcard,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error generating postcard:", error);

        // Release budget if we reserved it but didn't consume it (API call failed)
        if (budgetReserved && !budgetConsumed) {
            try {
                await releaseBudget();
                console.log("Budget released due to generation failure");
            } catch (releaseError) {
                console.error("Failed to release budget:", releaseError);
            }
        }

        return NextResponse.json(
            {
                error: "Failed to generate postcard",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}