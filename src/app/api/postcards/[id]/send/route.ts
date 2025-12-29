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

        // Get the Cloudinary image URL
        const imageUrl = postcard.generatedImageUrl || postcard.originalPhotoUrl;
        const displaySenderName = senderName || "a friend";

        console.log('🖼️ Image URL for email:', imageUrl);
        console.log('📧 Sending to:', recipientEmail);

        // Build HTML email
        const emailHtml = `<!DOCTYPE html>
            <html>
            <head>
            <meta charset="utf-8">
            </head>
            <body style="font-family:Georgia,serif;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);margin:0;padding:40px 20px;min-height:100vh">
            <div style="max-width:700px;margin:0 auto;background:rgba(255, 255, 255, 0.1);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:20px;border-radius:20px;box-shadow:0 8px 32px 0 rgba(31, 38, 135, 0.37);border:1px solid rgba(255, 255, 255, 0.18)">
            <div style="background:rgba(255, 255, 255, 0.95);border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1)">
            <div style="background:linear-gradient(135deg, rgba(239, 212, 183, 0.9), rgba(201, 177, 138, 0.9));backdrop-filter:blur(5px);color:#5a4a3a;padding:16px 20px;text-align:center;font-size:14px;font-style:italic;border-bottom:1px solid rgba(201, 177, 138, 0.3)">Sent with love from ${displaySenderName}</div>
            <img src="${imageUrl}" alt="Your postcard" style="width:100%;display:block;border-bottom:1px solid rgba(201, 177, 138, 0.3)">
            ${message ? `<div style="padding:24px;font-size:15px;line-height:1.7;color:#333;white-space:pre-wrap;font-family:Georgia,serif;font-style:italic;background:rgba(255,255,255,0.5)">${message}</div>` : ''}
            <div style="padding:16px;text-align:center;font-size:13px;color:#8b7355;background:rgba(250, 248, 245, 0.8);backdrop-filter:blur(5px)">From The Heart ❤️</div>
            </div>
            </div>
            </body>
            </html>`;

        // Log a snippet of the HTML to verify img tag
        console.log('📄 HTML snippet:', emailHtml.substring(emailHtml.indexOf('<img'), emailHtml.indexOf('<img') + 150));

        // Send email using Resend with Cloudinary URL
        const emailData = await resend.emails.send({
            from: "From The Heart <onboarding@resend.dev>",
            to: recipientEmail,
            subject: "You've received a postcard! 💌",
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
