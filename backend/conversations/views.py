from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
)
from documents.services.rag_service import ask_documents


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            user=request.user
        )

        serializer = ConversationSerializer(
            conversations,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request):
        title = request.data.get("title", "New Chat")

        if not isinstance(title, str):
            raise ValidationError({"title": "Title must be text."})

        title = title.strip() or "New Chat"

        conversation = Conversation.objects.create(
            user=request.user,
            title=title[:255],
        )

        serializer = ConversationSerializer(conversation)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, pk):
        return get_object_or_404(
            Conversation,
            pk=pk,
            user=request.user,
        )

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)

        serializer = ConversationDetailSerializer(conversation)

        return Response(serializer.data)

    def delete(self, request, pk):
        conversation = self.get_conversation(request, pk)
        conversation.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationAskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = get_object_or_404(
            Conversation,
            pk=pk,
            user=request.user,
        )

        question = request.data.get("question", "")

        if not isinstance(question, str) or not question.strip():
            raise ValidationError({
                "question": "Please enter a question."
            })

        question = question.strip()

        if len(question) > 1000:
            raise ValidationError({
                "question": "Question cannot exceed 1000 characters."
            })

        top_k = request.data.get("top_k", 5)

        if isinstance(top_k, bool):
            raise ValidationError({"top_k": "Must be an integer."})

        try:
            top_k = int(top_k)
        except (TypeError, ValueError):
            raise ValidationError({"top_k": "Must be an integer."})

        if not 1 <= top_k <= 10:
            raise ValidationError({
                "top_k": "Must be between 1 and 10."
            })

        # Generate the answer before saving, so failed generation
        # does not leave an unanswered user message in the database.
        try:
            result = ask_documents(
                user=request.user,
                question=question,
                top_k=top_k,
            )
        except Exception:
            return Response(
                {
                    "success": False,
                    "message": "Unable to generate an answer. Please try again.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        sources = result.get("sources", [])
        answer = result.get("answer", "")

        with transaction.atomic():
            Message.objects.create(
                conversation=conversation,
                role="user",
                content=question,
            )

            assistant_message = Message.objects.create(
                conversation=conversation,
                role="assistant",
                content=answer,
                sources=sources,
            )

            # Use the first question as the conversation title.
            if conversation.messages.count() == 2 and conversation.title == "New Chat":
                conversation.title = question[:60]

            conversation.save()

        return Response(
            {
                "success": True,
                "conversation_id": conversation.id,
                "answer": answer,
                "sources": sources,
                "message": MessageSerializer(assistant_message).data,
            },
            status=status.HTTP_200_OK,
        )