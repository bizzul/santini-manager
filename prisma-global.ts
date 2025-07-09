import { PrismaClient } from '@prisma/client'
/**
 * Prisma globalized instance 
 * This makes one single PrismaClient instance available to the whole project.
 * Avoids having warning about unclosed prisma instances and optimizes performance.
 * More infos:
 * https://vercel.com/guides/nextjs-prisma-postgres
 */
declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}
export const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma