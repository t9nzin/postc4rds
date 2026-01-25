import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const postcard = await prisma.postcard.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                generationProgress: true,
                generationStatus: true,
                generatedImageUrl: true,
            },
        });

        if (!postcard) {
            return NextResponse.json(
                { error: "Postcard not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(postcard, { status: 200 });

    } catch (error) {
        console.error("Error fetching postcard status:", error);
        return NextResponse.json(
            { error: "Failed to fetch status" },
            { status: 500 }
        );
    }
}
