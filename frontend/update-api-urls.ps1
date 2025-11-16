# Script to replace localhost:4000 with API_URL in all frontend files

$files = @(
    "src\page\account\UpgradePage.jsx",
    "src\page\admin\AdminPage.jsx",
    "src\page\admin\AdminUsers.jsx",
    "src\page\admin\AdminSupport.jsx",
    "src\page\admin\AdminRevenueStats.jsx",
    "src\page\admin\AdminUserQuizHistory.jsx",
    "src\page\quizz\QuizPage.jsx",
    "src\page\quizz\QuizComplete.jsx",
    "src\page\home\homepage.jsx",
    "src\page\quiz-history\QuizHistory.jsx",
    "src\page\payment\PaymentCheck.jsx",
    "src\page\payment\PaymentWaiting.jsx",
    "src\page\payment\PaymentSuccess.jsx",
    "src\page\payment\ZaloPayResult.jsx",
    "src\shared\UserBadge.jsx",
    "src\shared\SupportChat.jsx"
)

foreach ($file in $files) {
    $filePath = Join-Path "C:\Users\dau04\Downloads\Dự Án Thực Tập\tracnghiem-project\frontend" $file
    if (Test-Path $filePath) {
        Write-Host "Processing: $file"
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Check if API_URL import already exists
        if ($content -notmatch 'import.*API_URL.*from.*config/api') {
            # Add import after other imports
            $content = $content -replace '(import.*from.*[;"''])\s*\n(?!import)', "`$1`nimport { API_URL } from '../../config/api';`n"
        }
        
        # Replace all localhost:4000 with ${API_URL}
        $content = $content -replace '"http://localhost:4000', '`"${API_URL}'
        $content = $content -replace "'http://localhost:4000", '`"${API_URL}'
        $content = $content -replace '`http://localhost:4000', '`"${API_URL}'
        
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! All files updated." -ForegroundColor Cyan
