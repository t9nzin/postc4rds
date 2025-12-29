import { NextResponse } from "next/server";
// ^ next.js helper to create http responses in app router
// NextResponse.json(data, options?) <-- data is required, gets turned into json
// options? is optional, lets you customize things like HTTP status, headers, etc
import { prisma } from "@/lib/prisma"; 


export async function GET(
    _req: Request, 
    { params }: { params: { id: string } }
) {
    const postcard = await prisma.postcard.findUnique({
        where: { id: params.id },
    });

    if (!postcard) {
        return NextResponse.json(
            { error: "Postcard not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(postcard);
}