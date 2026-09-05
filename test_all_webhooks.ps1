$url = "http://localhost:5678/webhook-test/19818de0-d19a-45e9-b2a7-d7acf9c24e03"

$payloads = @{
    "1" = '{"task_id":"t1","action_id":"a1","action":"read_pdf","parameters":{"file_url":"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"}}'
    "2" = '{"task_id":"t2","action_id":"a2","action":"http_request","parameters":{"url":"https://jsonplaceholder.typicode.com/todos/1"}}'
    "3" = '{"task_id":"t3","action_id":"a3","action":"file_read","parameters":{"filename":"test.txt"}}'
    "4" = '{"task_id":"t4","action_id":"a4","action":"file_write","parameters":{"filename":"test.txt","content":"Hello!"}}'
    "5" = '{"task_id":"t5","action_id":"a5","action":"web_search","parameters":{"query":"n8n automation"}}'
    "6" = '{"task_id":"t6","action_id":"a6","action":"code_execute","parameters":{"script":"console.log(\"Hello Node!\")"}}'
    "7" = '{"task_id":"t7","action_id":"a7","action":"github","parameters":{"owner":"n8n-io","repo":"n8n"}}'
    "8" = '{"task_id":"t8","action_id":"a8","action":"document_generate","parameters":{"title":"doc","content":"done"}}'
    "9" = '{"task_id":"t9","action_id":"a9","action":"data_analyze","parameters":{"filename":"data.csv"}}'
}

$names = @{
    "1" = "read_pdf"
    "2" = "http_request"
    "3" = "file_read"
    "4" = "file_write"
    "5" = "web_search"
    "6" = "code_execute"
    "7" = "github"
    "8" = "document_generate"
    "9" = "data_analyze"
}

while ($true) {
    Write-Host "`n=========================================" -ForegroundColor Yellow
    Write-Host "n8n INTERACTIVE TESTER" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    for ($i=1; $i -le 9; $i++) {
        Write-Host " [$i] $($names[$i.ToString()])"
    }
    Write-Host " [Q] Quit"
    Write-Host "=========================================" -ForegroundColor Yellow
    
    $choice = Read-Host "Select an action (1-9, Q)"
    
    if ($choice -eq 'Q' -or $choice -eq 'q') {
        Write-Host "Exiting..." -ForegroundColor Cyan
        break
    }
    
    if ($payloads.ContainsKey($choice)) {
        Write-Host "`n-----------------------------------------"
        Write-Host "You selected: $($names[$choice])" -ForegroundColor Cyan
        Write-Host "1. Go to your n8n canvas" -ForegroundColor White
        Write-Host "2. Click 'Execute workflow'" -ForegroundColor White
        Write-Host "3. Come back here and press Enter" -ForegroundColor White
        Read-Host "Press Enter when ready..."
        
        Write-Host "Sending request..." -NoNewline
        try {
            $result = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Body $payloads[$choice]
            Write-Host " SUCCESS" -ForegroundColor Green
        } catch {
            Write-Host " FAILED ($($_.Exception.Message))" -ForegroundColor Red
        }
    } else {
        Write-Host "Invalid choice, please select 1-9 or Q." -ForegroundColor Red
    }
}
