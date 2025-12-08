import time
import json
from pathlib import Path

import pandas as pd
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# ==============================
# 기본 설정값
# ==============================
INPUT_CSV = "review_plan.csv"         # hpid, er_name, review_count 들어있는 파일
OUTPUT_JSON = "google_reviews_raw.json"

MIN_REVIEWS = 20                      # 이 값 이상인 병원만 크롤링
MAX_REVIEWS_PER_HOSPITAL = 50        # 병원당 최대 몇 개까지 가져올지 (적당히 조절)
SCROLL_ROUNDS = 10                   # 리뷰 패널 스크롤 반복 횟수

GOOGLE_MAPS_URL = "https://www.google.com/maps"


# ==============================
# 드라이버 셋업
# ==============================
def create_driver(headless=False):
    options = uc.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = uc.Chrome(options=options)
    driver.set_window_size(1280, 900)
    return driver


# ==============================
# Google Maps 검색 & 리뷰 탭 진입
# ==============================
def open_place_reviews(driver, hospital_name):
    driver.get(GOOGLE_MAPS_URL)

    wait = WebDriverWait(driver, 15)

    # 1) 검색창 찾기
    search_box = wait.until(
        EC.presence_of_element_located(
            (By.ID, "searchboxinput")
        )
    )

    # 2) 검색어 입력 (병원명 + " 응급실" 정도)
    query = f"{hospital_name} 응급실"
    search_box.clear()
    search_box.send_keys(query)
    search_box.send_keys(Keys.ENTER)

    # 3) 검색 결과 로딩 대기
    time.sleep(5)

    # 4) 첫 번째 검색 결과 클릭 (a.hfpxzc - 2025년 기준 예시 셀렉터)
    try:
        first_result = driver.find_element(By.CSS_SELECTOR, "a.hfpxzc")
        first_result.click()
    except NoSuchElementException:
        print(f"[WARN] 검색 결과 없음: {hospital_name}")
        return False

    # 병원 상세 패널 로딩 대기
    time.sleep(5)

    # 5) '리뷰' 탭 버튼 클릭 (aria-label 안에 '리뷰' 또는 'Reviews' 포함)
    try:
        review_btn = None
        buttons = driver.find_elements(By.XPATH, "//button[contains(@aria-label, '리뷰') or contains(@aria-label, 'Reviews')]")
        if buttons:
            review_btn = buttons[0]

        if not review_btn:
            print(f"[WARN] 리뷰 탭 버튼 찾지 못함: {hospital_name}")
            return False

        review_btn.click()
    except Exception as e:
        print(f"[WARN] 리뷰 탭 진입 실패 ({hospital_name}): {e}")
        return False

    time.sleep(5)
    return True


# ==============================
# 리뷰 패널 스크롤
# ==============================
def scroll_reviews_panel(driver, rounds=SCROLL_ROUNDS):
    """
    Google Maps의 리뷰 영역은 보통
    div.m6QErb[aria-label*="리뷰"] 같은 스크롤 가능한 엘리먼트 안에 있음.
    실제로는 개발자 도구로 class/aria-label을 한 번 확인해서 수정 필요할 수 있음.
    """
    time.sleep(3)
    try:
        scrollable = driver.find_element(
            By.CSS_SELECTOR,
            'div.m6QErb[aria-label*="리뷰"], div.m6QErb[aria-label*="Reviews"]'
        )
    except NoSuchElementException:
        # 못 찾으면 페이지 전체를 스크롤 (정확도는 떨어짐)
        scrollable = driver.find_element(By.TAG_NAME, "body")

    last_height = 0
    for _ in range(rounds):
        driver.execute_script("arguments[0].scrollBy(0, 1000);", scrollable)
        time.sleep(2)

        # 필요시 높이 변화 체크 (선택 사항)
        new_height = driver.execute_script("return arguments[0].scrollTop;", scrollable)
        if new_height == last_height:
            break
        last_height = new_height


# ==============================
# 리뷰 데이터 추출
# ==============================
def extract_reviews(driver, max_reviews=MAX_REVIEWS_PER_HOSPITAL):
    """
    2025-01 기준 예제에 따르면: :contentReference[oaicite:4]{index=4}
      - 리뷰 카드: div.jftiEf
      - 작성자: .d4r55
      - 본문: .wiI7pd
      - 별점 영역: .hCCjke 내부 .NhBTye 개수
      - 날짜: .rsqaWe
    """
    reviews = []

    review_cards = driver.find_elements(By.CSS_SELECTOR, "div.jftiEf")
    for card in review_cards:
        try:
            # 작성자 이름
            name_elems = card.find_elements(By.CSS_SELECTOR, ".d4r55")
            reviewer_name = name_elems[0].text.strip() if name_elems else ""

            # 리뷰 텍스트
            text_elems = card.find_elements(By.CSS_SELECTOR, ".wiI7pd")
            review_text = text_elems[0].text.strip() if text_elems else ""

            # 별점 (★ 아이콘 개수)
            rating = 0
            rating_wraps = card.find_elements(By.CSS_SELECTOR, ".hCCjke")
            if rating_wraps:
                stars = rating_wraps[0].find_elements(By.CSS_SELECTOR, ".NhBTye")
                rating = len(stars)

            # 날짜
            date_elems = card.find_elements(By.CSS_SELECTOR, ".rsqaWe")
            review_date = date_elems[0].text.strip() if date_elems else ""

            if review_text:  # 최소한 텍스트 있는 것만 저장
                reviews.append(
                    {
                        "reviewer_name": reviewer_name,
                        "review_text": review_text,
                        "rating": rating,
                        "review_date": review_date,
                    }
                )

            if len(reviews) >= max_reviews:
                break

        except Exception:
            # 개별 카드 파싱 실패는 무시하고 계속
            continue

    return reviews


# ==============================
# 메인: CSV 읽고 병원별 리뷰 수집
# ==============================
def crawl_reviews_for_hospitals():
    df = pd.read_csv(INPUT_CSV)

    # review_count 기준 필터링
    df_target = df[df["review_count"] >= MIN_REVIEWS].copy()
    print(f"크롤 대상 병원 수: {len(df_target)}")

    driver = create_driver(headless=False)

    all_results = []

    try:
        for idx, row in df_target.iterrows():
            hpid = row["hpid"]
            name = row["er_name"]

            print(f"\n=== [{hpid}] {name} ===")

            ok = open_place_reviews(driver, name)
            if not ok:
                print(f"[SKIP] {name} (리뷰 탭 진입 실패)")
                continue

            scroll_reviews_panel(driver, rounds=SCROLL_ROUNDS)

            reviews = extract_reviews(driver, max_reviews=MAX_REVIEWS_PER_HOSPITAL)
            print(f" -> 수집된 리뷰 수: {len(reviews)}")

            all_results.append(
                {
                    "hpid": hpid,
                    "er_name": name,
                    "reviews": reviews,
                }
            )

            # 너무 빠른 연속 요청 방지 (bot 탐지 완화)
            time.sleep(5)

    finally:
        driver.quit()

    # JSON으로 저장
    output_path = Path(OUTPUT_JSON)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    print(f"\n완료. 결과 저장: {output_path.resolve()}")


if __name__ == "__main__":
    crawl_reviews_for_hospitals()
