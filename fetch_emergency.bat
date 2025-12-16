@echo off
cd /d "D:\KDT2508\carebridge"
"D:\KDT2508\.venv\Scripts\python.exe" manage.py fetch_emergency >> "D:\KDT2508\carebridge\logs\fetch_emergency.log" 2>&1