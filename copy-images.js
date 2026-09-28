import fs from 'fs';
import path from 'path';

const srcDir = 'C:/Users/maste/.gemini/antigravity-ide/brain/ba3e6742-70c4-4fc1-9b4c-6e356c52f2c9/.user_uploaded';
const destDir = 'f:/cod/mockup jersey/public/images';

fs.mkdirSync(destDir, { recursive: true });

const files = [
  { src: 'media_1790233345155.jpg', dest: 'mockup_1.jpg' },
  { src: 'media_1790233345171.jpg', dest: 'mockup_2.jpg' },
  { src: 'media_1790233345258.jpg', dest: 'mockup_3.jpg' }
];

for (const file of files) {
  const srcPath = path.join(srcDir, file.src);
  const destPath = path.join(destDir, file.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file.src} to ${file.dest}`);
  } else {
    console.log(`Source file not found: ${srcPath}`);
  }
}
