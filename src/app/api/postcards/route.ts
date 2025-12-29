import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const {
            originalPhotoUrl,
            aiPrompt,
            message,
            recipientEmail,
            location,
            style,
        } = body;

        if (!originalPhotoUrl) {
            return NextResponse.json(
                { error: "Image is required" },
                { status: 400 }
            );
        }

        // Upload image to Cloudinary
        let cloudinaryUrl: string;
        try {
            const uploadResult = await cloudinary.uploader.upload(originalPhotoUrl, {
                folder: 'postcards',
                resource_type: 'image',
            });
            cloudinaryUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary upload error:', uploadError);
            return NextResponse.json(
                { error: "Failed to upload image", details: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
                { status: 500 }
            );
        }

        const postcard = await prisma.postcard.create({
            data: {
                originalPhotoUrl: cloudinaryUrl,
                aiPrompt,
                message,
                recipientEmail,
                location,
                style,
                status: "pending",
            },
        });

        return NextResponse.json(
            { id: postcard.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating postcard:', error);
        return NextResponse.json(
            { error: "Failed to create postcard", details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}