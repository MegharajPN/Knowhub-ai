
from rest_framework import serializers
from .models import WebSource, WebPage

class WebPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebPage
        fields = [
            "id",
            "url",
            "title",
            "content",
            "created_at",
        ]


class WebSourceSerializer(serializers.ModelSerializer):
    pages = WebPageSerializer(many=True, read_only=True)

    class Meta:
        model = WebSource
        fields = [
            "id",
            "root_url",
            "title",
            "status",
            "max_pages",
            "pages_count",
            "error_message",
            "created_at",
            "updated_at",
            "last_crawled_at",
            "pages",
        ]


class WebSourceCreateSerializer(serializers.Serializer):
    url = serializers.URLField(max_length=2048)

    max_pages = serializers.IntegerField(
        required=False,
        default=5,
        min_value=1,
        max_value=20,
    )