import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const username = 'admin';
  const email = 'admin@versahome.com.my';

  // Match on either identifier: username is the required unique key, and email
  // is optional, so an existing admin may have had its email cleared.
  const exists = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (exists) {
    console.log('✅ Super admin already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('Admin@VersaHome2026!', 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super admin created: ${user.username} (${user.email})`);
  console.log('   Log in with either the username or the email.');
  console.log('⚠️  Please change the password immediately after first login!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
