import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 


export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

    return NextResponse.json(postcard);
}