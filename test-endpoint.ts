import request from 'supertest';
import app from './src/app';

async function test() {
  const res = await request(app).get('/api/v1/reviews/recent?limit=6');
  console.log('STATUS:', res.status);
  console.log('BODY:', JSON.stringify(res.body, null, 2));
}
test().catch(console.error).finally(() => process.exit(0));
