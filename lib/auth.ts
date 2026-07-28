import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-change-in-production';

export interface JwtPayload {
  userId: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

// Utility to get the user from an incoming Next.js API request
export function getUserFromRequest(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
