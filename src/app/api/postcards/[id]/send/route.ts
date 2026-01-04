import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
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
        const displaySenderName = senderName || "a friend";

        console.log('Generated image URL:', generatedImageUrl);
        console.log('Sending to:', recipientEmail);

        let generatedPublicId;
        
        if (generatedImageUrl.includes('res.cloudinary.com')) {
            // Extract public_id from Cloudinary URL
            // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
            const urlParts = generatedImageUrl.split('/upload/');
            if (urlParts.length > 1) {
                const pathParts = urlParts[1].split('/');
                // Remove version if present (starts with 'v')
                const startIndex = pathParts[0].startsWith('v') ? 1 : 0;
                const publicIdWithExt = pathParts.slice(startIndex).join('/');
                // Remove file extension
                generatedPublicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
            }
        }
        
        if (!generatedPublicId) {
            console.log('Uploading generated image to Cloudinary...');
            const uploadResult = await cloudinary.uploader.upload(generatedImageUrl, {
                folder: 'postcards/generated'
            });
            generatedPublicId = uploadResult.public_id;
        }

        console.log('Generated image public_id:', generatedPublicId);

        const baseTemplatePublicId = 'base_template_pmmfwq';

        const GEN_IMAGE_WIDTH = 1420;
        const GEN_IMAGE_HEIGHT = 958;
        const GEN_IMAGE_X = 210;
        const GEN_IMAGE_Y = 110;

        // Build composite URL using Cloudinary transformations
        const transformations: any[] = [
            {
                // Overlay the generated image
                overlay: generatedPublicId.replace(/\//g, ':'),
                width: GEN_IMAGE_WIDTH,
                height: GEN_IMAGE_HEIGHT,
                crop: 'fill',
                gravity: 'north_west',
                x: GEN_IMAGE_X,
                y: GEN_IMAGE_Y,
                flags: 'layer_apply'
            }
        ];

        if (message && message.trim()) {
            transformations.push({
                overlay: `text:fonts:Autography.otf_48:${encodeURIComponent(message.substring(0, 200))}`,
                width: 600,
                crop: 'fit',
                gravity: 'north_west',
                x: 600,
                y: 1000,
                color: 'rgb:333333'  // Note: use 'rgb:' prefix for color
            });
        }

        const compositeImageUrl = cloudinary.url(baseTemplatePublicId, {
            transformation: transformations,
            secure: true
        });

        console.log('Composite image URL:', compositeImageUrl);

        const emailHtml = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        </head>
        <body style="font-family:Georgia,serif;background:#f5f5f5;margin:0;padding:40px 20px;">
        <div style="max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:8px;">
            <p style="text-align:center;color:#666;margin-bottom:20px;font-size:14px;">
            sent with <3 from ${displaySenderName}
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