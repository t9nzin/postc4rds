import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

const resend = new Resend(process.env.RESEND_API_KEY);

cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

// Helper to download image as buffer
async function downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { message, recipientEmail } = body;

        if (!recipientEmail) {
            return NextResponse.json(
                { error: "Recipient email is required" },
                { status: 400 }
            );
        }

        const postcard = await prisma.postcard.findUnique({
            where: { id },
        });

        if (!postcard) {
            return NextResponse.json(
                { error: "Postcard not found" },
                { status: 404 }
            );
        }

        if (!postcard.generatedImageUrl && !postcard.originalPhotoUrl) {
            return NextResponse.json(
                { error: "Postcard image not available" },
                { status: 400 }
            );
        }

        const generatedImageUrl = postcard.generatedImageUrl || postcard.originalPhotoUrl;

        console.log('Generated image URL:', generatedImageUrl);
        console.log('Sending to:', recipientEmail);

        const baseTemplatePublicId = 'base_template_pmmfwq';
        const baseTemplateUrl = cloudinary.url(baseTemplatePublicId, { 
            secure: true,
            format: 'jpg'
        });

        const GEN_IMAGE_WIDTH = 1420;
        const GEN_IMAGE_HEIGHT = 958;
        const GEN_IMAGE_X = 210;
        const GEN_IMAGE_Y = 110;

        const ORIGINAL_IMAGE_WIDTH = 400;
        const ORIGINAL_IMAGE_HEIGHT = 400;
        const ORIGINAL_IMAGE_X = 100;
        const ORIGINAL_IMAGE_Y = 1200;

        // Download all images in parallel
        console.log('Downloading images...');
        const downloadPromises = [
            downloadImage(baseTemplateUrl),
            downloadImage(generatedImageUrl)
        ];

        if (postcard.originalPhotoUrl) {
            downloadPromises.push(downloadImage(postcard.originalPhotoUrl));
        }

        const [baseTemplate, generatedImage, originalPhoto] = await Promise.all(downloadPromises);

        // Resize images to exact dimensions
        console.log('Resizing images...');
        const resizedGenerated = await sharp(generatedImage)
            .resize(GEN_IMAGE_WIDTH, GEN_IMAGE_HEIGHT, { fit: 'cover' })
            .toBuffer();

        const resizedOriginal = originalPhoto 
            ? await sharp(originalPhoto)
                .resize(ORIGINAL_IMAGE_WIDTH, ORIGINAL_IMAGE_HEIGHT, { fit: 'cover' })
                .toBuffer()
            : null;

        // Build composite operations
        const compositeOperations: any[] = [
            {
                input: resizedGenerated,
                top: GEN_IMAGE_Y,
                left: GEN_IMAGE_X
            }
        ];

        if (resizedOriginal) {
            compositeOperations.push({
                input: resizedOriginal,
                top: ORIGINAL_IMAGE_Y,
                left: ORIGINAL_IMAGE_X
            });
        }

        // Add text overlay if message exists
        if (message) {
            const cleanMessage = message
                .trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');

            // Create text as SVG
            const textSvg = `
                <svg width="550" height="300">
                    <style>
                        @font-face {
                            font-family: 'Autography';
                            src: url('https://fonts.cdnfonts.com/s/16917/Autography.woff') format('woff');
                        }
                        text {
                            font-family: 'Autography', cursive;
                            font-size: 48px;
                            fill: #333333;
                        }
                    </style>
                    <text x="0" y="48" textLength="550" lengthAdjust="spacingAndGlyphs">
                        ${cleanMessage}
                    </text>
                </svg>
            `;

            const textBuffer = await sharp(Buffer.from(textSvg))
                .png()
                .toBuffer();

            compositeOperations.push({
                input: textBuffer,
                top: 1600,
                left: 1000
            });
        }

        // Compose everything together
        console.log('Composing final image...');
        const compositeBuffer = await sharp(baseTemplate)
            .composite(compositeOperations)
            .jpeg({ quality: 90 })
            .toBuffer();

        // Upload final composite to Cloudinary
        console.log('Uploading final composite to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${compositeBuffer.toString('base64')}`,
            {
                folder: 'postcards/final',
                public_id: `postcard_${id}_${Date.now()}`
            }
        );

        const compositeImageUrl = uploadResult.secure_url;
        console.log('Final composite URL:', compositeImageUrl);

        const emailHtml = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        </head>
        <body style="font-family:Georgia,serif;background:#ffffff;margin:0;padding:40px 20px;">
        <div style="max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:8px;">
            <p style="text-align:center;color:#666;margin-bottom:20px;font-size:14px;">
            sent with <3 from a friend
            </p>
            <img src="${compositeImageUrl}" alt="Your postcard" style="width:100%;display:block;border-radius:4px;">
            <p style="text-align:center;margin-top:20px;font-size:14px;">
            <a href="https://postc4rds.xyz" style="color:#666;text-decoration:none;">
                postc4rds.xyz
            </a>
            </p>
        </div>
        </body>
        </html>`;

        console.log('Sending email...');
        const emailData = await resend.emails.send({
            from: "postc4rds.xyz <onboarding@resend.dev>",
            to: recipientEmail,
            subject: "You've received a postcard!",
            html: emailHtml,
        });

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
                emailId: emailData.data?.id,
                compositeImageUrl
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