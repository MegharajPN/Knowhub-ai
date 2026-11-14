
from django.urls import path

from .views import DocumentListCreateView, DocumentDetailView, DocumentSearchView, DocumentAskView
from .web_views import WebSourceListCreateView, WebSourceDetailView

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
    path(
        "web-sources/",
        WebSourceListCreateView.as_view(),
        name="web-source-list-create",
    ),
    path(
        "web-sources/<int:pk>/",
        WebSourceDetailView.as_view(),
        name="web-source-detail",
    ),

]