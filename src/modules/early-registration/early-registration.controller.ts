import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { sendSuccess } from '@shared/utils/ApiResponse';
import prisma from '@shared/utils/prisma';

export const registerEarly = asyncHandler(async (req: Request, res: Response) => {
  const { parentName, email, phone, childAge, service = 'kids-learning' } = req.body;
  
  const existing = await prisma.earlyRegistration.findFirst({ 
    where: { email, service } 
  });
  
  if (existing) {
    return res.status(400).json({ success: false, message: 'This email is already registered for this service.' });
  }

  const registration = await prisma.earlyRegistration.create({
    data: { parentName, email, phone, childAge, service }
  });

  sendSuccess({
    res,
    statusCode: 201,
    message: 'Registered successfully',
    data: registration
  });
});
