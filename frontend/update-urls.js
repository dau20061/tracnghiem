import fs from 'fs';
import path from 'path';

const API_URL_IMPORT_MAP = {
  'src/page': "import { API_URL } from '../../config/api';",
  'src/shared': "import { API_URL } from '../config/api';"
};

const files = [
  'src/page/admin/AdminPage.jsx',
  'src/page/admin/AdminUsers.jsx',
  'src/page/admin/AdminSupport.jsx',
  'src/page/admin/AdminRevenueStats.jsx',
  'src/page/admin/AdminUserQuizHistory.jsx',
  'src/page/quizz/QuizPage.jsx',
  'src/page/quizz/QuizComplete.jsx',
  'src/page/home/homepage.jsx',
  'src/page/quiz-history/QuizHistory.jsx',
  'src/page/payment/PaymentCheck.jsx',
  'src/page/payment/PaymentWaiting.jsx',
  'src/page/payment/PaymentSuccess.jsx',
  'src/page/payment/ZaloPayResult.jsx',
  'src/shared/SupportChat.jsx'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Determine correct import path
  const importStatement = file.startsWith('src/shared') 
    ? API_URL_IMPORT_MAP['src/shared']
    : API_URL_IMPORT_MAP['src/page'];
  
  // Check if API_URL import already exists
  if (!content.includes('API_URL')) {
    // Find the last import statement
    const lastImportMatch = content.match(/import[^;]+;[\r\n]+(?!import)/);
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, insertPos) + importStatement + '\n' + content.slice(insertPos);
    }
  }
  
  // Replace all localhost:4000 instances
  content = content.replace(/["'`]http:\/\/localhost:4000/g, '`${API_URL}');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated: ${file}`);
});

console.log('\n✨ All files updated!');
