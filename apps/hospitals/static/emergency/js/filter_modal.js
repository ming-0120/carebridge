// ===============================
// 필터 모달 열기 / 닫기
// ===============================
function openFilterModal() {
  const modal = qs('#filter-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeFilterModal() {
  const modal = qs('#filter-modal');
  if (modal) modal.classList.add('hidden');
}

// ===============================
// 필터 reset + UI 초기화
// ===============================
function resetFilter() {
  qsa('#emergency-type-group .chip, .chip[data-equip]')
    .forEach(el => el.classList.remove('active'));

  const params = new URLSearchParams(window.location.search);
  ['etype', 'has_ct', 'has_mri', 'has_angio'].forEach(k => params.delete(k));

  window.location.search = params.toString();
}

// ===============================
// 필터 적용
// ===============================
function applyFilter() {
  const params = new URLSearchParams(window.location.search);

  ['etype', 'has_ct', 'has_mri', 'has_angio']
    .forEach(k => params.delete(k));

  const activeTypeBtn = qs('#emergency-type-group .chip.active');
  if (activeTypeBtn) params.set('etype', activeTypeBtn.dataset.type);

  qsa('.chip[data-equip].active').forEach(chip => {
    const equip = chip.dataset.equip;
    if (equip === 'ct') params.set('has_ct', '1');
    if (equip === 'mri') params.set('has_mri', '1');
    if (equip === 'angio') params.set('has_angio', '1');
  });

  closeFilterModal();
  window.location.search = params.toString();
}

// ===============================
// 응급 유형 → 장비 자동 매핑
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  const map = {
    stroke: ['ct', 'mri', 'angio', 'icu'],
    traffic: ['surgery', 'icu'],
    cardio: ['surgery', 'ventilator'],
    obstetrics: ['delivery', 'surgery']
  };

  const typeBtns = qsa('#emergency-type-group .chip[data-type]');
  const equipChips = qsa('.chip[data-equip]');
  const clearEquip = () => equipChips.forEach(c => c.classList.remove('active'));

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      clearEquip();

      (map[btn.dataset.type] || []).forEach(eq => {
        const target = qs(`.chip[data-equip="${eq}"]`);
        if (target) target.classList.add('active');
      });
    });
  });

  equipChips.forEach(c => c.addEventListener('click', () => c.classList.toggle('active')));
});
