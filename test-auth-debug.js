import crypto from 'crypto';

const API = 'https://cubed-mr.app/api';

const facility = {
  name: 'Facility 5',
  email: 'facility5@wounddatacenter.com',
  password: '12345678'
};

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function test() {
  console.log('🔐 Test autenticación - Debug\n');
  console.log('Facility:', facility.name);
  console.log('Email:', facility.email);
  console.log('Password:', facility.password);
  
  const hashedPassword = hashPassword(facility.password);
  console.log('Hash:', hashedPassword);
  
  const formData = new URLSearchParams();
  formData.append('entity', 'TryLogin');
  formData.append('email', facility.email);
  formData.append('password', hashedPassword);
  formData.append('deviceId', 'test-device-001');
  formData.append('name', facility.email);
  
  console.log('\n📤 Enviando a:', API + '/get');
  console.log('Payload:', formData.toString().substring(0, 100) + '...');
  
  try {
    const response = await fetch(API + '/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    console.log('\n📥 Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log('\n📊 Response (completo):\n');
    console.log(text);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
