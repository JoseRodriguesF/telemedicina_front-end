const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@matriarca.com.br';
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123'; // Preferencialmente use env var
  
  try {
    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      console.log('Admin user already exists.');
      process.exit(0);
    }
    
    const senha_hash = await bcrypt.hash(password, 12);
    
    const admin = await prisma.usuario.create({
      data: {
        email,
        senha_hash,
        tipo_usuario: 'admin',
        registroFull: true
      }
    });
    
    console.log('Admin user created successfully:', admin.id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

main();
