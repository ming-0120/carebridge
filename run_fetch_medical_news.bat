@echo off
REM === 프로젝트 폴더로 이동 ===
cd /d D:\carebridge

REM === 가상환경 파이썬으로 명령 실행 (경로는 환경에 맞게 수정) ===
D:\carebridge\.venv\Scripts\python.exe manage.py fetch_medical_news >> D:\carebridge\logs\fetch_medical_news.log 2>&1
