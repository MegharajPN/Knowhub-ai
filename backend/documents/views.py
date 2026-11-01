
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document
from .serializers import DocumentSerializer
from .services.document_processor import process_document


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(
            uploaded_by=self.request.user
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = serializer.save(
            uploaded_by=request.user
        )

        try:
            result = process_document(document)

            return Response(
                {
                    "message": "Document uploaded and processed successfully.",
                    "document": DocumentSerializer(document).data,
                    "processing": result,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception:
            return Response(
                {
                    "message": "Document uploaded, but processing failed.",
                    "document": DocumentSerializer(document).data,
                    "error": "PDF processing failed. Check the backend logs.",
                },
                status=status.HTTP_201_CREATED,
            )


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            uploaded_by=self.request.user
        )

    def perform_destroy(self, instance):
        if instance.file:
            instance.file.delete(save=False)

        instance.delete()