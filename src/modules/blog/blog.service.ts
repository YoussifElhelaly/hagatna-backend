import { Prisma } from '@prisma/client';
import { prisma } from '@database/prisma/client';
import { ApiError } from '@shared/utils/ApiError';
import { buildPaginationMeta } from '@shared/utils/ApiResponse';

const asJson = (v: unknown): Prisma.InputJsonValue => v as unknown as Prisma.InputJsonValue;

// List cards omit the (large) content body for performance.
const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  tags: true,
  authorName: true,
  publishedAt: true,
  createdAt: true,
} satisfies Prisma.BlogPostSelect;

interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'published';
}

interface BlogPostInput {
  slug?: string;
  title?: Record<string, string>;
  excerpt?: Record<string, string>;
  content?: Record<string, string>;
  coverImage?: string | null;
  metaTitle?: Record<string, string>;
  metaDescription?: Record<string, string>;
  tags?: string[];
  status?: 'draft' | 'published';
  authorName?: string;
  publishedAt?: string | null;
}

// ─── Public ───────────────────────────────────────────────────────────────────

export const listPublished = async (query: ListQuery) => {
  const { page = 1, limit = 9, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BlogPostWhereInput = {
    status: 'published',
    publishedAt: { lte: new Date() },
    ...(search && {
      OR: [
        { title: { path: ['en'], string_contains: search } },
        { title: { path: ['ar'], string_contains: search } },
      ],
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      select: listSelect,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return { posts, meta: buildPaginationMeta(total, page, limit) };
};

export const getPublishedBySlug = async (slug: string) => {
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: 'published', publishedAt: { lte: new Date() } },
  });
  if (!post) throw ApiError.notFound('Blog post not found');

  // Best-effort view count; never block the read.
  prisma.blogPost
    .update({ where: { id: post.id }, data: { viewsCount: { increment: 1 } } })
    .catch(() => {});

  return post;
};

/** Lightweight feed for the storefront sitemap. */
export const getSitemapEntries = async () => {
  return prisma.blogPost.findMany({
    where: { status: 'published', publishedAt: { lte: new Date() } },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: 'desc' },
  });
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listAll = async (query: ListQuery) => {
  const { page = 1, limit = 20, search, status } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.BlogPostWhereInput = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { title: { path: ['en'], string_contains: search } },
        { title: { path: ['ar'], string_contains: search } },
        { slug: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.blogPost.count({ where }),
  ]);

  return { posts, meta: buildPaginationMeta(total, page, limit) };
};

export const getById = async (id: string) => {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw ApiError.notFound('Blog post not found');
  return post;
};

// Publishing stamps publishedAt (once) unless the caller supplied one.
const resolvePublishedAt = (
  status: string | undefined,
  supplied: string | null | undefined,
  current: Date | null,
): Date | null => {
  if (supplied !== undefined && supplied !== null) return new Date(supplied);
  if (status === 'published') return current ?? new Date();
  if (status === 'draft') return supplied === null ? null : current;
  return current;
};

export const create = async (data: BlogPostInput) => {
  const existing = await prisma.blogPost.findUnique({ where: { slug: data.slug! } });
  if (existing) throw ApiError.conflict('A post with this slug already exists');

  return prisma.blogPost.create({
    data: {
      slug: data.slug!,
      title: asJson(data.title ?? { en: '', ar: '' }),
      excerpt: asJson(data.excerpt ?? { en: '', ar: '' }),
      content: asJson(data.content ?? { en: '', ar: '' }),
      coverImage: data.coverImage ?? null,
      metaTitle: data.metaTitle ? asJson(data.metaTitle) : Prisma.JsonNull,
      metaDescription: data.metaDescription ? asJson(data.metaDescription) : Prisma.JsonNull,
      tags: asJson(data.tags ?? []),
      status: data.status ?? 'draft',
      authorName: data.authorName ?? null,
      publishedAt: resolvePublishedAt(data.status, data.publishedAt, null),
    },
  });
};

export const update = async (id: string, data: BlogPostInput) => {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw ApiError.notFound('Blog post not found');

  if (data.slug && data.slug !== post.slug) {
    const clash = await prisma.blogPost.findFirst({ where: { slug: data.slug, id: { not: id } } });
    if (clash) throw ApiError.conflict('A post with this slug already exists');
  }

  return prisma.blogPost.update({
    where: { id },
    data: {
      ...(data.slug && { slug: data.slug }),
      ...(data.title && { title: asJson(data.title) }),
      ...(data.excerpt && { excerpt: asJson(data.excerpt) }),
      ...(data.content && { content: asJson(data.content) }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.metaTitle && { metaTitle: asJson(data.metaTitle) }),
      ...(data.metaDescription && { metaDescription: asJson(data.metaDescription) }),
      ...(data.tags && { tags: asJson(data.tags) }),
      ...(data.status && { status: data.status }),
      ...(data.authorName !== undefined && { authorName: data.authorName }),
      publishedAt: resolvePublishedAt(data.status, data.publishedAt, post.publishedAt),
    },
  });
};

export const remove = async (id: string) => {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) throw ApiError.notFound('Blog post not found');
  await prisma.blogPost.delete({ where: { id } });
};
