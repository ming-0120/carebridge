# apps/db/management/commands/fetch_medical_news.py

from django.core.management.base import BaseCommand
from django.db import transaction
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime

# 앱 라벨이 carebridge_db 라고 가정 (Hospital 경고 로그 기준)
# 모델 이름이 다르면 바꿔서 사용
from apps.db.models import MedicalNewsletter  # medical_newsletter.py 안의 모델


BASE_URL = "https://www.medicaltimes.com"
LIST_URL = "https://www.medicaltimes.com/Main/News/List.html?MainCate=2"
HEADERS = {
    "User-Agent": "Mozilla/5.0",
}


def parse_published_at(text: str) -> datetime:
    """
    '2025-12-02 11:10:28' 같은 문자열을 datetime 으로 변환
    """
    return datetime.strptime(text, "%Y-%m-%d %H:%M:%S")


def fetch_body(detail_url: str) -> str:
    """
    상세 페이지에서 본문 텍스트만 추출
    ※ 이 부분은 실제 상세페이지 HTML 구조 보고 selector 바꿔야 함
    """
    resp = requests.get(detail_url, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # 실제 상세 페이지 들어가서 개발자도구로 감싸는 div 확인 후 변경
    # 예시는 아래 둘 중 하나일 가능성이 높음. 실제 구조 보고 맞는 걸로 선택.
    body_el = (
        soup.select_one("div.view_cont")
        or soup.select_one("div.newsView_cont_txt")
    )

    if not body_el:
        return ""

    return body_el.get_text(" ", strip=True)


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
            # 제목
            title_el = art.select_one("h4.headLine")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)

            # 날짜 + 카테고리
            date_span = art.select_one("span.newsList_cont_date")
            if not date_span or not date_span.contents:
                continue

            # <span>2025-12-02 11:10:28<span>중소병원</span></span>
            published_str = date_span.contents[0].strip()

            cate_span = date_span.find("span")
            category = cate_span.get_text(strip=True) if cate_span else ""

            # 요약 (본문 일부)
            summary_el = art.select_one("div.list_txt")
            summary = summary_el.get_text(" ", strip=True) if summary_el else ""

            # 상세 URL
            a_tag = art.find("a", href=True)
            if not a_tag:
                continue
            detail_url = urljoin(BASE_URL, a_tag["href"])

            # 이미 저장된 기사면 skip
            obj, created = MedicalNewsletter.objects.get_or_create(
                url=detail_url,
                defaults={
                    "title": title,
                    "published_at": parse_published_at(published_str),
                    "category": category,
                    "summary": summary,
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
