import { z } from 'zod';

export const UpdateSiteSettingsSchema = z.object({
  sellWithUsEnabled: z.boolean(),
});
