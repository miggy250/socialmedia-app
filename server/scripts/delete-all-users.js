const { pool } = require('../config/database');
const readline = require('readline');

async function confirmDeletion() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will delete ALL users and their data. Type "DELETE ALL" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === 'DELETE ALL');
    });
  });
}

async function main() {
  console.log('🚨 Delete All Users Script');
  console.log('This will permanently delete:');
  console.log('  - All users');
  console.log('  - All profiles');
  console.log('  - All posts');
  console.log('  - All comments');
  console.log('  - All likes');
  console.log('  - All follows');
  console.log('  - All messages');
  console.log('  - All notifications');
  console.log('  - All hashtags and post_hashtags');
  console.log('');

  const conn = await pool.getConnection();
  try {
    // First, let's count how many users we have
    const [userCount] = await conn.execute('SELECT COUNT(*) as count FROM users');
    const totalUsers = userCount[0].count;

    console.log(`📊 Current database has ${totalUsers} users.`);
    console.log('');

    if (totalUsers === 0) {
      console.log('✅ Database is already empty. Nothing to delete.');
      process.exit(0);
    }

    // Confirm deletion
    const confirmed = await confirmDeletion();
    if (!confirmed) {
      console.log('❌ Deletion cancelled.');
      process.exit(0);
    }

    console.log('');
    console.log('🗑️  Starting deletion process...');
    
    await conn.beginTransaction();

    // Delete in proper order to avoid foreign key issues
    // Even though we have ON DELETE CASCADE, let's be explicit
    console.log('  - Deleting post_hashtags...');
    await conn.execute('DELETE FROM post_hashtags');
    
    console.log('  - Deleting hashtags...');
    await conn.execute('DELETE FROM hashtags');
    
    console.log('  - Deleting notifications...');
    await conn.execute('DELETE FROM notifications');
    
    console.log('  - Deleting messages...');
    await conn.execute('DELETE FROM messages');
    
    console.log('  - Deleting follows...');
    await conn.execute('DELETE FROM follows');
    
    console.log('  - Deleting likes...');
    await conn.execute('DELETE FROM likes');
    
    console.log('  - Deleting comments...');
    await conn.execute('DELETE FROM comments');
    
    console.log('  - Deleting posts...');
    await conn.execute('DELETE FROM posts');
    
    console.log('  - Deleting profiles...');
    await conn.execute('DELETE FROM profiles');
    
    console.log('  - Deleting users...');
    await conn.execute('DELETE FROM users');

    await conn.commit();
    
    console.log('');
    console.log('✅ Successfully deleted all users and their data!');
    console.log('🎉 Database is now clean and ready for real users.');
    process.exit(0);
  } catch (error) {
    await conn.rollback();
    console.error('');
    console.error('❌ Failed to delete users:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    conn.release();
  }
}

main();
