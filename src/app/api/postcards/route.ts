import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 


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

        const postcard = await prisma.postcard.create({
            data: {
                originalPhotoUrl,
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