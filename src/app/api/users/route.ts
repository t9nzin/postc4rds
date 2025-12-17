import { NextResponse } from 'next/server'; // server utility for constructing http responses
import { prisma } from '@/lib/prisma'; // db client, lets you query db, insert records, update data

// GET all users
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching users' },
      { status: 500 }
    );
  }
}

// POST create user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating user' },
      { status: 500 }
    );
  }
}