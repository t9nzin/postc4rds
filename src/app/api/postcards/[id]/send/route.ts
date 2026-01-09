export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import satori from 'satori';

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

        const baseTemplatePublicId = 'postcard_template_h8hzvu';
        const baseTemplateUrl = cloudinary.url(baseTemplatePublicId, { 
            secure: true,
            format: 'jpg'
        });

        const GEN_IMAGE_WIDTH = 1420;
        const GEN_IMAGE_HEIGHT = 958;
        const GEN_IMAGE_X = 210;
        const GEN_IMAGE_Y = 110;

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

        // Calculate aspect ratio-based dimensions for original photo
        let resizedOriginal = null;
        let ORIGINAL_IMAGE_WIDTH, ORIGINAL_IMAGE_HEIGHT, ORIGINAL_IMAGE_X, ORIGINAL_IMAGE_Y;

        if (originalPhoto) {
            // Auto-rotate based on EXIF orientation before getting dimensions
            const rotatedPhoto = await sharp(originalPhoto)
                .rotate() // Respects EXIF orientation
                .toBuffer();

            const metadata = await sharp(rotatedPhoto).metadata();
            const aspectRatio = metadata.width! / metadata.height!;

            console.log('Original photo dimensions (after EXIF rotation):', metadata.width, 'x', metadata.height, '- Aspect ratio:', aspectRatio.toFixed(2));

            if (aspectRatio > 1.1) {
                // Landscape
                ORIGINAL_IMAGE_WIDTH = 625;
                ORIGINAL_IMAGE_HEIGHT = 422;
                ORIGINAL_IMAGE_X = 250;
                ORIGINAL_IMAGE_Y = 1500;
                console.log('Detected: Landscape');
            } else if (aspectRatio < 0.9) {
                // Portrait
                ORIGINAL_IMAGE_WIDTH = 522;
                ORIGINAL_IMAGE_HEIGHT = 696;
                ORIGINAL_IMAGE_X = 300;
                ORIGINAL_IMAGE_Y = 1400;
                console.log('Detected: Portrait');
            } else {
                // Square
                ORIGINAL_IMAGE_WIDTH = 578;
                ORIGINAL_IMAGE_HEIGHT = 578;
                ORIGINAL_IMAGE_X = 270;
                ORIGINAL_IMAGE_Y = 1400;
                console.log('Detected: Square');
            }

            resizedOriginal = await sharp(rotatedPhoto)
                .resize(ORIGINAL_IMAGE_WIDTH, ORIGINAL_IMAGE_HEIGHT, { fit: 'cover' })
                .toBuffer();
        }

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

            // Wrap text to 25 characters per line
            const wrapText = (text: string, maxCharsPerLine: number): string[] => {
                const words = text.split(' ');
                const lines: string[] = [];
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;

                    if (testLine.length <= maxCharsPerLine) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) {
                            lines.push(currentLine);
                        }
                        currentLine = word;
                    }
                }

                if (currentLine) {
                    lines.push(currentLine);
                }

                return lines;
            };

            const wrappedLines = wrapText(cleanMessage, 30);
            const lineHeight = 70;
            const svgHeight = Math.max(300, wrappedLines.length * lineHeight + 50);

            // Fetch font from Cloudinary
            console.log('Fetching Autography font...');
            const fontUrl = 'https://res.cloudinary.com/dvn8fwibn/raw/upload/v1767483335/Autography_xiwspj.otf';
            const fontResponse = await fetch(fontUrl);
            if (!fontResponse.ok) {
                throw new Error('Failed to fetch font from Cloudinary');
            }
            const fontData = await fontResponse.arrayBuffer();

            // Use satori to render text (works in serverless without fontconfig)
            console.log('Rendering text with satori...');
            const textSvg = await satori(
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '10px',
                            width: '600px',
                            height: `${svgHeight}px`,
                        },
                        children: wrappedLines.map((line) => ({
                            type: 'div',
                            props: {
                                style: {
                                    fontFamily: 'Autography',
                                    fontSize: '60px',
                                    color: '#333333',
                                    lineHeight: `${lineHeight}px`,
                                },
                                children: line
                            }
                        }))
                    }
                } as any,
                {
                    width: 600,
                    height: svgHeight,
                    fonts: [{
                        name: 'Autography',
                        data: fontData,
                        weight: 400,
                        style: 'normal',
                    }]
                }
            );

            console.log('Converting satori SVG to PNG...');
            const textBuffer = await sharp(Buffer.from(textSvg))
                .png()
                .toBuffer();

            console.log('Text buffer size:', textBuffer.length, 'bytes');

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