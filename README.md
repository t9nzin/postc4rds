# postc4rds

An AI postcard generator that transforms your travel photos into vintage 1940s-style postcards and sends them to your loved ones via email.

## Description

Upload a photo and let AI create a unique vintage travel postcard inspired by its location and theme. Add a personal message in handwritten font, and send it to anyone via email. The final postcard includes the AI-generated vintage artwork, your original photo, and custom message composed into a beautiful keepsake. 

I built this because one of my 2026 resolutions is to travel more, and I want to share my adventures with my friends + family in a fun, interesting way. 

## Built With

- Next.js 16
- Vertex AI (Gemini Vision, Imagen 3 Fast)
- Cloudinary
- Sharp
- Prisma + PostgreSQL
- Resend

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
DATABASE_URL="postgresql://..."
CLOUDINARY_URL="cloudinary://..."
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account",...}'
GOOGLE_CLOUD_PROJECT="your-project-id"
RESEND_API_KEY="re_..."
```

3. Add `Autography.otf` font to `public/fonts/`

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start development server:
```bash
npm run dev
```

## License

MIT <3
