import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const email = 'admin@versahome.com.my';
  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    console.log('✅ Super admin already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@VersaHome2026!', 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super admin created: ${user.email}`);
  console.log('⚠️  Please change the password immediately after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
