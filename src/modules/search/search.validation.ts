import { z } from 'zod';

export const TrackSearchSchema = z.object({
  term: z.string().trim().min(1, 'Search term is required').max(100),
});
