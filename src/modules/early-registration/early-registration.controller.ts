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

export const getRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const service = req.query.service as string | undefined;

  const where = service ? { service } : {};

  const [registrations, total] = await Promise.all([
    prisma.earlyRegistration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.earlyRegistration.count({ where }),
  ]);

  sendSuccess({
    res,
    message: 'Registrations fetched successfully',
    data: registrations,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  });
});
