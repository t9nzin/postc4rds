import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { message, recipientEmail } = body;

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

        // Get the image (base64 or URL)
        const imageData = postcard.generatedImageUrl || postcard.originalPhotoUrl;

        // Convert base64 to buffer for attachment
        let imageBuffer: Buffer;
        let imageMimeType = 'image/jpeg';

        if (imageData.startsWith('data:')) {
            // It's a base64 data URL
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                imageMimeType = matches[1];
                imageBuffer = Buffer.from(matches[2], 'base64');
            } else {
                return NextResponse.json(
                    { error: "Invalid image format" },
                    { status: 400 }
                );
            }
        } else {
            // If it's a URL, we'd need to fetch it, but for now assume base64
            return NextResponse.json(
                { error: "URL images not yet supported" },
                { status: 400 }
            );
        }

        // Send email using Resend with attachment
        const emailData = await resend.emails.send({
            from: "From The Heart <onboarding@resend.dev>",
            to: recipientEmail,
            subject: "You've received a postcard! 💌",
            html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body{font-family:Georgia,serif;background:#f9f9f9;margin:0;padding:20px}
.container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden}
.header{background:#000;color:#fff;padding:30px;text-align:center}
.header h1{margin:0;font-size:28px;font-style:italic}
.postcard-image{width:100%;display:block}
.message{padding:30px;font-size:16px;line-height:1.6;color:#333;white-space:pre-wrap}
.footer{padding:20px;text-align:center;font-size:14px;color:#666;border-top:1px solid #eee}
</style>
</head>
<body>
<div class="container">
<div class="header"><h1>You've received a postcard</h1></div>
<img src="cid:postcard-image" alt="Your postcard" class="postcard-image">
${message ? `<div class="message">${message}</div>` : ''}
<div class="footer"><p>Sent with ❤️ from <strong>From The Heart</strong></p></div>
</div>
</body>
</html>
            `,
            attachments: [
                {
                    filename: 'postcard.jpg',
                    content: imageBuffer,
                    contentId: 'postcard-image',
                },
            ],
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
