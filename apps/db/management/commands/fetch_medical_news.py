# apps/db/management/commands/fetch_medical_news.py

from django.core.management.base import BaseCommand
from django.db import transaction
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime

# 모델에 image_url 필드가 추가되었다고 가정합니다.
from apps.db.models import MedicalNewsletter 


BASE_URL = "https://www.medicaltimes.com"
LIST_URL = "https://www.medicaltimes.com/Main/News/List.html"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def parse_published_at(text: str) -> datetime:
    """
    '2025-12-02 11:10:28' 같은 문자열을 datetime 으로 변환
    """
    try:
        return datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        # 날짜 형식이 다를 경우 현재 시간 혹은 예외 처리
        return datetime.now()


def fetch_body(detail_url: str) -> str:
    """
    상세 페이지에서 본문 텍스트만 추출
    """
    try:
        resp = requests.get(detail_url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # 실제 상세 페이지 구조에 따라 선택자 조정 필요
        body_el = (
            soup.select_one("div.view_cont")
            or soup.select_one("div.newsView_cont_txt")
            or soup.select_one("#newsContent") # 일반적인 ID 예시 추가
        )

        if not body_el:
            return ""

        return body_el.get_text(" ", strip=True)
    except Exception as e:
        print(f"본문 크롤링 실패 ({detail_url}): {e}")
        return ""


class Command(BaseCommand):
    help = "메디칼타임즈 뉴스(병원/개원가 등)를 크롤링해서 MedicalNewsletter 테이블에 저장"

    @transaction.atomic
    def handle(self, *args, **options):
        resp = requests.get(LIST_URL, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        dom = BeautifulSoup(resp.text, "html.parser")

        saved = 0
        skipped = 0

        for art in dom.select("article.newsList_cont"):
            # 1. 제목
            title_el = art.select_one("h4.headLine")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)

            # 2. 날짜 + 카테고리
            date_span = art.select_one("span.newsList_cont_date")
            if not date_span or not date_span.contents:
                continue
            
            published_str = date_span.contents[0].strip()
            
            cate_span = date_span.find("span")
            category = cate_span.get_text(strip=True) if cate_span else ""

            # 3. 요약 (본문 일부)
            summary_el = art.select_one("div.list_txt")
            summary = summary_el.get_text(" ", strip=True) if summary_el else ""

            # 4. 상세 URL
            a_tag = art.find("a", href=True)
            if not a_tag:
                continue
            detail_url = urljoin(BASE_URL, a_tag["href"])

            # ==========================================
            # [추가됨] 5. 기사 썸네일 이미지 URL 추출
            # ==========================================
            image_url = ""
            # article 태그 내부의 img 태그를 찾음
            img_tag = art.select_one("img")
            
            if img_tag:
                # src 속성 가져오기
                src = img_tag.get("src")
                if src:
                    # 상대 경로일 경우 절대 경로로 변환 (/Image/... -> https://.../Image/...)
                    image_url = urljoin(BASE_URL, src)

            # 6. 저장 로직 (get_or_create)
            # 이미 저장된 기사면 skip
            obj, created = MedicalNewsletter.objects.get_or_create(
                url=detail_url,
                defaults={
                    "title": title,
                    "published_at": parse_published_at(published_str),
                    "category": category,
                    "summary": summary,
                    "image_url": image_url,  # <--- 모델에 필드가 있어야 함
                },
            )

            if created:
                body = fetch_body(detail_url)
                obj.body = body
                obj.save()
                saved += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"새 기사 {saved}건 저장, 기존 {skipped}건 건너뜀"
            )
        )