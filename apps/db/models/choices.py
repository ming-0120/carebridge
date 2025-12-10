GENDER_CHOICES = (
    ('M', 'Male'),
    ('W', 'Woman'),
)

# users.mail_confirm
MAIL_CONFIRM_CHOICES = (
    ('Y', 'Yes'),
    ('N', 'No'),
)

# users.provider
PROVIDER_CHOICES = (
    ('kakao', 'Kakao'),
    ('naver', 'Naver'),
    ('local', 'Local'),
)

# users.role
ROLE_CHOICES = (
    ('ADMIN', 'Admin'),
    ('NURSE', 'Nurse'),
    ('DOCTOR', 'Doctor'),
    ('PATIENT', 'Patient'),
    ('USER', 'User'),  # 하위 호환성을 위해 유지
)

# users.withdrawal
WITHDRAWAL_CHOICES = (
    ('0', 'Active'),
    ('1', 'Withdrawn'),
)

# medical_record.ptnt_div_cd
PTNT_DIV_CHOICES = (
    ('I', 'Inpatient'),
    ('O', 'Outpatient'),
    ('E', 'Emergency'),
)

# time_slots.status
SLOT_STATUS_CHOICES = (
    ('OPEN', 'Open'),
    ('CLOSED', 'Closed'),
)

# treatment_procedures.status
TREATMENT_STATUS_CHOICES = (
    ('PENDING', 'Pending'),
    ('IN_PROGRESS', 'In progress'),
    ('COMPLETED', 'Completed'),
)

# lab_orders.status
LAB_STATUS_CHOICES = (
    ('PENDING', 'Pending'),
    ('SAMPLED', 'Sampled'),
    ('COMPLETED', 'Completed'),
)

# infectious_stat.dim_type
DIM_TYPE_CHOICES = (
    ('GENDER', 'Gender'),
    ('AGE', 'Age'),
    ('REGION', 'Region'),
)

# qna.privacy
QNA_PRIVACY_CHOICES = (
    ('PUBLIC', 'Public'),
    ('PRIVATE', 'Private'),
)
