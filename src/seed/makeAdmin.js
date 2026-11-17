/**
 * Promote an existing account to admin:   npm run make-admin -- you@example.com
 * (Sign up through the website first, then run this once.)
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';

const email = process.argv[2]?.trim().toLowerCase();

async function main() {
  if (!email) {
    console.error('Usage: npm run make-admin -- you@example.com');
    process.exitCode = 1;
    return;
  }
  await connectDB();
  const user = await User.findOneAndUpdate({ email }, { role: 'admin', status: 'active', updatedAt: new Date() }, { new: true });
  if (!user) {
    console.error(`No account found for ${email}. Create it on the sign-up page first, then run this again.`);
    process.exitCode = 1;
    return;
  }
  console.log(`${user.name} <${user.email}> is now an admin.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
