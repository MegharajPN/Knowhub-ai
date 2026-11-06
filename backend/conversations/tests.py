from django.urls import path

from .views import (
    ConversationListCreateView,
    ConversationDetailView,
    ConversationAskView,
)

urlpatterns = [
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),
    path(
        "<int:pk>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "<int:pk>/ask/",
        ConversationAskView.as_view(),
        name="conversation-ask",
    ),
]