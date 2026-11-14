
from django.utils import timezone
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import WebSource, WebPage
from .web_serializers import (
    WebSourceSerializer,
    WebSourceCreateSerializer,
)
from .services.web_crawler import crawl_website
from .services.web_embedding_service import process_web_source

class WebSourceListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sources = WebSource.objects.filter(
            user=request.user
        ).prefetch_related("pages")

        serializer = WebSourceSerializer(sources, many=True)

        return Response(serializer.data)

    def post(self, request):
        input_serializer = WebSourceCreateSerializer(
            data=request.data
        )

        input_serializer.is_valid(raise_exception=True)

        url = input_serializer.validated_data["url"]
        max_pages = input_serializer.validated_data["max_pages"]

        source = WebSource.objects.create(
            user=request.user,
            root_url=url,
            max_pages=max_pages,
            status=WebSource.Status.PROCESSING,
        )

        try:
            # Step 1: Crawl website.
            result = crawl_website(
                start_url=url,
                max_pages=max_pages,
            )

            pages = result.get("pages", [])

            # Step 2: Save crawled pages.
            for page in pages:
                WebPage.objects.update_or_create(
                    source=source,
                    url=page["url"],
                    defaults={
                        "title": page.get("title", ""),
                        "content": page.get("content", ""),
                    },
                )

            source.title = (
                pages[0].get("title", "")
                if pages else ""
            )

            source.pages_count = len(pages)
            source.save()

            # Step 3: Generate chunks and embeddings.
            embedding_result = process_web_source(source)

            # Step 4: Mark processing completed.
            source.status = WebSource.Status.COMPLETED
            source.last_crawled_at = timezone.now()
            source.error_message = ""

            source.save()

            serializer = WebSourceSerializer(source)

            response_data = serializer.data

            response_data["embedding_result"] = embedding_result

            return Response(
                response_data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as exc:
            source.status = WebSource.Status.FAILED
            source.error_message = str(exc)[:2000]

            source.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
            )

            return Response(
                {
                    "message": "Website processing failed.",
                    "error": source.error_message,
                    "source_id": source.id,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

class WebSourceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_source(self, request, pk):
        return get_object_or_404(
            WebSource,
            pk=pk,
            user=request.user,
        )

    def get(self, request, pk):
        source = self.get_source(request, pk)

        serializer = WebSourceSerializer(source)

        return Response(serializer.data)

    def delete(self, request, pk):
        source = self.get_source(request, pk)

        source.delete()

        return Response(
            {"message": "Website source deleted successfully."},
            status=status.HTTP_200_OK,
        )