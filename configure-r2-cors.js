/**
 * Script pour configurer CORS sur le bucket R2
 * Usage: node configure-r2-cors.js
 */
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Charger les variables depuis .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration R2
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://2dc708dd22889ad3d4a69dc8b22529c9.r2.cloudflarestorage.com';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || 'cf46e4ac89b40447f068513eac99b97c';
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY || '03114d0e6c727612caf31d895c16c98d27a723abbc37d63a5d2fbee031cd6efc';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'photolesgarennesgalerie';

// Créer le client S3 pour R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY
  }
});

// Configuration CORS
const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: [
        'https://galerie.photoslesgarennes.com',
        'http://localhost:3000',
        'http://localhost:8080'
      ],
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600
    }
  ]
};

async function configureCORS() {
  try {
    console.log('🔧 Configuration CORS pour le bucket R2...');
    console.log(`📦 Bucket: ${R2_BUCKET}`);
    console.log(`🌐 Endpoint: ${R2_ENDPOINT}`);
    console.log(`✅ Origines autorisées: ${corsConfig.CORSRules[0].AllowedOrigins.join(', ')}`);
    
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET,
      CORSConfiguration: corsConfig
    });
    
    await s3Client.send(command);
    
    console.log('✅ Configuration CORS appliquée avec succès !');
    console.log('\n📝 Note: Les changements peuvent prendre quelques minutes à se propager.');
  } catch (error) {
    console.error('❌ Erreur lors de la configuration CORS:', error);
    if (error.name === 'NoSuchBucket') {
      console.error('💡 Le bucket n\'existe pas. Vérifiez le nom du bucket.');
    } else if (error.name === 'AccessDenied') {
      console.error('💡 Accès refusé. Vérifiez les credentials R2.');
    }
    process.exit(1);
  }
}

configureCORS();
