# apps/db/management/commands/update_hospital_ratings.py

import requests
import time
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.db.models.hospital import Hospital

TEXT_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"


class Command(BaseCommand):
    help = "Google Places API를 이용하여 병원 평점 업데이트 (place_id 저장 없이)"

    def handle(self, *args, **options):
        api_key = settings.GOOGLE_API_KEY

        hospitals = Hospital.objects.all()

        for hos in hospitals:
            self.stdout.write(f"▶ {hos.hos_id} / {hos.name} 조회 중...")

            # 1) Text Search
            params = {
                "query": f"{hos.name} {hos.address}",
                "key": api_key,
            }
            if hos.lat and hos.lng:
                params["location"] = f"{hos.lat},{hos.lng}"
                params["radius"] = 3000

            r = requests.get(TEXT_URL, params=params).json()

            if r.get("status") != "OK":
                self.stdout.write("  → 검색 실패, 건너뜀")
                continue

            place = r["results"][0]
            place_id = place["place_id"]

            # 2) Details API로 rating 가져오기
            d = requests.get(DETAILS_URL, params={
                "place_id": place_id,
                "fields": "rating",
                "key": api_key,
            }).json()

            rating = d.get("result", {}).get("rating")

            if not rating:
                self.stdout.write("  → rating 없음, 건너뜀")
                continue

            hos.rating = int(round(float(rating)))
            hos.save(update_fields=["rating"])

            self.stdout.write(self.style.SUCCESS(f"  → rating={hos.rating} 저장 완료"))

            time.sleep(0.15)  # 쿼터 보호
