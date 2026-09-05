@echo off
echo Starting n8n with full permissions...
set NODE_FUNCTION_ALLOW_BUILTIN=*
set N8N_ENABLE_EXECUTE_COMMAND=true
set N8N_RESTRICT_FILE_ACCESS_TO=C:\Users\Maria\OneDrive\Projects\melo\sandbox;C:\Users\Maria\OneDrive\Projects\melo
set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
npx n8n
