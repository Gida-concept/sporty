import prisma from '@/lib/prisma.js';

class SiteSettingsService {
  async getAllSettings(): Promise<Record<string, string>> {
    const settings = await prisma.siteSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value || '';
    }
    return result;
  }

  async updateSettings(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }
}

export default SiteSettingsService;
