from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carebridge_db', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='medicalnewsletter',   # 클래스 이름 말고, 소문자 모델명
            name='image_url',
            field=models.URLField(
                max_length=500,
                blank=True,
                null=True,
                verbose_name='이미지 URL',
            ),
        ),
    ]
