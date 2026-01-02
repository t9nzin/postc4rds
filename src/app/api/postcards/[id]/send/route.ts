import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { message, recipientEmail, senderName } = body;

        // Validate required fields
        if (!recipientEmail) {
            return NextResponse.json(
                { error: "Recipient email is required" },
                { status: 400 }
            );
        }

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

        // Check if postcard has been generated
        if (!postcard.generatedImageUrl && !postcard.originalPhotoUrl) {
            return NextResponse.json(
                { error: "Postcard image not available" },
                { status: 400 }
            );
        }

        // Get the generated image URL
        const generatedImageUrl = postcard.generatedImageUrl || postcard.originalPhotoUrl;
        const displaySenderName = senderName || "a friend";

        console.log('Generated image URL:', generatedImageUrl);
        console.log('Sending to:', recipientEmail);

        // Template URL and dimensions
        const TEMPLATE_URL = 'https://res.cloudinary.com/dvn8fwibn/image/upload/v1767371879/template_kmhcrt.png';

        // ADJUST THESE VALUES: Position and size for the generated image
        const GEN_IMAGE_X = 0;        // X position (left edge)
        const GEN_IMAGE_Y = 0;       // Y position (top edge)
        const GEN_IMAGE_WIDTH = 567;   // Width
        const GEN_IMAGE_HEIGHT = 397;  // Height

        // Load and fetch images
        console.log('Loading template and generated image...');
        const [templateResponse, generatedResponse] = await Promise.all([
            fetch(TEMPLATE_URL),
            fetch(generatedImageUrl)
        ]);

        const [templateBuffer, generatedBuffer] = await Promise.all([
            templateResponse.arrayBuffer(),
            generatedResponse.arrayBuffer()
        ]);

        // Resize generated image to desired dimensions
        const resizedGeneratedImage = await sharp(Buffer.from(generatedBuffer))
            .resize(GEN_IMAGE_WIDTH, GEN_IMAGE_HEIGHT, { fit: 'cover' })
            .toBuffer();

        // Composite generated image onto template
        console.log('Compositing images...');
        let compositeBuffer = await sharp(Buffer.from(templateBuffer))
            .composite([{
                input: resizedGeneratedImage,
                left: GEN_IMAGE_X,
                top: GEN_IMAGE_Y
            }])
            .toBuffer();

        // Note: Sharp doesn't support custom font text overlay easily
        // For text with custom fonts, you'd need to:
        // 1. Generate text as SVG with the font
        // 2. Convert SVG to image buffer
        // 3. Composite it onto the image
        // Or use canvas in a separate service
        // For now, text overlay is commented out - you can add it later

        const base64Image = `data:image/png;base64,${compositeBuffer.toString('base64')}`;

        // Upload composite to Cloudinary
        console.log('Uploading composite postcard to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: 'postcards/composed',
            resource_type: 'image',
        });

        console.log('Composite uploaded:', uploadResult.secure_url);
        const compositeImageUrl = uploadResult.secure_url;

        // Build simple HTML email with composite image
        const emailHtml = `<!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            </head>
            <body style="font-family:Georgia,serif;background:#f5f5f5;margin:0;padding:40px 20px;">
            <div style="max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:8px;">
            <p style="text-align:center;color:#666;margin-bottom:20px;">sent with <3 from ${displaySenderName}</p>
            <img src="${compositeImageUrl}" alt="Your postcard" style="width:100%;display:block;border-radius:4px;">
            <p style="text-align:center;margin-top:20px;font-size:14px;"><a href="https://postc4rds.xyz" style="color:#666;text-decoration:none;">postc4rds.xyz</a></p>
            </div>
            </body>
            </html>`;

        // Send email using Resend
        console.log('Sending email...');
        const emailData = await resend.emails.send({
            from: "postc4rds.xyz <onboarding@resend.dev>",
            to: recipientEmail,
            subject: "You've received a postcard!",
            html: emailHtml,
        });

        // Update postcard in database
        await prisma.postcard.update({
            where: { id },
            data: {
                message,
                recipientEmail,
                status: "sent",
                sentAt: new Date(),
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: "Postcard sent successfully",
                emailId: emailData.data?.id
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error sending postcard:", error);
        return NextResponse.json(
            {
                error: "Failed to send postcard",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
