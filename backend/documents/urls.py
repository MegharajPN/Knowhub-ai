
from django.urls import path

from .views import DocumentListCreateView, DocumentDetailView, DocumentSearchView, DocumentAskView

urlpatterns = [
    path(
        "",
        DocumentListCreateView.as_view(),
        name="document-list-create",
    ),
    path(
        "<int:pk>/",
        DocumentDetailView.as_view(),
        name="document-detail",
    ),
    path(
        "search/",
        DocumentSearchView.as_view(),
        name="document-search"
    ),
    path(
        "ask/",
        DocumentAskView.as_view(),
        name="document-ask"
    ),

]