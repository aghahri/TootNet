import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FEATURED_LIMIT = 10;
const ANNOUNCEMENTS_LIMIT = 20;

@Injectable()
export class ShowcaseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Curated home (Vitrin) data. Lightweight; no heavy nesting.
   * Extensible: add ranking/recommendation logic later (e.g. by neighborhood, promoted).
   */
  async getShowcase() {
    const [
      announcements,
      news,
      notices,
      featuredNetworks,
      featuredGroups,
      featuredChannels,
      businesses,
      highlights,
    ] = await Promise.all([
      this.getAnnouncements(),
      this.getNews(),
      this.getNotices(),
      this.getFeaturedNetworks(),
      this.getFeaturedGroups(),
      this.getFeaturedChannels(),
      this.getBusinesses(),
      this.getHighlights(),
    ]);

    return {
      announcements,
      news,
      notices,
      featuredNetworks,
      featuredGroups,
      featuredChannels,
      businesses,
      highlights,
    };
  }

  /** Published announcements (GLOBAL scope for showcase). Unicode-safe. */
  private async getAnnouncements() {
    return this.prisma.announcement.findMany({
      where: { isPublished: true, scopeType: 'GLOBAL' },
      orderBy: { publishedAt: 'desc' },
      take: ANNOUNCEMENTS_LIMIT,
      select: {
        id: true,
        title: true,
        body: true,
        scopeType: true,
        publishedAt: true,
      },
    });
  }

  /** Public endpoint for announcements list (e.g. dedicated page). */
  async getAnnouncementsList(limit = ANNOUNCEMENTS_LIMIT) {
    return this.prisma.announcement.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        title: true,
        body: true,
        scopeType: true,
        networkId: true,
        publishedAt: true,
      },
    });
  }

  /** Placeholder for latest news. Can later source from channel messages or dedicated table. */
  private async getNews() {
    return [];
  }

  /** Placeholder for latest notices. Unicode-safe. */
  private async getNotices() {
    return [];
  }

  /** Only PUBLIC networks. Prefer featured, then latest. */
  private async getFeaturedNetworks() {
    return this.prisma.network.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: FEATURED_LIMIT,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        visibility: true,
        isFeatured: true,
        createdAt: true,
      },
    });
  }

  /** Prefer featured, then latest. */
  private async getFeaturedGroups() {
    return this.prisma.group.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: FEATURED_LIMIT,
      select: {
        id: true,
        name: true,
        description: true,
        networkId: true,
        isFeatured: true,
        createdAt: true,
      },
    });
  }

  /** Prefer featured, then latest. */
  private async getFeaturedChannels() {
    return this.prisma.channel.findMany({
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: FEATURED_LIMIT,
      select: {
        id: true,
        name: true,
        description: true,
        networkId: true,
        isFeatured: true,
        createdAt: true,
      },
    });
  }

  /** Placeholder for SarPishey / local businesses. Unicode-safe. */
  private async getBusinesses() {
    return [];
  }

  /** Placeholder for highlighted posts. */
  private async getHighlights() {
    return [];
  }
}
