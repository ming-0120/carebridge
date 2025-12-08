# apps/db/models/__init__.py

from .users import Users
from .hospital import Hospital
from .department import Department
from .disease import DimDisease
__all__ = ["ErInfo","ErStatus","ErStatusStaging","ErMessage",] # 모델을 노출시키되, import는 하지 않음
from .doctor import Doctors
from .medical_record import MedicalRecord
from .slot_reservation import TimeSlots, Reservations
from .treatment import TreatmentProcedures
from .lab import LabData, LabOrders, LabUpload  
from .medicine import MedicineOrders, MedicineData
from .statistic import InfectiousStat
from .review import AiReview
from .favorite import UserFavorite
from .qna import Qna
from .daily_visit import DailyVisit
from .medical_newsletter import MedicalNewsletter
from .emergency import ErInfo
