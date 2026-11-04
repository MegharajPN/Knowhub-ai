
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Document
from .serializers import DocumentSerializer, DocumentSearchSerializer, DocumentAskSerializer
from .services.document_processor import process_document
from .services.vector_search import search_documents
from documents.services.rag_service import ask_documents

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

class DocumentAskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data["question"]
        top_k = serializer.validated_data["top_k"]

        try:
            result = ask_documents(
                user=request.user,
                question=question,
                top_k=top_k,
            )

            return Response({
                "success": True,
                "question": question,
                "answer": result["answer"],
                "sources": result["sources"],
            }, status=status.HTTP_200_OK)

        except Exception:
            return Response({
                "success": False,
                "message": "Unable to generate an answer. Please try again.",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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

class DocumentSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        query = serializer.validated_data["query"]
        top_k = serializer.validated_data["top_k"]

        try:
            results = search_documents(
                user=request.user,
                query=query,
                top_k=top_k,
            )

            return Response({
                "success": True,
                "query": query,
                "count": len(results),
                "results": results,
            }, status=status.HTTP_200_OK)

        except Exception:
            return Response({
                "success": False,
                "message": "Document search failed. Please try again.",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)